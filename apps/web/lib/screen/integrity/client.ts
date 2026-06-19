import { IntegrityEventInput, IntegrityEventType, HIGH_CONFIDENCE_TYPES } from './events'

// ── Browser integrity capture (Build 01-A1 + CV upgrade, Screen-scoped) ─────
// Captures structured proctoring metadata during the voice interview and POSTs
// it as JSON (never URL params). NO raw frames/images ever leave the browser —
// only structured event metadata (type, timestamp, confidence, detail).
//
// CV: MediaPipe Tasks-Vision FaceLandmarker, loaded LAZILY from the jsDelivr CDN
// (webpackIgnore → not bundled, zero build-size impact). Gives face COUNT
// (second-person) + landmark geometry → head YAW (sustained gaze-away). Falls
// back to the browser-native FaceDetector, then to a no-op, so it never blocks
// the interview. Tab/window/fullscreen signals run regardless.

interface NativeFaceDetector { detect(src: CanvasImageSource): Promise<{ boundingBox: DOMRectReadOnly }[]> }
interface FaceDetectorCtor { new (opts?: { fastMode?: boolean; maxDetectedFaces?: number }): NativeFaceDetector }

// Minimal shape of the MediaPipe FaceLandmarker result we consume.
interface MpLandmark { x: number; y: number; z: number }
interface MpResult { faceLandmarks?: MpLandmark[][] }
interface MpFaceLandmarker { detectForVideo(video: HTMLVideoElement, ts: number): MpResult; close?(): void }

export interface IntegrityClientOptions {
  interviewId: string
  video: HTMLVideoElement
  screenStream?: MediaStream | null
  onFlag?: (e: IntegrityEventInput) => void   // high-confidence → live notice
  faceIntervalMs?: number
}

const NO_FACE_MS = 4000        // sustained absence before flagging
const GAZE_AWAY_MS = 3500      // sustained look-away before flagging (conservative)
const MULTI_FACE_THROTTLE = 12000
const FLUSH_MS = 5000
const FOCUS_LOSS_DEDUP_MS = 350 // collapse the blur+visibility double-fire of ONE switch only
// Head-yaw proxy: nose horizontal position within the face. |ratio-0.5| beyond
// this = head clearly turned off-axis. 0.5 is centred; ~0.20 ≈ a real turn, not a glance.
const YAW_OFF_RATIO = 0.20
// CDN-pinned MediaPipe (overridable so it can be self-hosted / version-bumped via env).
const MP_VERSION = process.env.NEXT_PUBLIC_MEDIAPIPE_VERSION ?? '0.10.18'
const MP_BUNDLE = process.env.NEXT_PUBLIC_MEDIAPIPE_BUNDLE ?? `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/vision_bundle.mjs`
const MP_WASM = process.env.NEXT_PUBLIC_MEDIAPIPE_WASM ?? `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`
const MP_MODEL = process.env.NEXT_PUBLIC_MEDIAPIPE_MODEL ?? 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

export class IntegrityMonitorClient {
  private opts: IntegrityClientOptions
  private queue: IntegrityEventInput[] = []
  private timers: ReturnType<typeof setInterval>[] = []
  private nativeDetector: NativeFaceDetector | null = null
  private mp: MpFaceLandmarker | null = null
  private running = false
  private lastEmit: Partial<Record<IntegrityEventType, number>> = {}
  private noFaceSince: number | null = null
  private gazeAwaySince: number | null = null
  private lastFocusLossAt = 0

  constructor(opts: IntegrityClientOptions) { this.opts = opts }

  get faceDetectionAvailable() { return this.mp !== null || this.nativeDetector !== null }

  async start() {
    if (this.running) return
    this.running = true

    // Browser-event signals (always available, no dependency).
    document.addEventListener('visibilitychange', this.onVisibility)
    window.addEventListener('blur', this.onBlur)
    document.addEventListener('fullscreenchange', this.onFullscreen)
    if (this.opts.screenStream) {
      for (const t of this.opts.screenStream.getTracks()) t.addEventListener('ended', this.onScreenShareEnd)
    }

    void this.initVision()  // async, non-blocking — CV comes online when ready
    this.timers.push(setInterval(() => this.flush(), FLUSH_MS))
  }

  // Bring CV online: MediaPipe (preferred) → native FaceDetector → no-op.
  private async initVision() {
    try {
      // webpackIgnore keeps this a runtime CDN import — the package is NOT bundled.
      const vision = await import(/* webpackIgnore: true */ MP_BUNDLE) as {
        FilesetResolver: { forVisionTasks(p: string): Promise<unknown> }
        FaceLandmarker: { createFromOptions(fs: unknown, o: unknown): Promise<MpFaceLandmarker> }
      }
      const fileset = await vision.FilesetResolver.forVisionTasks(MP_WASM)
      this.mp = await vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MP_MODEL, delegate: 'GPU' },
        numFaces: 3, runningMode: 'VIDEO',
      })
    } catch {
      this.mp = null
      const Ctor = (window as unknown as { FaceDetector?: FaceDetectorCtor }).FaceDetector
      if (Ctor) { try { this.nativeDetector = new Ctor({ fastMode: true, maxDetectedFaces: 3 }) } catch { this.nativeDetector = null } }
    }
    if (this.running && this.faceDetectionAvailable) {
      this.timers.push(setInterval(() => { void this.checkFace() }, this.opts.faceIntervalMs ?? 700))
    }
  }

  stop() {
    if (!this.running) return
    this.running = false
    document.removeEventListener('visibilitychange', this.onVisibility)
    window.removeEventListener('blur', this.onBlur)
    document.removeEventListener('fullscreenchange', this.onFullscreen)
    if (this.opts.screenStream) {
      for (const t of this.opts.screenStream.getTracks()) t.removeEventListener('ended', this.onScreenShareEnd)
    }
    this.timers.forEach(clearInterval); this.timers = []
    try { this.mp?.close?.() } catch {}
    this.mp = null
    this.flush(true)
  }

  // ── emit + throttle ──────────────────────────────────────────────────────
  private emit(type: IntegrityEventType, opts: { durationMs?: number; confidence?: number; detail?: string; throttleMs?: number } = {}) {
    const now = Date.now()
    if (opts.throttleMs && this.lastEmit[type] && now - this.lastEmit[type]! < opts.throttleMs) return
    this.lastEmit[type] = now
    const ev: IntegrityEventInput = {
      type, occurredAt: new Date().toISOString(),
      durationMs: opts.durationMs, confidence: opts.confidence ?? 1, detail: opts.detail,
    }
    this.queue.push(ev)
    if (HIGH_CONFIDENCE_TYPES.has(type) && (ev.confidence ?? 1) >= 0.7) this.opts.onFlag?.(ev)
  }

  // ── Part 1 fix: count EVERY focus loss; dedup only the blur+visibility pair
  // from a single physical switch (≤350ms apart). No long throttle → 5/5. ──
  private recordFocusLoss(type: 'tab_switch' | 'window_blur', detail: string, confidence: number) {
    const now = Date.now()
    if (now - this.lastFocusLossAt < FOCUS_LOSS_DEDUP_MS) return  // same switch, two events
    this.lastFocusLossAt = now
    this.emit(type, { detail, confidence })  // no throttleMs — every distinct switch counts
  }

  private onVisibility = () => { if (document.hidden) this.recordFocusLoss('tab_switch', 'Tab hidden / switched away', 0.9) }
  private onBlur = () => { if (!document.hidden) this.recordFocusLoss('window_blur', 'Interview window lost focus (switched app/window)', 0.8) }
  private onFullscreen = () => { if (!document.fullscreenElement) this.emit('fullscreen_exit', { detail: 'Left fullscreen', confidence: 0.9, throttleMs: 1000 }) }
  private onScreenShareEnd = () => this.emit('screen_share_drop', { detail: 'Screen share ended', throttleMs: 3000 })

  // ── CV: face count + head-yaw gaze ───────────────────────────────────────
  private async checkFace() {
    const v = this.opts.video
    if (!v || v.readyState < 2 || v.videoWidth === 0) return

    let faceCount: number
    let yawRatio: number | null = null  // nose position within face width (0..1), null if N/A
    try {
      if (this.mp) {
        const res = this.mp.detectForVideo(v, performance.now())
        const faces = res.faceLandmarks ?? []
        faceCount = faces.length
        if (faceCount === 1) yawRatio = noseYawRatio(faces[0])
      } else if (this.nativeDetector) {
        const faces = await this.nativeDetector.detect(v)
        faceCount = faces.length
        if (faceCount === 1) {
          const b = faces[0].boundingBox
          yawRatio = (b.x + b.width / 2) / v.videoWidth  // coarse box-centre proxy
        }
      } else return
    } catch { return }

    const now = Date.now()

    if (faceCount === 0) {
      this.gazeAwaySince = null
      this.noFaceSince ??= now
      if (now - this.noFaceSince >= NO_FACE_MS) {
        this.emit('no_face', { durationMs: now - this.noFaceSince, confidence: 0.85, detail: 'No face visible in frame', throttleMs: NO_FACE_MS })
      }
      return
    }
    this.noFaceSince = null

    if (faceCount > 1) {
      this.gazeAwaySince = null
      this.emit('multiple_faces', { confidence: 0.92, detail: `${faceCount} people detected in frame`, throttleMs: MULTI_FACE_THROTTLE })
      return
    }

    // Single face → sustained head-turn (yaw) = looking at another device/off-screen.
    const off = yawRatio !== null && Math.abs(yawRatio - 0.5) > YAW_OFF_RATIO
    if (off) {
      this.gazeAwaySince ??= now
      if (now - this.gazeAwaySince >= GAZE_AWAY_MS) {
        this.emit('gaze_away', { durationMs: now - this.gazeAwaySince, confidence: 0.7, detail: 'Sustained head turn away from screen', throttleMs: GAZE_AWAY_MS })
      }
    } else {
      this.gazeAwaySince = null  // recovered / brief glance → reset, never flagged
    }
  }

  // ── flush queued events as JSON ──────────────────────────────────────────
  private flush(final = false) {
    if (this.queue.length === 0) return
    const events = this.queue.splice(0, this.queue.length)
    const payload = JSON.stringify({ interviewId: this.opts.interviewId, events })
    try {
      if (final && navigator.sendBeacon) {
        navigator.sendBeacon('/api/interview/integrity', new Blob([payload], { type: 'application/json' }))
      } else {
        fetch('/api/interview/integrity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: final }).catch(() => {})
      }
    } catch { /* never block the interview on telemetry */ }
  }
}

// Head-yaw proxy from MediaPipe face mesh: nose-tip x position within the face
// width (left cheek → right cheek). 0.5 = facing camera; deviation = head turned.
// Symmetric in |ratio-0.5|, so it's robust to mirrored self-view.
function noseYawRatio(lm: MpLandmark[]): number | null {
  const nose = lm[1], left = lm[234], right = lm[454]  // canonical 468-pt mesh indices
  if (!nose || !left || !right) return null
  const width = right.x - left.x
  if (Math.abs(width) < 1e-3) return null
  return (nose.x - left.x) / width
}
