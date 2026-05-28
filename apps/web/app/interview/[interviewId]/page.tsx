'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAppStore, InterviewPhase, TranscriptEntry, QuestionResponse } from '@/store/appStore'
import { Position } from '@/store/appStore'
import Whiteboard from '@/components/interview/Whiteboard'
import { Mic, MicOff, Code2, PenLine, Clock, AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react'

/* ── Web Speech API type shims ───────────────────────────────────── */
interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}
interface SpeechRecognitionResult {
  readonly length: number
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}
interface SpeechRecognitionResultList {
  readonly length: number
  [index: number]: SpeechRecognitionResult
}
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string
}
interface ISpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
}
interface ISpeechRecognitionConstructor {
  new(): ISpeechRecognition
}
declare global {
  interface Window {
    SpeechRecognition: ISpeechRecognitionConstructor
    webkitSpeechRecognition: ISpeechRecognitionConstructor
  }
}

/* ── Dynamic import for Monaco (browser only) ───────────────────── */
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
  const isDev = ['Python', 'Java', 'Spark', 'Kafka', 'AWS', 'Databricks', 'React', 'Node'].some((t) =>
    tech.map((x) => x.toLowerCase()).includes(t.toLowerCase())
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

/* ── Section labels ─────────────────────────────────────────────── */
const SECTION_LABEL: Record<string, string> = {
  technical:  'Technical',
  behavioral: 'Behavioral',
  scenario:   'Scenario',
  eq:         'Values',
  whiteboard: 'System Design',
}

const SECTION_COLOR: Record<string, string> = {
  technical:  '#7C3AED',
  behavioral: '#10B981',
  scenario:   '#8B5CF6',
  eq:         '#F59E0B',
  whiteboard: '#EC4899',
}

/* ── Timer format ───────────────────────────────────────────────── */
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

  /* ── Look up entities ─────────────────────────────────────── */
  const interview = interviews.find((i) => i.id === interviewId)
  const candidate = interview ? candidates.find((c) => c.id === interview.candidateId) : null
  const position  = interview ? positions.find((p) => p.id === interview.positionId) : null

  /* ── Core state ───────────────────────────────────────────── */
  const [phase, setPhaseState] = useState<InterviewPhase>('waiting')
  const [questions, setQuestions] = useState<LocalQuestion[]>([])
  const [currentQIdx, setCurrentQIdx] = useState(0)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [liveTranscript, setLiveTranscript] = useState('')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [micFailed, setMicFailed] = useState(false)
  const [textInputMode, setTextInputMode] = useState(false)
  const [textInputValue, setTextInputValue] = useState('')
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [, setQuestionResponses] = useState<QuestionResponse[]>([])
  const [runningScore, setRunningScore] = useState(0)
  const [showCode, setShowCode] = useState(false)
  const [showWhiteboard, setShowWhiteboard] = useState(false)
  const [codeContent, setCodeContent] = useState('')
  const [codeLanguage, setCodeLanguage] = useState('python')
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [messageFromRecruiter, setMessageFromRecruiter] = useState<string | null>(null)

  /* ── Refs (stable across renders for callbacks) ───────────── */
  const phaseRef          = useRef<InterviewPhase>('waiting')
  const questionsRef      = useRef<LocalQuestion[]>([])
  const currentQIdxRef    = useRef(0)
  const liveTranscriptRef = useRef('')
  const transcriptRef     = useRef<TranscriptEntry[]>([])
  const responsesRef      = useRef<QuestionResponse[]>([])
  const recognitionRef    = useRef<ISpeechRecognition | null>(null)
  const silenceTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const capturedRef       = useRef(false) // prevent double-capture per utterance
  const transcriptBoxRef  = useRef<HTMLDivElement>(null)

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
    // Scroll transcript box
    setTimeout(() => {
      if (transcriptBoxRef.current) {
        transcriptBoxRef.current.scrollTop = transcriptBoxRef.current.scrollHeight
      }
    }, 50)
  }, [appendTranscriptEntry])

  /* ── Mobile detection ─────────────────────────────────────── */
  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
  }, [])

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
      setTimeRemaining((prev) => {
        const next = prev - 1
        if (next <= 0) {
          clearInterval(timerIntervalRef.current!)
          if (phaseRef.current !== 'completed' && phaseRef.current !== 'closing') {
            handleTimeUp()
          }
          return 0
        }
        return next
      })
    }, 1000)

    return () => clearInterval(timerIntervalRef.current!)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase === 'waiting', phase === 'completed'])

  /* ── TTS ──────────────────────────────────────────────────── */
  const speakText = useCallback(async (text: string): Promise<void> => {
    setIsSpeaking(true)
    setPhase('speaking')

    if (process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY) {
      // Use ElevenLabs via server-side API route (key stays secret on server)
      try {
        const res = await fetch('/api/interview/generate-speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID,
          }),
        })
        const ct = res.headers.get('Content-Type') || ''
        if (ct.includes('audio/mpeg')) {
          const blob = await res.blob()
          const url  = URL.createObjectURL(blob)
          await new Promise<void>((resolve) => {
            const audio = new Audio(url)
            audio.onended = () => { URL.revokeObjectURL(url); resolve() }
            audio.onerror = () => { URL.revokeObjectURL(url); resolve() }
            audio.play().catch(() => resolve())
          })
          setIsSpeaking(false)
          return
        }
        // If we get here, ElevenLabs returned a non-audio response — fall through
      } catch (err) {
        console.warn('ElevenLabs TTS failed, falling back to browser TTS:', err)
      }
    }

    // Browser TTS fallback
    await new Promise<void>((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) { resolve(); return }
      window.speechSynthesis.cancel()
      const utt = new SpeechSynthesisUtterance(text)
      utt.rate   = 0.92
      utt.pitch  = 1.0
      utt.volume = 1.0
      utt.onend  = () => resolve()
      utt.onerror = () => resolve()
      window.speechSynthesis.speak(utt)
    })
    setIsSpeaking(false)
  }, [setPhase])

  /* ── STT ──────────────────────────────────────────────────── */
  const startListening = useCallback(() => {
    if (micFailed) { setTextInputMode(true); return }

    const SR: ISpeechRecognitionConstructor | undefined =
      window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { setMicFailed(true); setTextInputMode(true); return }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }

    const rec = new SR()
    rec.continuous      = true
    rec.interimResults  = true
    rec.lang            = 'en-US'
    capturedRef.current = false

    rec.onresult = (event: SpeechRecognitionEvent) => {
      const text = Array.from(event.results).map((r) => r[0].transcript).join(' ').trim()
      liveTranscriptRef.current = text
      setLiveTranscript(text)

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = setTimeout(() => {
        if (liveTranscriptRef.current.trim() && !capturedRef.current) {
          capturedRef.current = true
          captureResponse(liveTranscriptRef.current)
        }
      }, 3000)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micFailed, setPhase])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    setIsListening(false)
    setLiveTranscript('')
    liveTranscriptRef.current = ''
  }, [])

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

    const q = questionsRef.current[currentQIdxRef.current]
    if (!q) return

    addTranscript({ speaker: 'candidate', text: responseText, questionId: q.id, type: 'preset' })

    // Evaluate in background
    let ev: EvalResult = {
      score: 5, keyPointsCovered: [], keyPointsMissed: [],
      evaluatorNote: '', shouldAskFollowUp: false, generateDynamic: false,
      suggestedTransition: 'Thank you.',
    }
    try {
      const prevQ = transcriptRef.current
        .filter((t) => t.speaker === 'ai' && t.questionId)
        .slice(-3)
        .map((t) => ({ question: t.text, response: '' }))

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

    // Save response
    const qr: QuestionResponse = {
      questionId:       q.id,
      questionText:     q.question,
      questionType:     q.section,
      isPreset:         q.isPreset,
      candidateResponse: responseText,
      score:            Math.round((ev.score / 10) * 100),
      keyPointsCovered: ev.keyPointsCovered ?? [],
      keyPointsMissed:  ev.keyPointsMissed ?? [],
      evaluatorNote:    ev.evaluatorNote ?? '',
      timeSpent:        0,
    }
    const updatedResponses = [...responsesRef.current, qr]
    responsesRef.current = updatedResponses
    setQuestionResponses(updatedResponses)
    upsertQuestionResponse(qr)

    const avg = Math.round(updatedResponses.reduce((a, r) => a + r.score, 0) / updatedResponses.length)
    setRunningScore(avg)
    updateSessionScore(avg)

    // Decide next action
    if (ev.shouldAskFollowUp && ev.followUpQuestion) {
      const followUp = ev.followUpQuestion
      addTranscript({ speaker: 'ai', text: followUp, questionId: q.id, type: 'followup' })
      await speakText(followUp)
      startListening()
    } else {
      const transition = ev.suggestedTransition || ''
      if (transition && transition !== 'Thank you.') {
        addTranscript({ speaker: 'ai', text: transition, type: 'transition' })
      }
      await moveToQuestion(currentQIdxRef.current + 1)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopListening, setPhase, addTranscript, upsertQuestionResponse, updateSessionScore, speakText, position, startListening])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const moveToQuestion = useCallback(async (idx: number) => {
    const qs = questionsRef.current
    if (idx >= qs.length) {
      await startClosing()
      return
    }

    currentQIdxRef.current = idx
    setCurrentQIdx(idx)
    setPhase('questioning')

    const q = qs[idx]

    // Auto-open panels
    if (q.section === 'whiteboard') setShowWhiteboard(true)

    const preambles = [
      `Let us begin with a ${SECTION_LABEL[q.section]?.toLowerCase()} question.`,
      'Moving on.',
      'Next,',
      'Let us shift to another area.',
      '',
      'Here is my next question.',
    ]
    const preamble = idx === 0 ? preambles[0] : (preambles[1 + (idx % (preambles.length - 1))] || '')
    const fullText = preamble ? `${preamble} ${q.question}` : q.question

    addTranscript({ speaker: 'ai', text: fullText, questionId: q.id, type: 'preset' })
    await speakText(fullText)
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

    // Update store
    updateCandidate(interview?.candidateId ?? '', {
      status: 'completed',
      score: runningScore > 0 ? runningScore : 72,
    })
    if (interview) {
      updateInterview(interview.id, { status: 'completed', candidateJoined: true })
    }

    // Persist to localStorage
    try {
      localStorage.setItem(`ic_interview_${interviewId}_complete`, JSON.stringify({
        completedAt: new Date().toISOString(),
        transcript: transcriptRef.current,
        responses: responsesRef.current,
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

    // Init session in store
    setActiveSession({
      interviewId:             interviewId,
      candidateId:             interview.candidateId,
      positionId:              interview.positionId,
      phase:                   'intro',
      startedAt:               new Date().toISOString(),
      elapsedSeconds:          0,
      transcript:              [],
      questionResponses:       [],
      codeEditorContent:       '',
      codeEditorLanguage:      'python',
      runningScore:            0,
      currentQuestionIndex:    0,
      dynamicQuestionsGenerated: 0,
      candidateTabSwitches:    0,
    })

    updateInterview(interviewId, { status: 'in_progress', candidateJoined: true })

    setPhase('intro')

    const firstName = candidate.name.split(' ')[0]
    const intro =
      `Hi ${firstName}, I am Alex, your AI interviewer for today. ` +
      `We have ${duration} minutes together for the ${position.title} role at ${position.company}. ` +
      `I will ask you a mix of technical, scenario-based, and behavioural questions. ` +
      `Please speak clearly, take your time, and elaborate on your experience. ` +
      `Let us begin.`

    addTranscript({ speaker: 'ai', text: intro, type: 'intro' })
    await speakText(intro)
    await moveToQuestion(0)
  }, [
    candidate, position, interview, interviewId,
    setActiveSession, updateInterview, setPhase,
    addTranscript, speakText, moveToQuestion,
  ])

  /* ── Code editor sync ─────────────────────────────────────── */
  const handleCodeChange = (val: string | undefined) => {
    const v = val ?? ''
    setCodeContent(v)
    updateSessionCode(v, codeLanguage)
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

  /* Mobile warning */
  if (isMobile) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#4F46E5', padding: 32 }}>
        <div style={{ textAlign: 'center', color: '#fff', maxWidth: 340 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💻</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, marginBottom: 12 }}>
            Desktop Required
          </div>
          <div style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.6 }}>
            This interview is optimised for desktop. Please open this link on a laptop or desktop computer to begin.
          </div>
        </div>
      </div>
    )
  }

  /* Completed screen */
  if (phase === 'completed') {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <div style={{ textAlign: 'center', maxWidth: 480, padding: 40 }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>✅</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: '#4F46E5', marginBottom: 12 }}>
            Interview Complete
          </div>
          <div style={{ fontSize: 15, color: '#64748B', lineHeight: 1.7 }}>
            Thank you, {candidate.name.split(' ')[0]}. Your interview has been submitted successfully. The team at {position.company} will review your evaluation and be in touch with next steps.
          </div>
          <div style={{ marginTop: 32, padding: '14px 24px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)', borderRadius: 12, color: '#059669', fontSize: 13, fontWeight: 600 }}>
            You may now close this window.
          </div>
        </div>
      </div>
    )
  }

  /* Waiting / start screen */
  if (phase === 'waiting') {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', background: '#F8FAFC', gap: 32,
      }}>
        {/* Logo */}
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: '#4F46E5', letterSpacing: '-0.025em' }}>
          Interview<span style={{ color: '#7C3AED' }}>Central</span>
        </div>

        <div style={{ textAlign: 'center', maxWidth: 520, padding: '40px 48px', background: '#fff', borderRadius: 20, border: '1px solid #E2E8F0', boxShadow: '0 4px 24px rgba(79,70,229,0.08)' }}>
          {/* AI Avatar */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
            background: 'linear-gradient(135deg, #4F46E5, #4338CA)',
            border: '3px solid #7C3AED',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Mic size={32} color="#7C3AED" />
          </div>

          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: '#4F46E5', marginBottom: 8 }}>
            Your Interview is Ready
          </div>
          <div style={{ fontSize: 14, color: '#64748B', marginBottom: 4 }}>
            {position.title} · {position.company}
          </div>
          <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 28 }}>
            Duration: {position.interviewDuration ?? 30} minutes · AI Interviewer: Alex
          </div>

          <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.7, marginBottom: 28, padding: '14px 16px', background: '#F8FAFC', borderRadius: 10 }}>
            <strong>Before you start:</strong> ensure you are in a quiet place, your microphone is working, and you have a stable internet connection. Speak clearly and take your time with each answer.
          </div>

          <button
            onClick={startInterview}
            style={{
              width: '100%', padding: '14px 0',
              background: 'linear-gradient(135deg, #4F46E5, #4338CA)',
              color: '#fff', border: 'none', borderRadius: 12,
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              letterSpacing: '-0.01em',
            }}
          >
            Start Interview →
          </button>

          <div style={{ marginTop: 14, fontSize: 12, color: '#94A3B8' }}>
            By starting, you consent to this interview being recorded and evaluated.
          </div>
        </div>
      </div>
    )
  }

  /* ── Active interview UI ───────────────────────────────────── */
  const currentQ  = questions[currentQIdx]
  const timerColor = timeRemaining <= 120 ? '#DC2626' : timeRemaining <= 300 ? '#D97706' : '#4F46E5'

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F0F4F8', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', height: 56, background: '#fff',
        borderBottom: '1px solid #E2E8F0', flexShrink: 0,
      }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: '#4F46E5', letterSpacing: '-0.02em' }}>
          Interview<span style={{ color: '#7C3AED' }}>Central</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#64748B', textAlign: 'center' }}>
          {candidate.name} · {position.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} color={timerColor} />
            <span className="font-mono" style={{ fontSize: 15, fontWeight: 800, color: timerColor, letterSpacing: '0.05em' }}>
              {fmt(timeRemaining)}
            </span>
          </div>
          <button
            onClick={() => setShowEndConfirm(true)}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: '1px solid #FCA5A5', background: 'rgba(239,68,68,0.06)', color: '#DC2626', cursor: 'pointer',
            }}
          >
            End Interview
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflow: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Recruiter message banner */}
        {messageFromRecruiter && (
          <div style={{
            padding: '10px 16px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#92400E',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>📋 {messageFromRecruiter}</span>
            <button onClick={() => setMessageFromRecruiter(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400E' }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── AI + Question row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 16, alignItems: 'start' }}>

          {/* AI Interviewer Panel */}
          <div style={{
            background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0',
            padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          }}>
            {/* Avatar */}
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
              border: `3px solid ${isSpeaking ? '#7C3AED' : '#4338CA'}`,
              boxShadow: isSpeaking ? '0 0 0 6px rgba(124,58,237,0.15)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.4s ease',
            }}>
              <Mic size={28} color={isSpeaking ? '#7C3AED' : '#94A3B8'} />
            </div>

            {/* Waveform */}
            <div style={{ height: 24, display: 'flex', alignItems: 'center', gap: 3 }}>
              {Array.from({ length: 7 }, (_, i) => (
                <div
                  key={i}
                  style={{
                    width: 4, borderRadius: 2,
                    background: isSpeaking ? '#7C3AED' : isListening ? '#10B981' : '#CBD5E1',
                    height: (isSpeaking || isListening) ? undefined : '4px',
                    animation: (isSpeaking || isListening)
                      ? `waveBar 1.1s ease-in-out ${i * 0.13}s infinite`
                      : undefined,
                  }}
                />
              ))}
            </div>

            {/* Status */}
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textAlign: 'center', letterSpacing: '0.03em' }}>
              {phase === 'listening'    ? '● LISTENING'
               : phase === 'processing' ? '⟳ THINKING'
               : phase === 'speaking'   ? '◈ SPEAKING'
               : phase === 'intro'      ? '◈ SPEAKING'
               : 'WAITING'}
            </div>

            <div style={{ fontSize: 11, color: '#CBD5E1', textAlign: 'center', fontWeight: 600 }}>
              Alex · AI Interviewer
            </div>
          </div>

          {/* Current question card */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {currentQ ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 100,
                    background: `${SECTION_COLOR[currentQ.section]}15`,
                    border: `1px solid ${SECTION_COLOR[currentQ.section]}30`,
                    color: SECTION_COLOR[currentQ.section],
                    letterSpacing: '0.06em',
                  }}>
                    {SECTION_LABEL[currentQ.section]?.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>
                    Question {currentQIdx + 1} of {questions.length}
                  </span>
                  <span style={{
                    marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#64748B',
                    background: '#F1F5F9', padding: '2px 8px', borderRadius: 4, letterSpacing: '0.04em',
                  }}>
                    {currentQ.isPreset ? 'PRESET' : 'DYNAMIC'}
                  </span>
                </div>
                <p style={{ fontSize: 16, fontWeight: 600, color: '#4F46E5', lineHeight: 1.65, margin: 0 }}>
                  {currentQ.question}
                </p>
                {currentQ.section === 'whiteboard' && (
                  <div style={{ fontSize: 12, color: '#8B5CF6', fontWeight: 600 }}>
                    ✏️ Use the whiteboard below to sketch your answer
                  </div>
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
            {isListening ? (
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

          {/* Live transcript */}
          <div
            ref={transcriptBoxRef}
            style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}
          >
            {transcript.slice(-4).map((entry) => (
              <div key={entry.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, minWidth: 60, paddingTop: 2,
                  color: entry.speaker === 'ai' ? '#7C3AED' : '#10B981',
                  letterSpacing: '0.04em',
                }}>
                  {entry.speaker === 'ai' ? 'ALEX' : 'YOU'}
                </span>
                <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.55 }}>
                  {entry.text}
                </span>
              </div>
            ))}
            {liveTranscript && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 10, fontWeight: 700, minWidth: 60, paddingTop: 2, color: '#10B981', letterSpacing: '0.04em' }}>
                  YOU
                </span>
                <span style={{ fontSize: 13, color: '#64748B', fontStyle: 'italic', lineHeight: 1.55 }}>
                  {liveTranscript}
                </span>
              </div>
            )}
          </div>

          {/* Text input fallback */}
          {(textInputMode || micFailed) && phase === 'listening' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <textarea
                value={textInputValue}
                onChange={(e) => setTextInputValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) submitTextInput() }}
                placeholder="Type your response here… (⌘+Enter to submit)"
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #E2E8F0',
                  fontSize: 13, lineHeight: 1.5, resize: 'vertical', minHeight: 72,
                  fontFamily: 'var(--font-sans)', outline: 'none', color: '#334155',
                }}
              />
              <button
                onClick={submitTextInput}
                disabled={!textInputValue.trim()}
                style={{
                  padding: '0 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: textInputValue.trim() ? '#4F46E5' : '#E2E8F0',
                  color: textInputValue.trim() ? '#fff' : '#94A3B8',
                  fontSize: 13, fontWeight: 700, transition: 'all 0.15s',
                }}
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
                  <div style={{
                    height: 5, borderRadius: 3,
                    background: done ? color : current ? `${color}55` : '#E2E8F0',
                    transition: 'all 0.4s ease',
                  }} />
                  <div style={{ fontSize: 9, fontWeight: 700, color: done ? color : current ? color : '#CBD5E1', letterSpacing: '0.04em', textAlign: 'center' }}>
                    {done ? '✓' : SECTION_LABEL[q.section]?.slice(0, 4).toUpperCase()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Code Editor panel ── */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <button
            onClick={() => setShowCode((v) => !v)}
            style={{
              width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              borderBottom: showCode ? '1px solid #E2E8F0' : 'none',
            }}
          >
            <Code2 size={14} color="#64748B" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Code Editor</span>
            {showCode ? <ChevronUp size={14} color="#94A3B8" style={{ marginLeft: 'auto' }} />
                       : <ChevronDown size={14} color="#94A3B8" style={{ marginLeft: 'auto' }} />}
          </button>
          {showCode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {/* Language selector */}
              <div style={{ padding: '8px 12px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>Language:</span>
                {['python', 'javascript', 'typescript', 'java', 'sql', 'go'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setCodeLanguage(lang)}
                    style={{
                      padding: '3px 10px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                      background: codeLanguage === lang ? '#4F46E5' : 'transparent',
                      color: codeLanguage === lang ? '#fff' : '#64748B',
                    }}
                  >
                    {lang}
                  </button>
                ))}
              </div>
              <MonacoEditor
                height={260}
                language={codeLanguage}
                theme="vs-dark"
                value={codeContent}
                onChange={handleCodeChange}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  wordWrap: 'on',
                  padding: { top: 12, bottom: 12 },
                }}
              />
              <div style={{ padding: '8px 12px', background: '#1E1E1E', borderTop: '1px solid #333', display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  style={{ padding: '4px 14px', borderRadius: 5, border: 'none', cursor: 'pointer', background: '#10B981', color: '#fff', fontSize: 12, fontWeight: 700 }}
                  onClick={() => {/* mock run */}}
                >
                  ▶ Run
                </button>
                <span style={{ fontSize: 11, color: '#4EC9B0', fontFamily: 'monospace' }}>
                  {'// Output will appear here — explain your code verbally'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Whiteboard panel ── */}
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <button
            onClick={() => setShowWhiteboard((v) => !v)}
            style={{
              width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              borderBottom: showWhiteboard ? '1px solid #E2E8F0' : 'none',
            }}
          >
            <PenLine size={14} color="#64748B" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Whiteboard</span>
            {showWhiteboard ? <ChevronUp size={14} color="#94A3B8" style={{ marginLeft: 'auto' }} />
                             : <ChevronDown size={14} color="#94A3B8" style={{ marginLeft: 'auto' }} />}
          </button>
          {showWhiteboard && (
            <Whiteboard onExport={handleWhiteboardExport} />
          )}
        </div>
      </main>

      {/* ── End confirm modal ── */}
      {showEndConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(79,70,229,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
        }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '32px 36px', maxWidth: 360, textAlign: 'center', boxShadow: '0 20px 60px rgba(79,70,229,0.2)' }}>
            <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: '#4F46E5', marginBottom: 8 }}>
              End Interview?
            </div>
            <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: 24 }}>
              This will end your interview session. Your responses so far will be submitted for evaluation.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowEndConfirm(false)}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
              >
                Continue
              </button>
              <button
                onClick={() => { setShowEndConfirm(false); stopListening(); startClosing() }}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#DC2626', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
              >
                End Now
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
      `}</style>
    </div>
  )
}
