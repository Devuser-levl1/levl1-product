'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAppStore, InterviewPhase, TranscriptEntry, QuestionResponse } from '@/store/appStore'
import { Position } from '@/store/appStore'
import Whiteboard from '@/components/interview/Whiteboard'
import { AIVisualizer } from '@/components/interview/AIVisualizer'
import { Mic, MicOff, Code2, PenLine, Clock, AlertTriangle, X } from 'lucide-react'

/* ── Utility helpers ─────────────────────────────────────────────── */
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}
function playChime(): void {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 440
    gain.gain.setValueAtTime(0.1, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
  } catch {}
}

/* ── Silence thresholds (seconds) ───────────────────────────────── */
const SILENCE_THRESHOLDS = {
  STILL_LISTENING: 5,   // text indicator only
  GENTLE_PROMPT:   12,  // Alex speaks softly
  OFFER_CHOICE:    20,  // Alex offers to move on or wait
  AUTO_ADVANCE:    30,  // Alex auto-advances to next question
} as const

/* ── Keyword trigger lists (checked before calling Claude) ───────── */
// Candidate asking about fit/suitability → redirect and continue
const REDIRECT_TRIGGERS = [
  'am i right for', 'am i a good fit', 'do i qualify',
  'what do you think of me', 'how am i doing', 'am i doing well',
  'am i the right', 'would i be a good', 'am i suitable',
] as const

// Candidate asking to repeat/clarify the question
const REPEAT_TRIGGERS = [
  'can you repeat', 'say that again', 'what was the question',
  'could you repeat', 'pardon', 'sorry what', 'come again',
  'what do you mean', "i don't understand", "i dont understand",
] as const

// Candidate doesn't know → rephrase once, then move on
const DONT_KNOW_TRIGGERS = [
  "i don't know", "i dont know", "no idea", "not sure about this",
  "i have no idea", "i'm not sure", "im not sure",
] as const

// Candidate explicitly wants to skip
const SKIP_TRIGGERS = [
  'skip', 'pass', 'move on', 'next question', 'next please', 'skip this',
] as const

// Candidate asking about the company/role → defer to hiring team
const COMPANY_QUESTION_TRIGGERS = [
  'what does the company', 'tell me about the team',
  'how many people', 'what is the culture', 'what are the benefits',
  'what is the salary', 'what is the pay', 'working hours',
  'tell me about the company', 'what are the perks',
] as const

/* ── Transition phrase pools ─────────────────────────────────────── */
const TR_GOOD = [
  'Thank you, that is helpful context. Moving on —',
  'Understood. Let me ask you about something different.',
  'Thank you, that gives me a clear picture. Next —',
  'Noted. Moving on.',
] as const

const TR_BRIEF = [
  'Got it. Let us move to the next one.',
  'Understood. Moving forward.',
  'Thank you. Let me ask you something else.',
  'Noted. Let us keep going.',
] as const

const TR_SECTION: Partial<Record<string, readonly string[]>> = {
  scenario: [
    'I would like to shift gears now and ask you a few scenario-based questions.',
    'Let us move to something a bit different — I will describe a situation and I would like your take on it.',
    'Now I would like to understand how you approach certain situations.',
  ],
  behavioral: [
    'Let us shift to some questions about how you have worked in teams.',
    'I would like to hear about some specific experiences now.',
  ],
  whiteboard: [
    'I would like to do a quick design exercise now.',
    'Let us work through a system design together.',
  ],
  eq: [
    'We are in the final stretch. Just a couple more questions.',
    'Last section — I would like to learn a bit more about you beyond the technical.',
  ],
}

/* ── Web Speech API type shims ───────────────────────────────────── */
interface SpeechRecognitionAlternative { transcript: string; confidence: number }
interface SpeechRecognitionResult {
  readonly length: number
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}
interface SpeechRecognitionResultList {
  readonly length: number
  [index: number]: SpeechRecognitionResult
}
interface SpeechRecognitionEvent extends Event { results: SpeechRecognitionResultList }
interface SpeechRecognitionErrorEvent extends Event { error: string }
interface ISpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
}
interface ISpeechRecognitionConstructor { new(): ISpeechRecognition }
declare global {
  interface Window {
    SpeechRecognition: ISpeechRecognitionConstructor
    webkitSpeechRecognition: ISpeechRecognitionConstructor
  }
}

/* ── Dynamic Monaco ─────────────────────────────────────────────── */
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260, background: '#1E1E1E', color: '#4EC9B0', fontSize: 13 }}>
      Loading editor…
    </div>
  ),
})

/* ── Types ──────────────────────────────────────────────────────── */
interface LocalQuestion {
  id: string
  question: string
  expectedKeyPoints: string[]
  section: 'technical' | 'behavioral' | 'scenario' | 'eq' | 'whiteboard'
  techTag: string
  estimatedMinutes: number
  isPreset: boolean
}
interface EvalResult {
  score: number
  relevanceScore: number
  keyPointsCovered: string[]
  keyPointsMissed: string[]
  evaluatorNote: string
  shouldAskFollowUp: boolean
  followUpQuestion?: string
  generateDynamic: boolean
  suggestedTransition: string
}

/* ── Question bank ──────────────────────────────────────────────── */
function buildQuestions(pos: Position): LocalQuestion[] {
  const tech  = pos.techStack
  const t0    = tech[0] || 'your primary technology'
  const t1    = tech[1] || t0
  const isDev = ['Python', 'Java', 'Spark', 'Kafka', 'AWS', 'Databricks', 'React', 'Node'].some(t =>
    tech.map(x => x.toLowerCase()).includes(t.toLowerCase())
  )
  const qs: LocalQuestion[] = [
    {
      id: 'qt1', section: 'technical',
      question: `Tell me about your hands-on experience with ${t0}. What is the most complex problem you have solved with it, and walk me through your approach.`,
      expectedKeyPoints: ['specific example', 'technical depth', 'problem-solving approach', 'measurable outcome'],
      techTag: t0, estimatedMinutes: 5, isPreset: true,
    },
    {
      id: 'qt2', section: 'technical',
      question: `Describe the architecture of a system you have designed or had significant ownership of. Walk me through your key design decisions and the trade-offs you made.`,
      expectedKeyPoints: ['architecture overview', 'trade-off reasoning', 'scalability', 'personal ownership'],
      techTag: 'Architecture', estimatedMinutes: 7, isPreset: true,
    },
  ]
  if (isDev) {
    qs.push({
      id: 'qw1', section: 'whiteboard',
      question: `Let us do a system design exercise. Design a scalable ${t1}-based data pipeline — use the whiteboard to sketch your architecture and talk me through your thinking.`,
      expectedKeyPoints: ['ingestion layer', 'processing logic', 'storage strategy', 'fault tolerance', 'scalability'],
      techTag: `${t1} Design`, estimatedMinutes: 8, isPreset: true,
    })
  }
  qs.push(
    {
      id: 'qs1', section: 'scenario',
      question: `You have just joined a new team and discovered that a critical production system has a significant performance issue affecting users. Walk me through exactly how you would diagnose and resolve it.`,
      expectedKeyPoints: ['systematic triage', 'stakeholder communication', 'root cause analysis', 'prevention plan'],
      techTag: 'Incident Response', estimatedMinutes: 5, isPreset: true,
    },
    {
      id: 'qb1', section: 'behavioral',
      question: `Tell me about a time you disagreed with a technical decision made by your team or a senior stakeholder. How did you handle it, and what was the outcome?`,
      expectedKeyPoints: ['specific situation', 'clear reasoning', 'respectful approach', 'outcome and reflection'],
      techTag: 'Influence', estimatedMinutes: 4, isPreset: true,
    },
    {
      id: 'qe1', section: 'eq',
      question: `What does working well on a high-performing team mean to you personally, and how do you actively contribute to that dynamic?`,
      expectedKeyPoints: ['self-awareness', 'concrete behaviours', 'empathy', 'team contribution'],
      techTag: 'Collaboration', estimatedMinutes: 3, isPreset: true,
    }
  )
  return qs
}

/* ── Section meta ───────────────────────────────────────────────── */
const SECTION_LABEL: Record<string, string> = {
  technical: 'Technical', behavioral: 'Behavioral',
  scenario: 'Scenario', eq: 'Values', whiteboard: 'System Design',
}
const SECTION_COLOR: Record<string, string> = {
  technical: '#7C3AED', behavioral: '#10B981',
  scenario: '#8B5CF6', eq: '#F59E0B', whiteboard: '#EC4899',
}
function fmt(secs: number) {
  const m = Math.floor(Math.max(0, secs) / 60)
  const s = Math.max(0, secs) % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/* ═══════════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════════ */
export default function InterviewPage() {
  const params = useParams()
  const interviewId = params.interviewId as string

  const {
    interviews, candidates, positions,
    setActiveSession, updateSessionPhase, appendTranscriptEntry,
    upsertQuestionResponse, updateSessionScore, updateSessionCode,
    updateSessionWhiteboard, incrementTabSwitch, updateCandidate, updateInterview,
  } = useAppStore()

  const interview = interviews.find(i => i.id === interviewId)
  const candidate = interview ? candidates.find(c => c.id === interview.candidateId) : null
  const position  = interview ? positions.find(p => p.id === interview.positionId) : null

  /* ── State ────────────────────────────────────────────────── */
  const [phase, setPhaseState]       = useState<InterviewPhase>('waiting')
  const [questions, setQuestions]    = useState<LocalQuestion[]>([])
  const [currentQIdx, setCurrentQIdx] = useState(0)
  const [transcript, setTranscript]  = useState<TranscriptEntry[]>([])
  const [liveTranscript, setLiveTranscript] = useState('')
  const [listeningHint, setListeningHint]   = useState('')
  const [isWarmingUp, setIsWarmingUp]       = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [micFailed, setMicFailed]    = useState(false)
  const [textInputMode, setTextInputMode]   = useState(false)
  const [textInputValue, setTextInputValue] = useState('')
  const [timeRemaining, setTimeRemaining]   = useState(0)
  const [, setQuestionResponses]     = useState<QuestionResponse[]>([])
  const [runningScore, setRunningScore] = useState(0)
  const [showCode, setShowCode]      = useState(false)
  const [showWhiteboard, setShowWhiteboard] = useState(false)
  const [codeContent, setCodeContent] = useState('')
  const [codeLanguage, setCodeLanguage] = useState('javascript')
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [isMobile, setIsMobile]      = useState(false)
  const [messageFromRecruiter, setMessageFromRecruiter] = useState<string | null>(null)

  /* ── Refs ─────────────────────────────────────────────────── */
  const phaseRef          = useRef<InterviewPhase>('waiting')
  const questionsRef      = useRef<LocalQuestion[]>([])
  const currentQIdxRef    = useRef(0)
  const liveTranscriptRef = useRef('')
  const transcriptRef     = useRef<TranscriptEntry[]>([])
  const responsesRef      = useRef<QuestionResponse[]>([])
  const recognitionRef    = useRef<ISpeechRecognition | null>(null)
  const silenceTimersRef  = useRef<ReturnType<typeof setTimeout>[]>([])
  const timerIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const capturedRef       = useRef(false)
  const hasSpokenRef      = useRef(false)
  const rephraseCountRef      = useRef(0)
  const redirectGivenRef      = useRef(false)    // irrelevance redirect given this question
  const shortAnswerAskedRef   = useRef(false)    // follow-up for short answer already asked
  const awaitingMoveOnChoiceRef = useRef(false)  // waiting for candidate's "more time or move on" reply
  const transcriptBoxRef      = useRef<HTMLDivElement>(null)
  const codeTriggerShownRef   = useRef(false)
  const codeDebounceRef       = useRef<ReturnType<typeof setTimeout> | null>(null)
  /* Audio abort mechanism */
  const audioRef          = useRef<HTMLAudioElement | null>(null)
  const isMountedRef      = useRef(true)

  /* ── Sync setters ─────────────────────────────────────────── */
  const setPhase = useCallback((p: InterviewPhase) => {
    phaseRef.current = p
    setPhaseState(p)
    updateSessionPhase(p)
  }, [updateSessionPhase])

  const addTranscript = useCallback((entry: Omit<TranscriptEntry, 'id' | 'timestamp'>) => {
    const full: TranscriptEntry = {
      ...entry,
      id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    }
    transcriptRef.current = [...transcriptRef.current, full]
    setTranscript([...transcriptRef.current])
    appendTranscriptEntry(full)
    setTimeout(() => {
      if (transcriptBoxRef.current)
        transcriptBoxRef.current.scrollTop = transcriptBoxRef.current.scrollHeight
    }, 50)
  }, [appendTranscriptEntry])

  /* ── Mobile detection ─────────────────────────────────────── */
  useEffect(() => { setIsMobile(window.innerWidth < 768) }, [])

  /* ── Tab visibility tracking ──────────────────────────────── */
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && phaseRef.current !== 'waiting' && phaseRef.current !== 'completed') {
        incrementTabSwitch()
        addTranscript({ speaker: 'candidate', text: '[System: Candidate switched tabs]', type: 'transition' })
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [addTranscript, incrementTabSwitch])

  /* ── Audio cleanup on unmount ────────────────────────────── */
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current = null
      }
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    }
  }, [])

  /* ── Kill audio when interview completes ──────────────────── */
  useEffect(() => {
    if (phase === 'completed') {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current = null
      }
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    }
  }, [phase])

  /* ── localStorage backup every 30 s ──────────────────────── */
  useEffect(() => {
    if (!interviewId) return
    const interval = setInterval(() => {
      if (transcriptRef.current.length > 0) {
        try {
          localStorage.setItem(
            `ic_interview_${interviewId}`,
            JSON.stringify({ transcript: transcriptRef.current, savedAt: new Date().toISOString() })
          )
        } catch {}
      }
    }, 30_000)
    return () => clearInterval(interval)
  }, [interviewId])

  /* ── Countdown timer ──────────────────────────────────────── */
  useEffect(() => {
    if (phase === 'waiting' || phase === 'completed') return
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        const next = prev - 1
        if (next <= 0) {
          clearInterval(timerIntervalRef.current!)
          if (phaseRef.current !== 'completed' && phaseRef.current !== 'closing') handleTimeUp()
          return 0
        }
        return next
      })
    }, 1000)
    return () => clearInterval(timerIntervalRef.current!)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase === 'waiting', phase === 'completed'])

  /* ── Clear all silence timers ─────────────────────────────── */
  const clearSilenceTimers = useCallback(() => {
    silenceTimersRef.current.forEach(t => clearTimeout(t))
    silenceTimersRef.current = []
  }, [])

  /* ── Stop all audio immediately ──────────────────────────── */
  const stopAllAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
  }, [])

  /* ── TTS ──────────────────────────────────────────────────── */
  const speakText = useCallback(async (text: string): Promise<void> => {
    // Abort any currently playing audio before starting new
    stopAllAudio()

    if (!isMountedRef.current) return
    setPhase('speaking')

    if (process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY) {
      try {
        const res = await fetch('/api/interview/generate-speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID }),
        })
        if (!isMountedRef.current) return
        const ct = res.headers.get('Content-Type') || ''
        if (ct.includes('audio/mpeg')) {
          const blob = await res.blob()
          if (!isMountedRef.current) return
          const url = URL.createObjectURL(blob)
          await new Promise<void>((resolve) => {
            const audio = new Audio(url)
            audioRef.current = audio
            audio.onended = () => {
              URL.revokeObjectURL(url)
              audioRef.current = null
              resolve()
            }
            audio.onerror = () => {
              URL.revokeObjectURL(url)
              audioRef.current = null
              resolve()
            }
            audio.play().catch(() => {
              audioRef.current = null
              resolve()
            })
          })
          return
        }
        const bodyText = await res.text().catch(() => '(unreadable)')
        console.warn('[speakText] Non-audio response:', bodyText)
      } catch (err) {
        console.warn('[speakText] fetch threw:', err)
      }
    }

    if (!isMountedRef.current) return

    // Browser TTS fallback — prefer Google US voice (Chrome) for best quality
    await new Promise<void>((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) { resolve(); return }
      window.speechSynthesis.cancel()

      const speak = () => {
        const voices = window.speechSynthesis.getVoices()
        // Priority: Google en-US (Chrome) → any en-US → any voice
        const preferred =
          voices.find(v => v.name.includes('Google') && v.lang === 'en-US') ||
          voices.find(v => v.lang === 'en-US') ||
          voices[0]

        const utt = new SpeechSynthesisUtterance(text)
        if (preferred) utt.voice = preferred
        utt.rate   = 0.92
        utt.pitch  = 1.0
        utt.volume = 1.0
        utt.onend  = () => resolve()
        utt.onerror = () => resolve()
        window.speechSynthesis.speak(utt)
      }

      // Chrome loads voices asynchronously; other browsers return them immediately
      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        speak()
      } else {
        window.speechSynthesis.addEventListener('voiceschanged', speak, { once: true })
      }
    })
  }, [setPhase, stopAllAudio])

  /* ── STT ──────────────────────────────────────────────────── */
  const startListening = useCallback(() => {
    if (micFailed) { setTextInputMode(true); return }

    const SR: ISpeechRecognitionConstructor | undefined =
      window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setMicFailed(true); setTextInputMode(true); return }

    if (recognitionRef.current) { try { recognitionRef.current.stop() } catch {} }

    // Reset per-listen state
    clearSilenceTimers()
    hasSpokenRef.current = false
    capturedRef.current  = false
    setListeningHint('')

    // Soft chime → signals mic is live
    playChime()

    const rec = new SR()
    rec.continuous     = true
    rec.interimResults = true
    rec.lang           = 'en-US'

    rec.onresult = (event: SpeechRecognitionEvent) => {
      const text = Array.from(event.results).map(r => r[0].transcript).join(' ').trim()
      liveTranscriptRef.current = text
      setLiveTranscript(text)

      if (text) {
        hasSpokenRef.current = true
        setListeningHint('')  // clear cold-start hints once they begin speaking
        clearSilenceTimers()

        // 3 s of silence after speaking → capture response
        const captureTimer = setTimeout(() => {
          if (liveTranscriptRef.current.trim() && !capturedRef.current) {
            capturedRef.current = true
            captureResponse(liveTranscriptRef.current)
          }
        }, 3000)
        silenceTimersRef.current = [captureTimer]
      }
    }

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setMicFailed(true)
        setTextInputMode(true)
      }
    }

    recognitionRef.current = rec
    rec.start()
    setIsListening(true)
    setPhase('listening')

    // ── Graduated cold-start silence timers ───────────────────
    // t5: show text indicator — no audio
    const t5 = setTimeout(() => {
      if (!hasSpokenRef.current && !capturedRef.current)
        setListeningHint('● Still listening…')
    }, SILENCE_THRESHOLDS.STILL_LISTENING * 1000)

    // t12: gentle spoken nudge
    const t12 = setTimeout(async () => {
      if (hasSpokenRef.current || capturedRef.current || phaseRef.current !== 'listening') return
      clearSilenceTimers()   // prevent t20/t30 from also firing this invocation
      setListeningHint('')
      try { recognitionRef.current?.stop() } catch {}
      setIsListening(false)

      const nudge = "Take your time — I'm here whenever you're ready."
      addTranscript({ speaker: 'ai', text: nudge, type: 'transition' })
      await speakText(nudge)

      const phaseAfter12 = phaseRef.current as string
      if (phaseAfter12 !== 'completed' && phaseAfter12 !== 'closing') {
        await delay(1500)
        startListening()
      }
    }, SILENCE_THRESHOLDS.GENTLE_PROMPT * 1000)

    // t20: offer choice — move on or more time
    const t20 = setTimeout(async () => {
      if (hasSpokenRef.current || capturedRef.current || phaseRef.current !== 'listening') return
      clearSilenceTimers()
      setListeningHint('')
      try { recognitionRef.current?.stop() } catch {}
      setIsListening(false)

      const prompt = "Would you like a moment more, or shall we move on to the next question?"
      addTranscript({ speaker: 'ai', text: prompt, type: 'transition' })
      await speakText(prompt)
      awaitingMoveOnChoiceRef.current = true  // next captureResponse handles the choice

      const phaseAfter20 = phaseRef.current as string
      if (phaseAfter20 !== 'completed' && phaseAfter20 !== 'closing') {
        await delay(1500)
        startListening()
      }
    }, SILENCE_THRESHOLDS.OFFER_CHOICE * 1000)

    // t30: auto-advance — gracefully move to next question
    const t30 = setTimeout(async () => {
      if (hasSpokenRef.current || capturedRef.current || phaseRef.current !== 'listening') return
      clearSilenceTimers()
      awaitingMoveOnChoiceRef.current = false
      setListeningHint('')
      try { recognitionRef.current?.stop() } catch {}
      setIsListening(false)

      const autoAdv = "Let's come back to that if time allows."
      addTranscript({ speaker: 'ai', text: autoAdv, type: 'transition' })
      await speakText(autoAdv)

      const phaseAfter30 = phaseRef.current as string
      if (phaseAfter30 !== 'completed' && phaseAfter30 !== 'closing') {
        await delay(800)
        await moveToQuestion(currentQIdxRef.current + 1)
      }
    }, SILENCE_THRESHOLDS.AUTO_ADVANCE * 1000)

    silenceTimersRef.current = [t5, t12, t20, t30]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micFailed, setPhase, clearSilenceTimers])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) { try { recognitionRef.current.stop() } catch {} }
    clearSilenceTimers()
    setIsListening(false)
    setLiveTranscript('')
    setListeningHint('')
    liveTranscriptRef.current = ''
  }, [clearSilenceTimers])

  /* ── Submit text input (fallback) ─────────────────────────── */
  const submitTextInput = useCallback(() => {
    const text = textInputValue.trim()
    if (!text) return
    setTextInputValue('')
    capturedRef.current = true
    captureResponse(text)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textInputValue])

  /* ── Core interview flow ───────────────────────────────────── */

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const captureResponse = useCallback(async (responseText: string) => {
    stopListening()
    setPhase('processing')
    setLiveTranscript('')
    setListeningHint('')

    const q = questionsRef.current[currentQIdxRef.current]
    if (!q) return

    const lower = responseText.toLowerCase().trim()

    // ── 0. Awaiting "more time or move on?" choice ───────────────────
    if (awaitingMoveOnChoiceRef.current) {
      awaitingMoveOnChoiceRef.current = false
      const wantsMoveOn = ['move on', 'next', 'skip', 'yes', 'go ahead', 'continue'].some(w => lower.includes(w))
      const wantsMore   = ['more time', 'wait', 'moment', 'no', 'not yet', 'hold on'].some(w => lower.includes(w))
      if (wantsMoveOn) {
        addTranscript({ speaker: 'candidate', text: responseText, questionId: q.id, type: 'preset' })
        const ack = "Let's keep going."
        addTranscript({ speaker: 'ai', text: ack, type: 'transition' })
        await speakText(ack)
        await delay(600)
        await moveToQuestion(currentQIdxRef.current + 1)
        return
      }
      if (wantsMore) {
        const ack = 'Of course, take your time.'
        addTranscript({ speaker: 'ai', text: ack, type: 'transition' })
        await speakText(ack)
        await delay(600)
        startListening()
        return
      }
      // Substantive answer — fall through to normal handling
    }

    // ── 1. Fit / qualification questions ────────────────────────────
    if (REDIRECT_TRIGGERS.some(w => lower.includes(w))) {
      addTranscript({ speaker: 'candidate', text: responseText, questionId: q.id, type: 'preset' })
      const resp = "That's not something I can comment on during the interview — the team will be in touch after. Let's continue."
      addTranscript({ speaker: 'ai', text: resp, type: 'transition' })
      await speakText(resp)
      await delay(800)
      await moveToQuestion(currentQIdxRef.current + 1)
      return
    }

    // ── 2. Company / role questions ──────────────────────────────────
    if (COMPANY_QUESTION_TRIGGERS.some(w => lower.includes(w))) {
      addTranscript({ speaker: 'candidate', text: responseText, questionId: q.id, type: 'preset' })
      const resp = "I don't have that detail handy — the hiring team will cover that with you. Shall we continue?"
      addTranscript({ speaker: 'ai', text: resp, type: 'transition' })
      await speakText(resp)
      await delay(800)
      startListening()
      return
    }

    // ── 3. Repeat / clarification request ───────────────────────────
    if (REPEAT_TRIGGERS.some(w => lower.includes(w))) {
      if (rephraseCountRef.current >= 1) {
        const defer = 'Let me know when you are ready and we will continue.'
        addTranscript({ speaker: 'ai', text: defer, type: 'transition' })
        await speakText(defer)
        await delay(1500)
        startListening()
        return
      }
      rephraseCountRef.current++
      // Repeat verbatim — no paraphrase
      addTranscript({ speaker: 'ai', text: q.question, questionId: q.id, type: 'preset' })
      await speakText(q.question)
      await delay(1500)
      startListening()
      return
    }

    // ── 4. I don't know ─────────────────────────────────────────────
    if (DONT_KNOW_TRIGGERS.some(w => lower.includes(w))) {
      addTranscript({ speaker: 'candidate', text: responseText, questionId: q.id, type: 'preset' })
      if (rephraseCountRef.current >= 1) {
        const ack = "That's completely fine, let's move on."
        addTranscript({ speaker: 'ai', text: ack, type: 'transition' })
        await speakText(ack)
        await delay(800)
        await moveToQuestion(currentQIdxRef.current + 1)
      } else {
        rephraseCountRef.current++
        const rephrase = `No problem — let me ask it from a different angle. ${q.question}`
        addTranscript({ speaker: 'ai', text: rephrase, questionId: q.id, type: 'preset' })
        await speakText(rephrase)
        await delay(1500)
        startListening()
      }
      return
    }

    // ── 5. Skip / move on ────────────────────────────────────────────
    if (SKIP_TRIGGERS.some(w => lower.includes(w))) {
      addTranscript({ speaker: 'candidate', text: responseText, questionId: q.id, type: 'preset' })
      const ack = 'Of course, let us move on.'
      addTranscript({ speaker: 'ai', text: ack, type: 'transition' })
      await speakText(ack)
      await delay(1500)
      await moveToQuestion(currentQIdxRef.current + 1)
      return
    }

    addTranscript({ speaker: 'candidate', text: responseText, questionId: q.id, type: 'preset' })

    // ── 6. Word count — very short answer ───────────────────────────
    const wordCount = responseText.trim().split(/\s+/).filter(Boolean).length
    if (wordCount < 8 && !shortAnswerAskedRef.current) {
      shortAnswerAskedRef.current = true
      const followUp = 'Could you walk me through a specific example of that?'
      addTranscript({ speaker: 'ai', text: followUp, type: 'transition' })
      await speakText(followUp)
      await delay(1500)
      startListening()
      return
    }

    // ── 7. Evaluate ──────────────────────────────────────────────────
    let ev: EvalResult = {
      score: 5, relevanceScore: 5, keyPointsCovered: [], keyPointsMissed: [],
      evaluatorNote: '', shouldAskFollowUp: false, generateDynamic: false,
      suggestedTransition: '',
    }
    try {
      const prevQ = transcriptRef.current
        .filter(t => t.speaker === 'ai' && t.questionId)
        .slice(-3)
        .map(t => ({ question: t.text, response: '' }))

      const res = await fetch('/api/interview/evaluate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText:      q.question,
          expectedKeyPoints: q.expectedKeyPoints,
          candidateResponse: responseText,
          previousResponses: prevQ,
          dynamicIntensity:  position?.dynamicQuestionIntensity ?? 'standard',
        }),
      })
      ev = await res.json()
    } catch {}

    // ── 8. Relevance / rambling check ────────────────────────────────
    if ((ev.relevanceScore ?? 5) < 4) {
      if (!redirectGivenRef.current) {
        redirectGivenRef.current = true
        // Rambling (>250 words off-topic) vs simply irrelevant — different phrasing
        const redirect = wordCount > 250
          ? `Thank you — I want to make sure we cover everything in our time together. Let me bring it back to ${q.techTag || SECTION_LABEL[q.section] || 'the topic'}.`
          : `I may not have been clear — I was asking specifically about ${q.expectedKeyPoints[0] ?? q.techTag ?? 'the question'}. Take your time.`
        addTranscript({ speaker: 'ai', text: redirect, type: 'transition' })
        await speakText(redirect)
        await delay(1500)
        startListening()
        return
      }
      // Already redirected once — accept and move on gracefully
      const ack = "Understood, let's move forward."
      addTranscript({ speaker: 'ai', text: ack, type: 'transition' })
      await speakText(ack)
      await delay(800)
      await moveToQuestion(currentQIdxRef.current + 1)
      return
    }

    // ── 9. Save response ─────────────────────────────────────────────
    const qr: QuestionResponse = {
      questionId:        q.id,
      questionText:      q.question,
      questionType:      q.section,
      isPreset:          q.isPreset,
      candidateResponse: responseText,
      score:             Math.round((ev.score / 10) * 100),
      keyPointsCovered:  ev.keyPointsCovered ?? [],
      keyPointsMissed:   ev.keyPointsMissed ?? [],
      evaluatorNote:     ev.evaluatorNote ?? '',
      timeSpent:         0,
    }
    const updatedResponses = [...responsesRef.current, qr]
    responsesRef.current = updatedResponses
    setQuestionResponses(updatedResponses)
    upsertQuestionResponse(qr)

    const avg = Math.round(updatedResponses.reduce((a, r) => a + r.score, 0) / updatedResponses.length)
    setRunningScore(avg)
    updateSessionScore(avg)

    // ── 10. Next action ──────────────────────────────────────────────
    const nextIdx = currentQIdxRef.current + 1
    const nextQ   = questionsRef.current[nextIdx]
    const isSectionChange = nextQ && nextQ.section !== q.section

    if (ev.shouldAskFollowUp && ev.followUpQuestion) {
      addTranscript({ speaker: 'ai', text: ev.followUpQuestion, questionId: q.id, type: 'followup' })
      await speakText(ev.followUpQuestion)
      await delay(1500)
      startListening()
    } else {
      // Speak quality-based transition — section changes get their own preamble in moveToQuestion
      if (!isSectionChange) {
        const transText = (ev.score ?? 5) >= 6 ? pick(TR_GOOD) : pick(TR_BRIEF)
        addTranscript({ speaker: 'ai', text: transText, type: 'transition' })
        await speakText(transText)
        await delay(400)
      }
      await moveToQuestion(nextIdx)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopListening, setPhase, addTranscript, upsertQuestionResponse, updateSessionScore, speakText, position, startListening])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const moveToQuestion = useCallback(async (idx: number) => {
    const qs = questionsRef.current
    if (idx >= qs.length) { await startClosing(); return }

    currentQIdxRef.current = idx
    setCurrentQIdx(idx)
    setPhase('questioning')
    rephraseCountRef.current      = 0     // reset all per-question edge-case state
    redirectGivenRef.current      = false
    shortAnswerAskedRef.current   = false
    awaitingMoveOnChoiceRef.current = false

    const q    = qs[idx]
    const prevQ = idx > 0 ? qs[idx - 1] : null

    // Auto-open panels
    if (q.section === 'whiteboard') setShowWhiteboard(true)
    if (q.section === 'technical' || q.section === 'scenario') setShowCode(true)

    const isFirstCodeTrigger = (q.section === 'technical' || q.section === 'scenario') && !codeTriggerShownRef.current

    // Section-change preamble (skip on first question)
    if (prevQ && q.section !== prevQ.section) {
      const sectionLines = TR_SECTION[q.section] ?? ['Moving on.']
      const sectionText  = pick(sectionLines)
      addTranscript({ speaker: 'ai', text: sectionText, type: 'transition' })
      await speakText(sectionText)
      await delay(500)
    }

    // Speak the question itself
    addTranscript({ speaker: 'ai', text: q.question, questionId: q.id, type: 'preset' })
    await speakText(q.question)

    // Verbal cue for panels (fires once per panel type)
    if (q.section === 'whiteboard' && prevQ?.section !== 'whiteboard') {
      const cue = 'You can use the whiteboard below to sketch your thinking.'
      addTranscript({ speaker: 'ai', text: cue, type: 'transition' })
      await speakText(cue)
      await delay(400)
    } else if (isFirstCodeTrigger) {
      codeTriggerShownRef.current = true
      const cue = 'Feel free to use the code editor below to write or illustrate your answer.'
      addTranscript({ speaker: 'ai', text: cue, type: 'transition' })
      await speakText(cue)
      await delay(400)
    }

    // 1.5 s warmup — let the candidate process before mic opens
    setIsWarmingUp(true)
    setListeningHint('Take your time…')
    await delay(1500)
    setIsWarmingUp(false)
    setListeningHint('')

    startListening()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setPhase, addTranscript, speakText, startListening])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const startClosing = useCallback(async () => {
    setPhase('closing')
    const firstName = candidate?.name.split(' ')[0] || 'there'
    const closing =
      `Thank you ${firstName}, that brings us to the end of our interview today. ` +
      `You covered a great deal of ground and I appreciate your thoughtfulness in each response. ` +
      `The team will review your evaluation and be in touch with next steps. ` +
      `It was great speaking with you.`

    addTranscript({ speaker: 'ai', text: closing, type: 'closing' })
    await speakText(closing)
    finishInterview()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate, setPhase, addTranscript, speakText])

  const finishInterview = useCallback(() => {
    setPhase('completed')
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    stopListening()

    updateCandidate(interview?.candidateId ?? '', {
      status: 'completed',
      score: runningScore > 0 ? runningScore : 72,
    })
    if (interview) updateInterview(interview.id, { status: 'completed', candidateJoined: true })

    try {
      localStorage.setItem(`ic_interview_${interviewId}_complete`, JSON.stringify({
        completedAt: new Date().toISOString(),
        transcript:  transcriptRef.current,
        responses:   responsesRef.current,
      }))
    } catch {}
  }, [setPhase, stopListening, updateCandidate, updateInterview, interview, interviewId, runningScore])

  const handleTimeUp = useCallback(async () => {
    if (phaseRef.current === 'completed' || phaseRef.current === 'closing') return
    stopListening()
    await startClosing()
  }, [stopListening, startClosing])

  /* ── Start interview ──────────────────────────────────────── */
  const startInterview = useCallback(async () => {
    if (!candidate || !position || !interview) return

    const qs = buildQuestions(position)
    setQuestions(qs)
    questionsRef.current = qs

    const duration = position.interviewDuration ?? 30
    setTimeRemaining(duration * 60)

    setActiveSession({
      interviewId,
      candidateId:   interview.candidateId,
      positionId:    interview.positionId,
      phase:         'intro',
      startedAt:     new Date().toISOString(),
      elapsedSeconds: 0,
      transcript:    [],
      questionResponses: [],
      codeEditorContent:  '',
      codeEditorLanguage: 'python',
      runningScore:   0,
      currentQuestionIndex:      0,
      dynamicQuestionsGenerated: 0,
      candidateTabSwitches:      0,
    })

    updateInterview(interviewId, { status: 'in_progress', candidateJoined: true })
    setPhase('intro')

    // 2 s pause — give candidate time to settle before Alex speaks
    await delay(2000)

    const firstName = candidate.name.split(' ')[0]
    const intro =
      `Hi ${firstName}, I am Alex, your AI interviewer for today. ` +
      `We have ${duration} minutes together for the ${position.title} role at ${position.company}. ` +
      `I will ask you a mix of technical, scenario-based, and behavioural questions. ` +
      `Please speak clearly, take your time, and elaborate on your experience. ` +
      `Let us begin.`

    addTranscript({ speaker: 'ai', text: intro, type: 'intro' })
    await speakText(intro)

    // 2 s natural pause before first question
    await delay(2000)

    await moveToQuestion(0)
  }, [
    candidate, position, interview, interviewId,
    setActiveSession, updateInterview, setPhase,
    addTranscript, speakText, moveToQuestion,
  ])

  /* ── End Interview flow ───────────────────────────────────── */
  const END_CONFIRM_PHRASES = [
    'Just to confirm — would you like to end the interview now?',
    'Are you sure you would like to end the session early?',
    'Before we wrap up — are you certain you want to end now?',
  ] as const

  const handleEndInterviewRequest = useCallback(async () => {
    // Immediately stop mic and clear silence timers
    stopListening()
    clearSilenceTimers()

    // Show modal + speak confirmation simultaneously
    setShowEndConfirm(true)
    const phrase = pick(END_CONFIRM_PHRASES)
    addTranscript({ speaker: 'ai', text: phrase, type: 'transition' })
    await speakText(phrase)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopListening, clearSilenceTimers, addTranscript, speakText])

  const handleEndConfirmContinue = useCallback(async () => {
    setShowEndConfirm(false)
    const continuePhrase = 'Great, let us continue.'
    addTranscript({ speaker: 'ai', text: continuePhrase, type: 'transition' })
    await speakText(continuePhrase)
    if (isMountedRef.current && phaseRef.current !== 'completed' && phaseRef.current !== 'closing') {
      await delay(500)
      startListening()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addTranscript, speakText, startListening])

  const handleEndConfirmEnd = useCallback(async () => {
    setShowEndConfirm(false)
    stopAllAudio()
    await startClosing()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopAllAudio, startClosing])

  /* ── Code editor sync (debounced 1 s) ────────────────────── */
  const handleCodeChange = (val: string | undefined) => {
    const v = val ?? ''
    setCodeContent(v)
    if (codeDebounceRef.current) clearTimeout(codeDebounceRef.current)
    codeDebounceRef.current = setTimeout(() => {
      updateSessionCode(v, codeLanguage)
    }, 1000)
  }

  /* ── Whiteboard export ────────────────────────────────────── */
  const handleWhiteboardExport = (dataUrl: string) => {
    updateSessionWhiteboard(dataUrl)
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════ */

  if (!interview || !candidate || !position) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <div style={{ textAlign: 'center', color: '#94A3B8' }}>
          <AlertTriangle size={40} style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: '#4F46E5' }}>Interview not found</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Interview ID: {interviewId}</div>
        </div>
      </div>
    )
  }

  if (isMobile) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#4F46E5', padding: 32 }}>
        <div style={{ textAlign: 'center', color: '#fff', maxWidth: 340 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💻</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Desktop Required</div>
          <div style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.6 }}>
            This interview is optimised for desktop. Please open this link on a laptop or desktop computer to begin.
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'completed') {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <div style={{ textAlign: 'center', maxWidth: 480, padding: 40 }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>✅</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: '#4F46E5', marginBottom: 12 }}>Interview Complete</div>
          <div style={{ fontSize: 15, color: '#64748B', lineHeight: 1.7 }}>
            Thank you, {candidate.name.split(' ')[0]}. Your interview has been submitted. The team at {position.company} will be in touch with next steps.
          </div>
          <div style={{ marginTop: 32, padding: '14px 24px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)', borderRadius: 12, color: '#059669', fontSize: 13, fontWeight: 600 }}>
            You may now close this window.
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'waiting') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', gap: 32 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: '#4F46E5', letterSpacing: '-0.025em' }}>
          Levl<span style={{ color: '#7C3AED' }}>1</span>
        </div>
        <div style={{ textAlign: 'center', maxWidth: 520, padding: '40px 48px', background: '#fff', borderRadius: 20, border: '1px solid #E2E8F0', boxShadow: '0 4px 24px rgba(79,70,229,0.08)' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px', background: 'linear-gradient(135deg, #4F46E5, #4338CA)', border: '3px solid #7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mic size={32} color="#7C3AED" />
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: '#4F46E5', marginBottom: 8 }}>Your Interview is Ready</div>
          <div style={{ fontSize: 14, color: '#64748B', marginBottom: 4 }}>{position.title} · {position.company}</div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 28 }}>Duration: {position.interviewDuration ?? 30} minutes · AI Interviewer: Alex</div>
          <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.7, marginBottom: 28, padding: '14px 16px', background: '#F8FAFC', borderRadius: 10 }}>
            <strong>Before you start:</strong> ensure you are in a quiet place, your microphone is working, and you have a stable internet connection. Speak clearly and take your time with each answer.
          </div>
          <button
            onClick={startInterview}
            style={{ width: '100%', padding: '14px 0', background: 'linear-gradient(135deg, #4F46E5, #4338CA)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.01em' }}
          >
            Start Interview →
          </button>
          <div style={{ marginTop: 14, fontSize: 12, color: '#94A3B8' }}>By starting, you consent to this interview being recorded and evaluated.</div>
        </div>
      </div>
    )
  }

  /* ── Active interview UI ───────────────────────────────────── */
  const currentQ   = questions[currentQIdx]
  const timerColor = timeRemaining <= 120 ? '#DC2626' : timeRemaining <= 300 ? '#D97706' : '#4F46E5'

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F0F4F8', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: 56, background: '#fff', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: '#4F46E5', letterSpacing: '-0.02em' }}>
          Levl<span style={{ color: '#7C3AED' }}>1</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#64748B', textAlign: 'center' }}>
          {candidate.name} · {position.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} color={timerColor} />
            <span className="font-mono" style={{ fontSize: 15, fontWeight: 800, color: timerColor, letterSpacing: '0.05em' }}>{fmt(timeRemaining)}</span>
          </div>
          <button
            onClick={handleEndInterviewRequest}
            style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1px solid #FCA5A5', background: 'rgba(239,68,68,0.06)', color: '#DC2626', cursor: 'pointer' }}
          >
            End Interview
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflow: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Recruiter message banner */}
        {messageFromRecruiter && (
          <div style={{ padding: '10px 16px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#92400E', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>📋 {messageFromRecruiter}</span>
            <button onClick={() => setMessageFromRecruiter(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400E' }}><X size={14} /></button>
          </div>
        )}

        {/* ── AI + Question row ── */}
        <div className="interview-ai-question-row" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>

          {/* AI Interviewer Panel — premium visualizer */}
          <AIVisualizer
            phase={phase}
            isWarmingUp={isWarmingUp}
            liveTranscriptLength={liveTranscript.length}
            timeRemaining={timeRemaining}
            candidateName={candidate.name}
            positionTitle={position.title}
          />

          {/* Current question card */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {currentQ ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 100, background: `${SECTION_COLOR[currentQ.section]}15`, border: `1px solid ${SECTION_COLOR[currentQ.section]}30`, color: SECTION_COLOR[currentQ.section], letterSpacing: '0.06em' }}>
                    {SECTION_LABEL[currentQ.section]?.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>Question {currentQIdx + 1} of {questions.length}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#64748B', background: '#F1F5F9', padding: '2px 8px', borderRadius: 4, letterSpacing: '0.04em' }}>
                    {currentQ.isPreset ? 'PRESET' : 'DYNAMIC'}
                  </span>
                </div>
                <p style={{ fontSize: 16, fontWeight: 600, color: '#4F46E5', lineHeight: 1.65, margin: 0 }}>{currentQ.question}</p>
                {currentQ.section === 'whiteboard' && (
                  <div style={{ fontSize: 12, color: '#8B5CF6', fontWeight: 600 }}>✏️ Use the whiteboard below to sketch your answer</div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 15, color: '#64748B', lineHeight: 1.6 }}>
                {phase === 'intro' ? 'Your interview is starting…' : 'Preparing next question…'}
              </div>
            )}
          </div>
        </div>

        {/* ── Transcript / response area ── */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {isWarmingUp ? (
              <span style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', fontStyle: 'italic' }}>
                Take your time…
              </span>
            ) : isListening ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#DC2626' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626', animation: 'pulseDot 1.2s ease-in-out infinite', display: 'inline-block' }} />
                Recording… speak your answer
              </span>
            ) : (
              <span style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 6 }}>
                {micFailed ? <MicOff size={13} /> : <Mic size={13} />}
                {micFailed ? 'Microphone unavailable — use text input below' : 'Waiting for your response'}
              </span>
            )}
          </div>

          {/* Silence hint (3 s / 6 s graduated messages) */}
          {listeningHint && (
            <div style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', padding: '2px 0' }}>
              {listeningHint}
            </div>
          )}

          {/* Live transcript */}
          <div ref={transcriptBoxRef} style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {transcript.slice(-4).map(entry => (
              <div key={entry.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 10, fontWeight: 700, minWidth: 60, paddingTop: 2, color: entry.speaker === 'ai' ? '#7C3AED' : '#10B981', letterSpacing: '0.04em' }}>
                  {entry.speaker === 'ai' ? 'ALEX' : 'YOU'}
                </span>
                <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.55 }}>{entry.text}</span>
              </div>
            ))}
            {liveTranscript && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 10, fontWeight: 700, minWidth: 60, paddingTop: 2, color: '#10B981', letterSpacing: '0.04em' }}>YOU</span>
                <span style={{ fontSize: 13, color: '#64748B', fontStyle: 'italic', lineHeight: 1.55 }}>{liveTranscript}</span>
              </div>
            )}
          </div>

          {/* Text input fallback */}
          {(textInputMode || micFailed) && phase === 'listening' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <textarea
                value={textInputValue}
                onChange={e => setTextInputValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) submitTextInput() }}
                placeholder="Type your response here… (⌘+Enter to submit)"
                style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 13, lineHeight: 1.5, resize: 'vertical', minHeight: 72, fontFamily: 'var(--font-sans)', outline: 'none', color: '#334155' }}
              />
              <button
                onClick={submitTextInput}
                disabled={!textInputValue.trim()}
                style={{ padding: '0 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: textInputValue.trim() ? '#4F46E5' : '#E2E8F0', color: textInputValue.trim() ? '#fff' : '#94A3B8', fontSize: 13, fontWeight: 700, transition: 'all 0.15s' }}
              >
                Submit
              </button>
            </div>
          )}
        </div>

        {/* ── Progress bar ── */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', padding: '12px 20px' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {questions.map((q, idx) => {
              const done    = idx < currentQIdx
              const current = idx === currentQIdx
              const color   = SECTION_COLOR[q.section]
              return (
                <div key={q.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ height: 5, borderRadius: 3, background: done ? color : current ? `${color}55` : '#E2E8F0', transition: 'all 0.4s ease' }} />
                  <div style={{ fontSize: 9, fontWeight: 700, color: done ? color : current ? color : '#CBD5E1', letterSpacing: '0.04em', textAlign: 'center' }}>
                    {done ? '✓' : SECTION_LABEL[q.section]?.slice(0, 4).toUpperCase()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </main>

      {/* ── Bottom dock — always visible ──────────────────────── */}
      <div style={{ flexShrink: 0, background: '#fff', borderTop: '1px solid #E2E8F0', zIndex: 10 }}>

        {/* Toggle buttons */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px',
          borderBottom: (showCode || showWhiteboard) ? '1px solid #E2E8F0' : 'none',
        }}>
          <button
            onClick={() => setShowCode(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: showCode ? '#4F46E5' : '#F1F5F9',
              color: showCode ? '#fff' : '#64748B',
              fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
              letterSpacing: '-0.01em',
            }}
          >
            <Code2 size={13} />
            ≡ Code Editor
          </button>
          <button
            onClick={() => setShowWhiteboard(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: showWhiteboard ? '#4F46E5' : '#F1F5F9',
              color: showWhiteboard ? '#fff' : '#64748B',
              fontSize: 12, fontWeight: 700, transition: 'all 0.15s',
              letterSpacing: '-0.01em',
            }}
          >
            <PenLine size={13} />
            ⬜ Whiteboard
          </button>
        </div>

        {/* Code Editor panel */}
        {showCode && (
          <div className="interview-monaco-wrapper" style={{ borderBottom: showWhiteboard ? '1px solid #E2E8F0' : 'none' }}>
            <div style={{ padding: '6px 12px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>Language:</span>
              {(['javascript', 'typescript', 'python', 'java', 'sql', 'go', 'cpp'] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => setCodeLanguage(lang)}
                  style={{ padding: '3px 10px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: codeLanguage === lang ? '#4F46E5' : 'transparent', color: codeLanguage === lang ? '#fff' : '#64748B' }}
                >
                  {lang === 'cpp' ? 'C++' : lang === 'javascript' ? 'JavaScript' : lang === 'typescript' ? 'TypeScript' : lang.charAt(0).toUpperCase() + lang.slice(1)}
                </button>
              ))}
            </div>
            <MonacoEditor
              height={220}
              language={codeLanguage}
              theme="vs-dark"
              value={codeContent}
              onChange={handleCodeChange}
              options={{ minimap: { enabled: false }, fontSize: 13, lineNumbers: 'on', scrollBeyondLastLine: false, automaticLayout: true, wordWrap: 'on', padding: { top: 12, bottom: 12 } }}
            />
          </div>
        )}

        {/* Whiteboard panel */}
        {showWhiteboard && (
          <div className="interview-whiteboard" style={{ maxHeight: 320, overflow: 'hidden' }}>
            <Whiteboard onExport={handleWhiteboardExport} />
          </div>
        )}
      </div>

      {/* ── End confirm modal ── */}
      {showEndConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(15,10,46,0.65)',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeUp 0.18s ease both',
        }}>
          <div style={{
            background: '#fff', borderRadius: 18, width: 400,
            boxShadow: '0 32px 80px rgba(79,70,229,0.22), 0 8px 24px rgba(0,0,0,0.1)',
            border: '1px solid #E2E8F0', overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{ padding: '22px 28px 0', borderBottom: '1px solid #F1F5F9', paddingBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={18} color="#DC2626" />
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, color: '#1E293B' }}>
                  End Interview?
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 28px' }}>
              {timeRemaining > 0 && (
                <div style={{
                  padding: '10px 14px', background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10,
                  fontSize: 13, fontWeight: 600, color: '#92400E', marginBottom: 14,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Clock size={14} color="#D97706" />
                  You have {fmt(timeRemaining)} remaining.
                </div>
              )}
              <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.65, margin: 0 }}>
                Ending now will generate a report based on the questions answered so far.
                {timeRemaining > 0 ? ' You still have time remaining.' : ''}
              </p>
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 28px', borderTop: '1px solid #F1F5F9',
              display: 'flex', gap: 10, justifyContent: 'flex-end',
            }}>
              <button
                onClick={handleEndConfirmContinue}
                style={{
                  padding: '9px 20px', borderRadius: 9,
                  border: '1px solid #E2E8F0', background: '#fff',
                  color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: 13,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFF'; e.currentTarget.style.borderColor = '#CBD5E1' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#E2E8F0' }}
              >
                Continue Interview
              </button>
              <button
                onClick={handleEndConfirmEnd}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 20px', borderRadius: 9, border: 'none',
                  background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                  color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13,
                  boxShadow: '0 4px 14px rgba(79,70,229,0.35)', transition: 'all 0.15s',
                  letterSpacing: '-0.01em',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(79,70,229,0.45)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(79,70,229,0.35)'; e.currentTarget.style.transform = 'none' }}
              >
                End &amp; Report →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes waveBar {
          0%, 100% { height: 4px; opacity: 0.4; }
          50% { height: 22px; opacity: 1; }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ── Mobile: single-column interview room ── */
        @media (max-width: 768px) {
          .interview-ai-question-row {
            grid-template-columns: 1fr !important;
          }
          .interview-whiteboard {
            display: none !important;
          }
          .interview-monaco-wrapper {
            display: none !important;
          }
          /* Larger mic button on mobile */
          .interview-mic-btn {
            width: 64px !important;
            height: 64px !important;
          }
          /* Reduce page padding */
          .interview-room-page {
            padding: 8px 12px !important;
            gap: 10px !important;
          }
        }
      `}</style>
    </div>
  )
}
