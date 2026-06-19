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
// Reading-gaze (corroborating, anti-overlay): when the head is facing forward but the
// EYES sweep horizontally back and forth repeatedly, that resembles reading lines of
// on-screen text. Conservative: needs many direction reversals across a sustained
// window. Experimental — weight-light, escalates only via co-occurrence.
const GAZE_HISTORY = 14            // ~5.6s of samples at 400ms
const READING_MIN_REVERSALS = 5   // L↔R direction changes within the window
const READING_DEV = 0.06          // min horizontal eye deviation to count as a sweep
const READING_THROTTLE = 20000
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
  private gazeHist: number[] = []  // recent horizontal eye-gaze ratios (reading detector)

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
      // Finer cadence when MediaPipe is active (needed for the reading-gaze sweep
      // detector); the native fallback can't do gaze so it stays coarse.
      const interval = this.opts.faceIntervalMs ?? (this.mp ? 400 : 700)
      this.timers.push(setInterval(() => { void this.checkFace() }, interval))
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
    let eyeGaze: number | null = null   // horizontal iris position within the eye (0..1)
    try {
      if (this.mp) {
        const res = this.mp.detectForVideo(v, performance.now())
        const faces = res.faceLandmarks ?? []
        faceCount = faces.length
        if (faceCount === 1) { yawRatio = noseYawRatio(faces[0]); eyeGaze = eyeGazeRatio(faces[0]) }
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
      this.gazeHist = []  // head turned → not reading the screen; reset the sweep history
    } else {
      this.gazeAwaySince = null  // recovered / brief glance → reset, never flagged
      // Reading-gaze: head forward but eyes sweeping horizontally (reading lines).
      if (eyeGaze !== null) this.detectReadingGaze(eyeGaze)
    }
  }

  // Corroborating, conservative: a sustained horizontal eye-sweep pattern (many
  // L↔R direction reversals while the head faces forward) resembles reading text.
  private detectReadingGaze(gaze: number) {
    this.gazeHist.push(gaze)
    if (this.gazeHist.length > GAZE_HISTORY) this.gazeHist.shift()
    if (this.gazeHist.length < GAZE_HISTORY) return

    // Count significant direction reversals across the window.
    let reversals = 0
    let prevDir = 0
    for (let i = 1; i < this.gazeHist.length; i++) {
      const d = this.gazeHist[i] - this.gazeHist[i - 1]
      if (Math.abs(d) < READING_DEV) continue
      const dir = d > 0 ? 1 : -1
      if (prevDir !== 0 && dir !== prevDir) reversals++
      prevDir = dir
    }
    if (reversals >= READING_MIN_REVERSALS) {
      this.emit('reading_gaze', { confidence: 0.6, detail: `Eyes swept side-to-side ${reversals} times while facing forward — consistent with reading on-screen text.`, throttleMs: READING_THROTTLE })
      this.gazeHist = []  // avoid immediate re-fire
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

// Horizontal iris position within each eye (0 = looking to one side, 1 = the
// other; ~0.5 centred), averaged across both eyes. Needs the 478-point mesh
// (468-477 are iris points); returns null on the 468-point model. Used only to
// track eye SWEEPS over time, not a single-frame verdict.
function eyeGazeRatio(lm: MpLandmark[]): number | null {
  if (lm.length < 478) return null
  const lIris = lm[468], lOut = lm[33], lIn = lm[133]    // left eye: outer, inner corners
  const rIris = lm[473], rIn = lm[362], rOut = lm[263]   // right eye: inner, outer corners
  if (!lIris || !lOut || !lIn || !rIris || !rIn || !rOut) return null
  const lw = lIn.x - lOut.x, rw = rOut.x - rIn.x
  if (Math.abs(lw) < 1e-3 || Math.abs(rw) < 1e-3) return null
  const lr = (lIris.x - lOut.x) / lw
  const rr = (rIris.x - rIn.x) / rw
  return (lr + rr) / 2
}
