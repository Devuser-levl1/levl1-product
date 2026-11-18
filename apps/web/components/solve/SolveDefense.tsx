'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, Keyboard, Send, CheckCircle2 } from 'lucide-react'
import { Button, Alert, Textarea } from '@/components/screen/ui'
import { ScribeStt, DEFAULT_KEYTERMS, prefetchScribeToken } from '@/lib/screen/interview/scribe-stt'
import { playStreamedSpeech, unlockTtsAudio, type StreamHandle } from '@/lib/screen/interview/tts-stream'
import { normalizeSpokenTech } from '@/lib/screen/tech-terms'
import { INTERVIEWER_NAME } from '@/lib/screen/interviewer'

// ── Defend-your-submission (candidate) ─────────────────────────────────────
// A short spoken conversation about the code they just submitted. Same voice
// stack as the Screen room: ElevenLabs streamed TTS (interviewer voice, via a
// short-lived voice token scoped to THIS submission) and Scribe live STT.
// Voice failure policy (as in the room): NO browser speechSynthesis — retry
// once, then the line simply stays on screen. If the mic or STT fails the
// candidate can type; typed answers are marked in the report.

type Turn = { speaker: 'ai' | 'candidate'; text: string }

export function SolveDefense({ token, firstName, voiceAccent, initialTurns, inProgress, onDone }: {
  token: string; firstName: string; voiceAccent: string | null
  initialTurns: Turn[]; inProgress: boolean; onDone: () => void
}) {
  const [phase, setPhase] = useState<'intro' | 'speaking' | 'listening' | 'thinking' | 'done'>('intro')
  const [turns, setTurns] = useState<Turn[]>(initialTurns)
  const [interim, setInterim] = useState('')
  const [typed, setTyped] = useState('')
  const [typing, setTypingState] = useState(false)
  const typingRef = useRef(false)
  const setTyping = (v: boolean) => { typingRef.current = v; setTypingState(v) }
  const [voiceNote, setVoiceNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const voiceTokenRef = useRef<string>('')
  const sttRef = useRef<ScribeStt | null>(null)
  const ttsRef = useRef<StreamHandle | null>(null)
  const answerRef = useRef<string>('')
  const sendingRef = useRef(false)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => { prefetchScribeToken() }, [])
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }) }, [turns, interim])
  useEffect(() => () => { sttRef.current?.stop(); ttsRef.current?.stop() }, [])

  const post = async (body: Record<string, unknown>) => {
    const r = await fetch(`/api/solve/t/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d.error ?? 'Something went wrong. Please try again.')
    return d
  }

  const speak = async (text: string) => {
    setPhase('speaking')
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await playStreamedSpeech({
          url: '/api/interview/generate-speech',
          headers: { 'x-voice-token': voiceTokenRef.current },
          body: { text, voiceAccent: voiceAccent ?? undefined, stream: true },
          register: (h) => { ttsRef.current = h },
        })
        setVoiceNote(null)
        return
      } catch (e) {
        if (attempt === 0) { setVoiceNote('Voice reconnecting…'); continue }
        // The line stays on screen; the conversation continues.
        setVoiceNote('The interviewer\'s voice isn\'t available right now. Read the question above and answer when ready.')
        void post({ action: 'voice_event', kind: 'tts_failed', detail: e instanceof Error ? e.message.slice(0, 120) : 'unknown' }).catch(() => {})
      }
    }
  }

  const listen = async () => {
    if (typingRef.current) { setPhase('listening'); return }
    answerRef.current = ''; setInterim(''); setPhase('listening')
    const stt = new ScribeStt({
      onInterim: (t) => setInterim([answerRef.current, t].filter(Boolean).join(' ')),
      onUtteranceEnd: (t) => {
        answerRef.current = [answerRef.current, t].filter(Boolean).join(' ').trim()
        setInterim(answerRef.current)
        // A committed turn ends the answer (Scribe's turn prediction + grace already tolerate pauses).
        if (answerRef.current) void send(answerRef.current, 'voice')
      },
      onError: () => { setTyping(true); setVoiceNote('Speech recognition stopped working. Please type your answer instead.') },
    }, { keyterms: DEFAULT_KEYTERMS, normalize: normalizeSpokenTech, previousText: [...turns].reverse().find((x) => x.speaker === 'ai')?.text.slice(-300) })
    sttRef.current = stt
    const ok = await stt.start()
    if (!ok) { setTyping(true); setVoiceNote('We couldn\'t use your microphone. You can type your answers instead.'); void post({ action: 'voice_event', kind: 'stt_failed' }).catch(() => {}) }
  }

  const advance = async (d: { say: string; done: boolean; turns: Turn[] }) => {
    setTurns(d.turns)
    await speak(d.say)
    if (d.done) { setPhase('done'); onDone(); return }
    await listen()
  }

  const send = async (text: string, mode: 'voice' | 'typed') => {
    if (sendingRef.current) return
    sendingRef.current = true
    sttRef.current?.stop(); sttRef.current = null
    setPhase('thinking'); setInterim(''); setTyped(''); setError(null)
    setTurns((t) => [...t, { speaker: 'candidate', text }])
    try {
      const d = await post({ action: 'defense_answer', text, mode })
      sendingRef.current = false
      await advance(d)
    } catch (e) {
      sendingRef.current = false
      setError(e instanceof Error ? e.message : 'Something went wrong.'); setPhase('listening')
    }
  }

  const begin = async () => {
    setError(null)
    await unlockTtsAudio()
    try {
      const d = await post({ action: 'defense_start' })
      voiceTokenRef.current = d.voiceToken
      setTurns(d.turns)
      if (d.say) { await speak(d.say); await listen() }
    } catch (e) { setError(e instanceof Error ? e.message : 'Couldn\'t start. Please try again.') }
  }

  const doneAnswering = () => {
    const text = typingRef.current ? typed.trim() : (answerRef.current || interim).trim()
    if (!text) return
    void send(text, typingRef.current ? 'typed' : 'voice')
  }

  if (phase === 'intro') {
    return (
      <div style={{ display: 'grid', gap: 14 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--lv-text)', margin: 0 }}>{inProgress ? 'Pick up where you left off' : `Walk ${INTERVIEWER_NAME} through your solution`}</h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--lv-text-body)', margin: 0 }}>
          {INTERVIEWER_NAME} has read your code and will ask a few questions about it: why you chose your approach, how a specific part works, what would break at scale. It takes about ten minutes. Answer out loud, in your own words. There are no trick questions; the point is to hear your reasoning.
        </p>
        <ul style={{ listStyle: 'disc', fontSize: 13, color: 'var(--lv-text-body)', lineHeight: 1.7, margin: 0, paddingLeft: 18 }}>
          <li>Use headphones if you can, in a quiet place.</li>
          <li>Your browser will ask for microphone access. If the microphone doesn&apos;t work, you can type.</li>
          <li>Pause as long as you need while thinking. When you finish an answer, the next question follows.</li>
        </ul>
        {error && <Alert tone="danger">{error}</Alert>}
        <div><Button leftIcon={<Mic size={16} />} onClick={begin}>{inProgress ? 'Resume the conversation' : 'Start the conversation'}</Button></div>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div role="log" aria-live="polite" aria-label="Conversation" style={{ display: 'grid', gap: 10, maxHeight: '55vh', overflowY: 'auto', padding: 2 }}>
        {turns.map((t, i) => (
          <div key={i} style={{ justifySelf: t.speaker === 'ai' ? 'start' : 'end', maxWidth: '88%', padding: '10px 12px', borderRadius: 8, fontSize: 14, lineHeight: 1.55,
            background: t.speaker === 'ai' ? 'var(--lv-surface-muted)' : 'var(--lv-brand-tint, #EEF2FF)', color: 'var(--lv-text-body)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--lv-text-muted)', marginBottom: 2 }}>{t.speaker === 'ai' ? INTERVIEWER_NAME : firstName}</div>
            {t.text}
          </div>
        ))}
        {phase === 'listening' && !typing && interim && (
          <div style={{ justifySelf: 'end', maxWidth: '88%', padding: '10px 12px', borderRadius: 8, fontSize: 14, color: 'var(--lv-text-muted)', border: '1px dashed var(--lv-border)' }}>{interim}</div>
        )}
        <div ref={endRef} />
      </div>
      {voiceNote && <Alert tone="warning">{voiceNote}</Alert>}
      {error && <Alert tone="danger">{error}</Alert>}
      {phase === 'done' ? (
        <Alert tone="success" title="All done"><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={14} aria-hidden="true" />Thank you. Your submission and this conversation have gone to the hiring team. You can close this page.</span></Alert>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          <div role="status" style={{ fontSize: 13, color: 'var(--lv-text-muted)' }}>
            {phase === 'speaking' ? `${INTERVIEWER_NAME} is speaking…` : phase === 'thinking' ? 'One moment…' : typing ? 'Type your answer below.' : 'Listening — answer out loud.'}
          </div>
          {phase === 'listening' && typing && (
            <Textarea aria-label="Your answer" rows={4} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type your answer" />
          )}
          {phase === 'listening' && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button size="sm" leftIcon={<Send size={14} />} disabled={typing ? !typed.trim() : !(answerRef.current || interim).trim()} onClick={doneAnswering}>I&apos;m done answering</Button>
              {!typing && <Button size="sm" variant="tertiary" leftIcon={<Keyboard size={14} />} onClick={() => { sttRef.current?.stop(); sttRef.current = null; setTyping(true) }}>Type instead</Button>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
