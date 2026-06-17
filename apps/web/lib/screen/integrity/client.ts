import { IntegrityEventInput, IntegrityEventType, HIGH_CONFIDENCE_TYPES } from './events'

// ── Browser integrity capture (Build 01-A1, Screen-scoped) ─────────────────
// Captures structured proctoring metadata during the voice interview and POSTs
// it as JSON (never URL params). NO raw frames/images leave the browser.
//
// Face/gaze uses the browser-native FaceDetector API where available (Chromium)
// and degrades to a no-op elsewhere — so we add NO heavy dependency. To raise
// recall later, swap detectFaces() for MediaPipe/face-api (flagged, not added).

interface NativeFaceDetector { detect(src: CanvasImageSource): Promise<{ boundingBox: DOMRectReadOnly }[]> }
interface FaceDetectorCtor { new (opts?: { fastMode?: boolean; maxDetectedFaces?: number }): NativeFaceDetector }

export interface IntegrityClientOptions {
  interviewId: string
  video: HTMLVideoElement
  screenStream?: MediaStream | null
  onFlag?: (e: IntegrityEventInput) => void   // high-confidence → live notice
  faceIntervalMs?: number
}

const NO_FACE_MS = 4000     // sustained absence before flagging
const GAZE_AWAY_MS = 3000   // sustained look-away before flagging
const MULTI_FACE_THROTTLE = 15000
const FLUSH_MS = 5000

export class IntegrityMonitorClient {
  private opts: IntegrityClientOptions
  private queue: IntegrityEventInput[] = []
  private timers: ReturnType<typeof setInterval>[] = []
  private detector: NativeFaceDetector | null = null
  private running = false
  private lastEmit: Partial<Record<IntegrityEventType, number>> = {}
  private noFaceSince: number | null = null
  private gazeAwaySince: number | null = null

  constructor(opts: IntegrityClientOptions) { this.opts = opts }

  get faceDetectionAvailable() { return this.detector !== null }

  async start() {
    if (this.running) return
    this.running = true

    // Browser-event signals (always available).
    document.addEventListener('visibilitychange', this.onVisibility)
    window.addEventListener('blur', this.onBlur)
    document.addEventListener('fullscreenchange', this.onFullscreen)
    if (this.opts.screenStream) {
      for (const t of this.opts.screenStream.getTracks()) t.addEventListener('ended', this.onScreenShareEnd)
    }

    // Face/gaze via native FaceDetector if the engine exposes it.
    const Ctor = (window as unknown as { FaceDetector?: FaceDetectorCtor }).FaceDetector
    if (Ctor) {
      try {
        this.detector = new Ctor({ fastMode: true, maxDetectedFaces: 3 })
        this.timers.push(setInterval(() => { void this.checkFace() }, this.opts.faceIntervalMs ?? 1500))
      } catch { this.detector = null }
    }

    this.timers.push(setInterval(() => this.flush(), FLUSH_MS))
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

  private onVisibility = () => { if (document.hidden) this.emit('tab_switch', { detail: 'Tab hidden / switched', throttleMs: 1500 }) }
  private onBlur = () => { if (!document.hidden) this.emit('window_blur', { detail: 'Interview window lost focus', confidence: 0.8, throttleMs: 3000 }) }
  private onFullscreen = () => { if (!document.fullscreenElement) this.emit('fullscreen_exit', { detail: 'Left fullscreen', confidence: 0.9, throttleMs: 3000 }) }
  private onScreenShareEnd = () => this.emit('screen_share_drop', { detail: 'Screen share ended', throttleMs: 3000 })

  private async checkFace() {
    const v = this.opts.video
    if (!this.detector || !v || v.readyState < 2 || v.videoWidth === 0) return
    let faces: { boundingBox: DOMRectReadOnly }[]
    try { faces = await this.detector.detect(v) } catch { return }
    const now = Date.now()

    if (faces.length === 0) {
      this.gazeAwaySince = null
      this.noFaceSince ??= now
      if (now - this.noFaceSince >= NO_FACE_MS) {
        this.emit('no_face', { durationMs: now - this.noFaceSince, confidence: 0.85, detail: 'No face visible in frame', throttleMs: NO_FACE_MS })
      }
      return
    }
    this.noFaceSince = null

    if (faces.length > 1) {
      this.gazeAwaySince = null
      this.emit('multiple_faces', { confidence: 0.9, detail: `${faces.length} faces detected in frame`, throttleMs: MULTI_FACE_THROTTLE })
      return
    }

    // Single face → coarse gaze proxy from horizontal box centre.
    const box = faces[0].boundingBox
    const cx = (box.x + box.width / 2) / v.videoWidth
    const off = cx < 0.3 || cx > 0.7
    if (off) {
      this.gazeAwaySince ??= now
      if (now - this.gazeAwaySince >= GAZE_AWAY_MS) {
        this.emit('gaze_away', { durationMs: now - this.gazeAwaySince, confidence: 0.65, detail: 'Face turned away from screen', throttleMs: GAZE_AWAY_MS })
      }
    } else {
      this.gazeAwaySince = null
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
