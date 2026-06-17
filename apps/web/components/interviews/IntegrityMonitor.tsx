'use client'
import { useEffect, useRef, useState } from 'react'
import { IntegrityMonitorClient } from '@/lib/screen/integrity/client'
import { IntegrityEventInput, INTEGRITY_LABELS, IntegrityEventType } from '@/lib/screen/integrity/events'

// ── Live proctoring monitor (Build 01-A2/A4, Screen-scoped) ────────────────
// Self-contained: establishes the camera baseline + self-view, runs the
// integrity capture client, and shows an honest "Live Monitoring" indicator.
// Camera-based signals activate when the camera is granted; tab/window/
// fullscreen signals run regardless. No raw frames leave the browser.
// Brand: Levl1 indigo. Tone: professional, never punitive, never "disqualified".

const INDIGO = '#4F46E5'

export function IntegrityMonitor({ interviewId, active }: { interviewId: string; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const clientRef = useRef<IntegrityMonitorClient | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [camState, setCamState] = useState<'starting' | 'on' | 'denied'>('starting')
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(null)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!active || !interviewId) return
    let cancelled = false

    function onFlag(e: IntegrityEventInput) {
      // Honest, non-punitive notice — "noted for human review", never disqualification.
      const label = INTEGRITY_LABELS[e.type as IntegrityEventType] ?? 'Activity'
      setNotice({ id: Date.now(), text: `${label} — noted for human review.` })
      if (noticeTimer.current) clearTimeout(noticeTimer.current)
      noticeTimer.current = setTimeout(() => setNotice(null), 5000)
    }

    async function begin() {
      let stream: MediaStream | null = null
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}) }
        setCamState('on')
      } catch {
        setCamState('denied') // tab/window/fullscreen signals still run
      }
      if (cancelled) return
      const client = new IntegrityMonitorClient({ interviewId, video: videoRef.current as HTMLVideoElement, onFlag })
      clientRef.current = client
      await client.start()
    }
    void begin()

    return () => {
      cancelled = true
      clientRef.current?.stop(); clientRef.current = null
      streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null
      if (noticeTimer.current) clearTimeout(noticeTimer.current)
    }
  }, [active, interviewId])

  if (!active) return null

  return (
    <>
      {/* Live monitoring indicator + self-view */}
      <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        <div style={{ position: 'relative', width: 132, height: 99, borderRadius: 12, overflow: 'hidden', background: '#0F172A', boxShadow: '0 6px 20px rgba(15,23,42,0.25)', border: `1.5px solid ${INDIGO}` }}>
          <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: camState === 'on' ? 'block' : 'none' }} />
          {camState !== 'on' && <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 11, textAlign: 'center', padding: 8 }}>Camera off — activity still monitored</div>}
          <div style={{ position: 'absolute', top: 6, left: 6, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(15,23,42,0.6)', borderRadius: 100, padding: '2px 8px' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 0 0 rgba(34,197,94,0.7)', animation: 'lv-pulse 2s infinite' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>Live monitoring</span>
          </div>
        </div>
      </div>

      {/* Transient, professional "noted for review" notice */}
      {notice && (
        <div key={notice.id} style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 60, background: '#fff', border: `1px solid ${INDIGO}33`, borderLeft: `3px solid ${INDIGO}`, borderRadius: 10, padding: '10px 16px', boxShadow: '0 8px 24px rgba(79,70,229,0.16)', fontSize: 13, color: '#334155', maxWidth: 420 }}>
          <span style={{ fontWeight: 700, color: INDIGO }}>Integrity:</span> {notice.text}
        </div>
      )}

      <style>{`@keyframes lv-pulse { 0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.6); } 70% { box-shadow: 0 0 0 6px rgba(34,197,94,0); } 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); } }`}</style>
    </>
  )
}
