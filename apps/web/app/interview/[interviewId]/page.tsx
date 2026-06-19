'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAppStore, InterviewPhase, TranscriptEntry, QuestionResponse } from '@/store/appStore'
import { Position } from '@/store/appStore'
import Whiteboard from '@/components/interview/Whiteboard'
import { AIVisualizer } from '@/components/interview/AIVisualizer'
import { Mic, MicOff, Code2, PenLine, Clock, AlertTriangle, X, Loader2 } from 'lucide-react'
import { IntegrityMonitor } from '@/components/interviews/IntegrityMonitor'
import { DemoSalesCTA } from '@/components/interviews/DemoSalesCTA'
import { detectTerminationIntent } from '@/lib/screen/session/termination'
import { TERMINATION_REASONS, TerminationReason } from '@/lib/screen/session/lifecycle'
import { ScribeStt, DEFAULT_KEYTERMS } from '@/lib/screen/interview/scribe-stt'
import { buildSessionContext, buildOpener, buildTransition } from '@/lib/screen/session/persona'
import { LIKERT_OPTIONS, type LikertItem } from '@/lib/screen/session/culture-fit'
import { PRODUCTION_INTERVIEW_MINUTES } from '@/lib/screen/session/duration'

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

// Diagnostic fix: end-of-turn endpointing. Was a fixed 3000ms — ~3s of dead air
// every turn, the single biggest source of perceived "robotic" lag. 1500ms still
// tolerates a thinking pause (the timer resets on each new interim transcript)
// but responds far more promptly. Env-tunable for further tuning.
const RESPONSE_ENDPOINT_MS = Math.max(700, Number(process.env.NEXT_PUBLIC_RESPONSE_ENDPOINT_MS) || 1500)

/* ── Keyword trigger lists (checked before calling Claude) ───────── */
// Candidate asking about fit/suitability → redirect and continue
const REDIRECT_TRIGGERS = [
  'am i right for', 'am i a good fit', 'do i qualify',
  'what do you think of me', 'how am i doing', 'am i doing well',
  'am i the right', 'would i be a good', 'am i suitable',
  'am i selected', 'did i get', 'did i pass', 'do i get the job',
  'do you think i', 'will i get', 'have i been selected', 'am i hired',
  'my chances', 'did i do well', 'did i do good',
] as const

// Candidate asking to repeat/clarify the question
const REPEAT_TRIGGERS = [
  'can you repeat', 'say that again', 'what was the question',
  'could you repeat', 'pardon', 'sorry what', 'come again',
  'what do you mean', "i don't understand", "i dont understand",
] as const

// Candidate is STUCK → ONE diluted/guided follow-up, then move on (Fix 1).
// Broad coverage so a genuine "I'm stuck" never falls through to 3x drilling.
const DONT_KNOW_TRIGGERS = [
  "i don't know", "i dont know", "i don't really know", "no idea", "no clue",
  "not sure about this", "i have no idea", "i'm not sure", "im not sure",
  "not really sure", "can't recall", "cannot recall", "can't remember",
  "cannot remember", "don't remember", "can't think", "cannot think",
  "unable to think", "can't think of", "drawing a blank", "blanking",
  "i forget", "i forgot", "my mind is blank", "i'm blanking", "im blanking",
  "i'm stuck", "im stuck", "not coming to me", "can't say",
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
  const router = useRouter()
  const interviewId = params.interviewId as string

  const {
    interviews, candidates, positions,
    setActiveSession, updateSessionPhase, appendTranscriptEntry,
    upsertQuestionResponse, updateSessionScore, updateSessionCode,
    updateSessionWhiteboard, incrementTabSwitch, updateCandidate, updateInterview,
    addReport,
  } = useAppStore()

  // ── Try store first; fall back to DB load ──────────────────
  const interview = interviews.find(i => i.id === interviewId)
  const candidate = interview ? candidates.find(c => c.id === interview.candidateId) : null
  const position  = interview ? positions.find(p => p.id === interview.positionId) : null

  const [dbLoading, setDbLoading] = useState(!interview)
  const [dbError,   setDbError]   = useState('')

  // When the store doesn't have the interview (recruiter opened a direct URL or
  // candidate joined), load from DB and hydrate the store.
  useEffect(() => {
    if (interview && candidate && position) { setDbLoading(false); return }
    if (!interviewId) { setDbLoading(false); return }

    fetch(`/api/interviews/${interviewId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((data) => {
        // Hydrate store so the rest of the component works normally
        const { updateInterview, addInterview } = useAppStore.getState()
        const iv = {
          id:            data.id,
          candidateId:   data.candidateId,
          candidateName: data.candidate?.name  ?? '',
          positionId:    data.positionId,
          positionTitle: data.position?.title   ?? '',
          scheduledAt:   data.scheduledAt ?? data.createdAt,
          duration:      data.duration ?? PRODUCTION_INTERVIEW_MINUTES,
          status:        data.status,
          agentOnline:   data.agentOnline ?? false,
          candidateJoined: data.candidateJoined ?? false,
          score:         data.runningScore ?? undefined,
          isDemo:        !!data.isDemo,
        }
        isDemoRef.current = !!data.isDemo  // Build 05: demo runs must not bill usage
        setConsentOk(!!data.consentGiven || !!data.isDemo)  // I-P0-1 soft consent gate
        const existsInStore = useAppStore.getState().interviews.find(i => i.id === interviewId)
        if (existsInStore) { updateInterview(interviewId, iv) } else { addInterview(iv) }

        // Hydrate candidate + position if missing
        const { candidates: cs, positions: ps, addCandidates, setPositions } = useAppStore.getState()
        if (data.candidate && !cs.find(c => c.id === data.candidateId)) {
          addCandidates([{
            id: data.candidateId, name: data.candidate.name, email: data.candidate.email,
            positionId: data.positionId, positionTitle: data.position?.title ?? '',
            status: data.candidate.status ?? 'scheduled', uploadedAt: data.candidate.uploadedAt ?? '',
            topSkills: data.candidate.topSkills ?? [],
            interviewId: data.id, isDemo: !!data.isDemo,
          }])
        }
        if (data.position && !ps.find(p => p.id === data.positionId)) {
          setPositions([...useAppStore.getState().positions, {
            id: data.positionId, title: data.position.title, company: data.position.company,
            department: data.position.department ?? '', experienceLevel: data.position.experienceLevel ?? '',
            techStack: data.position.techStack ?? [], status: data.position.status ?? 'active',
            interviewsScheduled: 0, interviewsCompleted: 0, createdAt: data.position.createdAt ?? '',
            approvals: { techLead: data.position.techLeadApproved, hr: data.position.hrApproved },
            interviewDuration: data.position.interviewDuration ?? PRODUCTION_INTERVIEW_MINUTES, isDemo: !!data.isDemo,
          }])
        }
        setDbLoading(false)
      })
      .catch((err) => {
        console.error('[interview room] DB load failed:', err)
        setDbError('Interview not found. Please check your link.')
        setDbLoading(false)
      })
  // Only run on mount — subsequent store updates handle everything
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId])

  // Demo hygiene: a demo run must never linger in a (possibly logged-in) agency's
  // session. On leaving the tab, kill the demo data server-side (ephemeral); on
  // unmount, purge it from the local store so it can't show in the candidates UI.
  useEffect(() => {
    const onLeave = () => {
      if (!isDemoRef.current) return
      try { navigator.sendBeacon('/api/demo/cleanup', new Blob([JSON.stringify({ interviewId })], { type: 'text/plain' })) } catch {}
    }
    window.addEventListener('pagehide', onLeave)
    return () => {
      window.removeEventListener('pagehide', onLeave)
      if (isDemoRef.current) useAppStore.getState().purgeDemoData()
    }
  }, [interviewId])

  /* ── State ────────────────────────────────────────────────── */
  const [phase, setPhaseState]       = useState<InterviewPhase>('waiting')
  const [questions, setQuestions]    = useState<LocalQuestion[]>([])
  const [currentQIdx, setCurrentQIdx] = useState(0)
  const [transcript, setTranscript]  = useState<TranscriptEntry[]>([])
  const [liveTranscript, setLiveTranscript] = useState('')
  // Auto-tour (before the first question): which area is highlighted + active flag.
  const [tourHighlight, setTourHighlight] = useState<string | null>(null)
  const [tourActive, setTourActive] = useState(false)
  const tourSkipRef = useRef(false)
  // Likert culture-fit segment (Build 08): runs after the Q&A, before closing.
  const [cultureFitActive, setCultureFitActive] = useState(false)
  const [cultureFitItems, setCultureFitItems] = useState<LikertItem[]>([])
  const [cultureFitAnswers, setCultureFitAnswers] = useState<Record<string, { value: number; label: string }>>({})
  const cultureFitDoneRef = useRef(false)  // one-shot guard
  const [listeningHint, setListeningHint]   = useState('')
  const [isWarmingUp, setIsWarmingUp]       = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [micFailed, setMicFailed]    = useState(false)
  const [textInputMode, setTextInputMode]   = useState(false)
  const [sttWarning, setSttWarning]  = useState<string | null>(null)  // bugfix: "I can't hear you" banner
  const [textInputValue, setTextInputValue] = useState('')
  const [timeRemaining, setTimeRemaining]   = useState(0)
  const [, setQuestionResponses]     = useState<QuestionResponse[]>([])
  const [runningScore, setRunningScore] = useState(0)
  // Permanent editor pane: which tab is active. Both tabs stay mounted so work is
  // retained when switching (Monaco keeps codeContent; whiteboard keeps its canvas).
  const [editorTab, setEditorTab] = useState<'code' | 'whiteboard'>('code')
  const [waitingWhiteboard, setWaitingWhiteboard] = useState(false) // Fix 2
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
  const dgSttRef          = useRef<ScribeStt | null>(null)  // ElevenLabs Scribe v2 Realtime STT
  const sttPreferWebSpeechRef = useRef(false)    // once Scribe fails, skip it for the session
  // Interview-long mic recording for post-interview fraud diarization (Scribe batch).
  const fraudRecorderRef  = useRef<MediaRecorder | null>(null)
  const fraudStreamRef    = useRef<MediaStream | null>(null)
  const fraudChunksRef    = useRef<Blob[]>([])
  const fraudUploadedRef  = useRef(false)
  const aiSpeakingRef     = useRef(false)        // bugfix: true while Alex's TTS plays — drop mic echo
  const noInputStrikesRef = useRef(0)            // bugfix: consecutive silent turns → mic warning, never end
  const candidateSpokeRef = useRef(false)        // bugfix: any captured candidate speech this session?
  const silenceTimersRef  = useRef<ReturnType<typeof setTimeout>[]>([])
  const timerIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const capturedRef       = useRef(false)
  const hasSpokenRef      = useRef(false)
  const rephraseCountRef      = useRef(0)
  const redirectGivenRef      = useRef(false)    // irrelevance redirect given this question
  const shortAnswerAskedRef   = useRef(false)    // follow-up for short answer already asked
  const stuckActiveRef        = useRef(false)    // Bug A: gave the one diluted hint; next weak reply → move on
  const followUpCountRef      = useRef(0)        // I-P0-3: follow-ups asked on this question (cap 3)
  const awaitingMoveOnChoiceRef = useRef(false)  // waiting for candidate's "more time or move on" reply
  const terminationAskedRef = useRef(false)      // candidate already asked to confirm end (Build 01-B1)
  const wrapUpFiredRef = useRef(false)           // one-shot wrap-up guard — closing fires exactly once (Build 01-B2)
  // ── Warm-up arc (Build 03) — routes brief small-talk replies away from the
  // question pipeline and suppresses the question cold-start timers while active.
  const warmupActiveRef = useRef(false)
  const warmupCaptureRef = useRef<((text: string) => void) | null>(null)
  const isDemoRef = useRef(false)  // demo-gallery run (Build 05) — never bills usage
  const [consentOk, setConsentOk] = useState(false)  // soft consent gate before start (I-P0-1)
  // ── T2 content-analysis capture (Build 02) — per-question answer telemetry ──
  const codeContentRef = useRef('')
  const questionStartRef = useRef<number>(Date.now())  // when current question was shown
  const firstKeystrokeRef = useRef<number | null>(null) // first editor input time
  const speechStartedAtRef = useRef<number | null>(null) // first SPOKEN word of this turn (overlay-on-voice latency)
  const pasteStatsRef = useRef<{ largest: number; total: number; count: number; typed: number }>({ largest: 0, total: 0, count: 0, typed: 0 })
  const resetAnswerTelemetry = useCallback(() => {
    questionStartRef.current = Date.now()
    firstKeystrokeRef.current = null
    speechStartedAtRef.current = null
    pasteStatsRef.current = { largest: 0, total: 0, count: 0, typed: 0 }
    codeContentRef.current = ''
  }, [])
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
    // Always cancel previous audio before starting new (Fix 4)
    stopAllAudio()

    // Fix 4: Sanitize text — remove non-ASCII chars that cause gibberish
    const cleanText = text
      .replace(/[^\x20-\x7E\n]/g, ' ')  // strip non-printable / non-ASCII
      .replace(/\s+/g, ' ')
      .trim()

    if (!cleanText || cleanText.length < 2) {
      console.warn('[speakText] Empty or invalid text, skipping')
      return
    }
    console.log('[speakText] Speaking:', cleanText.slice(0, 80))

    if (!isMountedRef.current) return
    setPhase('speaking')
    // Echo guard: while Alex speaks, the mic may transcribe his own TTS. Mark it
    // so the recognizer drops those captures (prevents the false-termination loop
    // where "…end the interview…" gets re-heard and treated as candidate intent).
    aiSpeakingRef.current = true

    // Diagnostic fix: ALWAYS attempt ElevenLabs via the server route (which holds
    // ELEVENLABS_API_KEY). The old client-side gate on NEXT_PUBLIC_ELEVENLABS_API_KEY
    // meant that if only the server key was set, every interview silently fell back
    // to robotic browser speechSynthesis. The route returns non-audio if unconfigured,
    // and we still fall through to browser TTS below as a last resort.
    {
      try {
        // 8-second timeout — fall through to browser TTS on timeout
        const controller = new AbortController()
        const timeout    = setTimeout(() => controller.abort(), 8000)
        const res = await fetch('/api/interview/generate-speech', {
          signal:  controller.signal,
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: cleanText, voiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID }),
        })
        clearTimeout(timeout)
        if (!isMountedRef.current) return
        const ct = res.headers.get('Content-Type') || ''
        if (ct.includes('audio/mpeg')) {
          const blob = await res.blob()
          if (!isMountedRef.current) return
          const url = URL.createObjectURL(blob)
          await new Promise<void>((resolve) => {
            const audio = new Audio(url)
            audioRef.current = audio
            audio.onended = () => { URL.revokeObjectURL(url); audioRef.current = null; resolve() }
            audio.onerror = () => { URL.revokeObjectURL(url); audioRef.current = null; resolve() }
            audio.play().catch(() => { audioRef.current = null; resolve() })
          })
          // Brief grace so the tail/echo of the last words isn't captured as speech.
          setTimeout(() => { aiSpeakingRef.current = false }, 500)
          return
        }
        const bodyText = await res.text().catch(() => '(unreadable)')
        console.warn('[speakText] Non-audio response:', bodyText)
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          console.warn('[speakText] ElevenLabs timeout — falling back to browser TTS')
        } else {
          console.warn('[speakText] fetch threw:', err)
        }
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
    setTimeout(() => { aiSpeakingRef.current = false }, 500)  // clear echo guard (TTS fallback path)
  }, [setPhase, stopAllAudio])

  /* ── STT ──────────────────────────────────────────────────── */
  // Stop whichever recognizer is currently active (Deepgram or Web Speech).
  const stopActiveRecognizer = useCallback(() => {
    if (recognitionRef.current) { try { recognitionRef.current.stop() } catch {} recognitionRef.current = null }
    if (dgSttRef.current)       { try { dgSttRef.current.stop() }       catch {} dgSttRef.current = null }
  }, [])

  const startListening = useCallback(() => {
    // Never re-open the mic once the interview has wrapped up (time-up / termination
    // / closing) — stops an in-flight question flow from reviving after Fix 3.
    if (wrapUpFiredRef.current || phaseRef.current === 'closing' || phaseRef.current === 'completed') return
    if (micFailed) { setTextInputMode(true); return }

    // Reset per-listen state (shared by Deepgram + Web Speech fallback)
    clearSilenceTimers()
    stopActiveRecognizer()
    hasSpokenRef.current = false
    capturedRef.current  = false
    setListeningHint('')
    playChime()  // soft chime → signals mic is live

    // Shared end-of-turn capture. During the warm-up arc, route to its handler.
    const captureNow = (text: string) => {
      // Echo guard: drop anything captured while Alex is speaking — it's his own
      // TTS bleeding into the mic, never candidate intent. This is what stops the
      // false-termination loop (his "…end the interview…" being re-heard as a request).
      if (aiSpeakingRef.current) { liveTranscriptRef.current = ''; setLiveTranscript(''); return }
      if (!text.trim() || capturedRef.current) return
      capturedRef.current = true
      candidateSpokeRef.current = true   // genuine candidate input captured this session
      noInputStrikesRef.current = 0      // reset the silence counter
      const warmupCb = warmupCaptureRef.current
      if (warmupCb) warmupCb(text)
      else captureResponse(text)
    }

    // ── Web Speech fallback — only if Deepgram can't start (no key, mic denied,
    //    unsupported browser). Keeps the fixed-timer endpointing it always had. ──
    const runWebSpeech = () => {
      const SR: ISpeechRecognitionConstructor | undefined =
        window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SR) { setMicFailed(true); setTextInputMode(true); return }
      const rec = new SR()
      rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US'
      rec.onresult = (event: SpeechRecognitionEvent) => {
        if (aiSpeakingRef.current) return  // echo guard — ignore Alex's own voice
        const text = Array.from(event.results).map(r => r[0].transcript).join(' ').trim()
        liveTranscriptRef.current = text
        setLiveTranscript(text)
        if (text) {
          hasSpokenRef.current = true
          if (speechStartedAtRef.current === null) speechStartedAtRef.current = Date.now()
          setListeningHint('')
          clearSilenceTimers()
          const captureTimer = setTimeout(() => captureNow(liveTranscriptRef.current), RESPONSE_ENDPOINT_MS)
          silenceTimersRef.current = [captureTimer]
        }
      }
      rec.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setMicFailed(true); setTextInputMode(true)
        }
      }
      recognitionRef.current = rec
      try { rec.start() } catch {}
    }

    if (sttPreferWebSpeechRef.current) {
      // Scribe already failed this session (token/mic). Don't re-hit the token
      // route every turn; use Web Speech directly for the rest of the interview.
      runWebSpeech()
    } else {
      // ── ElevenLabs Scribe v2 Realtime (primary) ──
      //   VAD commit handles endpointing (tuned NOT to cut off mid-sentence);
      //   committed_transcript → onUtteranceEnd. Keyterms bias control + tech words.
      const keyterms = [...DEFAULT_KEYTERMS, ...((position?.techStack ?? []) as string[])]
      const dg = new ScribeStt({
        onInterim: (text) => {
          if (aiSpeakingRef.current) return  // echo guard — ignore Alex's own voice
          liveTranscriptRef.current = text
          setLiveTranscript(text)
          if (text) { hasSpokenRef.current = true; if (speechStartedAtRef.current === null) speechStartedAtRef.current = Date.now(); setListeningHint(''); clearSilenceTimers() }
        },
        onUtteranceEnd: (text) => captureNow(text),
      }, {
        languageCode: process.env.NEXT_PUBLIC_SCRIBE_LANGUAGE ?? 'en',
        keyterms,
        vadSilenceSecs: Number(process.env.NEXT_PUBLIC_SCRIBE_VAD_SILENCE_SECS) || 2.0,
      })
      dgSttRef.current = dg
      dg.start().then((ok) => {
        if (!ok && dgSttRef.current === dg && !capturedRef.current && phaseRef.current === 'listening') {
          sttPreferWebSpeechRef.current = true  // stop retrying Scribe this session
          dgSttRef.current = null
          runWebSpeech()
        }
      })
    }

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
      if (warmupActiveRef.current) return  // warm-up manages its own silence (Build 03)
      if (hasSpokenRef.current || capturedRef.current || phaseRef.current !== 'listening') return
      clearSilenceTimers()   // prevent t20/t30 from also firing this invocation
      setListeningHint('')
      stopActiveRecognizer()
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
      if (warmupActiveRef.current) return  // warm-up manages its own silence (Build 03)
      if (hasSpokenRef.current || capturedRef.current || phaseRef.current !== 'listening') return
      clearSilenceTimers()
      setListeningHint('')
      stopActiveRecognizer()
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
      if (warmupActiveRef.current) return  // warm-up manages its own silence (Build 03)
      if (hasSpokenRef.current || capturedRef.current || phaseRef.current !== 'listening') return
      clearSilenceTimers()
      awaitingMoveOnChoiceRef.current = false
      setListeningHint('')
      stopActiveRecognizer()
      setIsListening(false)

      // Silence is NEVER consent to end (Build 01). If the candidate hasn't spoken
      // at all this session, treat persistent silence as a likely mic/STT failure:
      // warn them and open the text box — but keep going, don't terminate.
      noInputStrikesRef.current += 1
      if (!candidateSpokeRef.current && noInputStrikesRef.current >= 2) {
        const warn = "I'm not hearing anything yet — please check that your microphone is on and that you've allowed mic access in your browser. You can also type your answer in the box below."
        setSttWarning('We can’t hear you. Check your microphone / mic permissions, or type your answer below.')
        setTextInputMode(true)
        addTranscript({ speaker: 'ai', text: warn, type: 'transition' })
        await speakText(warn)
        const phaseAfterWarn = phaseRef.current as string
        if (phaseAfterWarn !== 'completed' && phaseAfterWarn !== 'closing') { await delay(1200); startListening() }
        return
      }

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
    stopActiveRecognizer()
    clearSilenceTimers()
    setIsListening(false)
    setLiveTranscript('')
    setListeningHint('')
    liveTranscriptRef.current = ''
  }, [clearSilenceTimers, stopActiveRecognizer])

  /* ── Submit text input (fallback) ─────────────────────────── */
  const submitTextInput = useCallback(() => {
    const text = textInputValue.trim()
    if (!text) return
    setTextInputValue('')
    capturedRef.current = true
    candidateSpokeRef.current = true   // typed input is genuine input
    noInputStrikesRef.current = 0
    setSttWarning(null)
    captureResponse(text)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textInputValue])

  /* ── Submit code-editor answer ────────────────────────────── */
  // Lets the candidate explicitly submit what they wrote/drew in the code editor
  // as their answer (instead of having to also say something out loud). The
  // editor content is already the preferred source for T2 integrity analysis.
  const submitCodeAnswer = useCallback(() => {
    const code = codeContentRef.current.trim()
    if (!code || phaseRef.current !== 'listening' || capturedRef.current) return
    capturedRef.current = true
    captureResponse(code)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Core interview flow ───────────────────────────────────── */

  // Fix 3: phrases that mean "no experience" — accept and move on immediately
  const NO_EXPERIENCE_PHRASES = [
    "don't have experience", "no experience", "haven't worked",
    "not worked on", "never worked", "not familiar", "never used",
    "haven't used", "haven't done", "never done", "not applicable",
    "don't know that", "no knowledge", "haven't heard",
  ]

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const captureResponse = useCallback(async (responseText: string) => {
    // Hard stop: once the interview has wrapped up (terminated/closed), never
    // process another capture — this is what was letting the flow march on to the
    // next question AFTER "we'll end the interview here" (the self-restart symptom).
    if (wrapUpFiredRef.current) return
    // Echo guard (belt-and-suspenders): drop captures that land while Alex speaks.
    if (aiSpeakingRef.current) return
    stopListening()
    setPhase('processing')
    setLiveTranscript('')
    setListeningHint('')

    const q = questionsRef.current[currentQIdxRef.current]
    if (!q) return

    const lower = responseText.toLowerCase().trim()

    // ── 0a. Explicit termination intent (Build 01-B1) ────────────────
    // Honor it immediately — never substitute the canned end-of-flow closing.
    // Consent withdrawal is a hard stop; a plain end-request confirms once.
    const termination = detectTerminationIntent(responseText, { repeated: terminationAskedRef.current })
    if (termination) {
      addTranscript({ speaker: 'candidate', text: responseText, questionId: q.id, type: 'preset' })
      if (termination.kind === 'consent_withdrawal' || termination.immediate) {
        await endByTermination(termination.reason)
      } else {
        terminationAskedRef.current = true
        await handleEndInterviewRequest()
      }
      return
    }

    // ── T2 content-analysis (Build 02) — fire-and-forget on a substantive answer.
    // Prefer the code editor answer (paste/latency live there); else a long spoken one.
    const t2Answer = codeContentRef.current.trim() || responseText
    if (t2Answer && t2Answer.length >= 40) {
      runIntegrityAnalysis(t2Answer, q.question, (q as { difficulty?: string }).difficulty ?? null, q.id)
    }

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

    // ── 1. Outcome-fishing / fit questions → deflect, do NOT advance ────
    // "am I selected?" / "do you think I'm a fit?" must be deflected and the SAME
    // question re-asked — never treated as an answer, never advanced (Build 03).
    if (REDIRECT_TRIGGERS.some(w => lower.includes(w))) {
      addTranscript({ speaker: 'candidate', text: responseText, questionId: q.id, type: 'preset' })
      const resp = "That's not something I can comment on during the interview — the team will be in touch after. Let's stay with the question."
      addTranscript({ speaker: 'ai', text: resp, type: 'transition' })
      await speakText(resp)
      await delay(800)
      startListening()  // re-listen on the SAME question — no advance
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

    // ── 4. Stuck handling (Bug A fix) ───────────────────────────────────
    // ONE diluted/guided attempt to unblock, then MOVE ON if the candidate is
    // STILL not giving a real answer — where "still stuck" = another stuck phrase
    // OR just a short non-answer after the hint (not only verbatim stuck phrases).
    // Carried across turns via stuckActiveRef so it can't drift into drilling.
    const isStuckPhrase = DONT_KNOW_TRIGGERS.some(w => lower.includes(w))
    const stuckWordCount = responseText.trim().split(/\s+/).filter(Boolean).length
    if (isStuckPhrase || (stuckActiveRef.current && stuckWordCount < 6)) {
      addTranscript({ speaker: 'candidate', text: responseText, questionId: q.id, type: 'preset' })
      if (stuckActiveRef.current) {
        // Already gave the one hint and they're still stuck → move on gracefully
        // (short-circuits the follow-up budget; dimension stays not-evidenced).
        stuckActiveRef.current = false
        const ack = pick([
          "That's completely fine — let's move on.",
          "No problem at all, we'll move on.",
          "Understood — let's keep going.",
        ] as const)
        addTranscript({ speaker: 'ai', text: ack, type: 'transition' })
        await speakText(ack)
        await delay(700)
        await moveToQuestion(currentQIdxRef.current + 1)
        return
      }
      // First stuck signal → ONE diluted/guided follow-up (hint / narrower sub-
      // question / example), conditioned on the question + their reply.
      stuckActiveRef.current = true
      let diluted = ''
      try {
        const r = await fetch('/api/interview/generate-dynamic-question', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dynamicType: 'simplify',
            questionText: q.question,
            lastResponse: responseText,
            positionTitle: position?.title ?? '',
            techStack: position?.techStack ?? [],
            previousResponses: responsesRef.current.slice(-3).map(r => ({ question: r.questionText, response: r.candidateResponse })),
          }),
        })
        if (r.ok) diluted = (await r.json()).question
      } catch { /* fall back below */ }
      const hint = q.expectedKeyPoints?.[0] ?? q.techTag ?? 'the basics'
      if (!diluted) diluted = `No problem — let's make it simpler. To start, just tell me whatever you do know about ${hint}.`
      addTranscript({ speaker: 'ai', text: diluted, questionId: q.id, type: 'preset' })
      await speakText(diluted)
      await delay(1200)
      startListening()
      return
    }
    // They were mid-stuck but just gave a real (substantive) answer → unblocked.
    if (stuckActiveRef.current) stuckActiveRef.current = false

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

    // ── 5b. Fix 3: No experience — accept immediately and move on ────
    const isNoExperience = NO_EXPERIENCE_PHRASES.some(p => lower.includes(p))
    if (isNoExperience) {
      addTranscript({ speaker: 'candidate', text: responseText, questionId: q.id, type: 'preset' })
      const ack = pick([
        "Understood, let's move on.",
        "Got it, no problem at all.",
        "That's fine. Let me ask you something different.",
        "Noted. Moving on.",
      ] as const)
      addTranscript({ speaker: 'ai', text: ack, type: 'transition' })
      await speakText(ack)
      await delay(800)
      await moveToQuestion(currentQIdxRef.current + 1)
      return
    }

    addTranscript({ speaker: 'candidate', text: responseText, questionId: q.id, type: 'preset' })

    // ── 6. (Bug B) Short answers no longer get a HARDCODED, context-free probe
    // ("Could you walk me through a specific example of that?") — that fired out of
    // context (e.g. right after "I don't know"). Short answers now flow into the
    // evaluate step below, whose follow-up IS conditioned on the candidate's actual
    // answer + prior turns (real Scribe transcript reaching Sonnet every turn).
    const wordCount = responseText.trim().split(/\s+/).filter(Boolean).length

    // ── 7. Evaluate ──────────────────────────────────────────────────
    let ev: EvalResult = {
      score: 5, relevanceScore: 5, keyPointsCovered: [], keyPointsMissed: [],
      evaluatorNote: '', shouldAskFollowUp: false, generateDynamic: false,
      suggestedTransition: '',
    }
    try {
      // Diagnostic fix: pass the candidate's ACTUAL prior answers (not empty
      // strings) so the brain has session memory and can reference what they
      // really said earlier — the main cause of non-referential, robotic replies.
      const prevQ = responsesRef.current
        .slice(-5)
        .map(r => ({ question: r.questionText, response: r.candidateResponse }))

      const res = await fetch('/api/interview/evaluate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText:      q.question,
          expectedKeyPoints: q.expectedKeyPoints,
          candidateResponse: responseText,
          previousResponses: prevQ,
          dynamicIntensity:  position?.dynamicQuestionIntensity ?? 'standard',
          followUpCount:     followUpCountRef.current,  // I-P0-3 depth cap
        }),
      })
      ev = await res.json()
    } catch {}

    // ── 8. Relevance / rambling check ────────────────────────────────
    // Fix 5: only redirect ONCE per question, and not for long/engaged answers (>20 words)
    const answerIsLong  = wordCount > 20
    const answerIsNegative = NO_EXPERIENCE_PHRASES.some(p => lower.includes(p))
    const shouldRedirect = !answerIsLong && !answerIsNegative && (ev.relevanceScore ?? 5) < 4
    if (shouldRedirect) {
      if (!redirectGivenRef.current) {
        redirectGivenRef.current = true
        const redirect = wordCount > 250
          ? `Thank you — I want to make sure we cover everything in our time together. Let me bring it back to ${q.techTag || SECTION_LABEL[q.section] || 'the topic'}.`
          : `I may not have been clear — I was asking specifically about ${q.expectedKeyPoints?.[0] ?? q.techTag ?? 'the question'}. Take your time.`
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

    // I-P0-3 (Part 3a): honour at most MAX_FOLLOWUPS per question. Past the cap we
    // advance gracefully even if the model still wants to drill — the dimension is
    // recorded as partially-evidenced (gaps already in keyPointsMissed).
    const MAX_FOLLOWUPS = 3
    const withinBudget  = followUpCountRef.current < MAX_FOLLOWUPS
    if (ev.shouldAskFollowUp && ev.followUpQuestion && withinBudget) {
      followUpCountRef.current += 1
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
    // If the interview has already wrapped up (terminated/closed), do NOT advance
    // to another question — prevents the post-end "let's shift gears…" continuation.
    if (wrapUpFiredRef.current) return
    const qs = questionsRef.current
    if (idx >= qs.length) {
      // After the Q&A: production runs the short Likert culture-fit segment, then
      // closes. Demo skips straight to the closing (short taste, unchanged).
      if (!isDemoRef.current && !cultureFitDoneRef.current) { await beginCultureFit(); return }
      await startClosing(); return
    }

    currentQIdxRef.current = idx
    setCurrentQIdx(idx)
    setPhase('questioning')
    rephraseCountRef.current      = 0     // reset all per-question edge-case state
    redirectGivenRef.current      = false
    shortAnswerAskedRef.current   = false
    stuckActiveRef.current        = false // Bug A: fresh stuck-state per question
    followUpCountRef.current       = 0    // I-P0-3: fresh follow-up budget per question
    awaitingMoveOnChoiceRef.current = false
    resetAnswerTelemetry()                // Build 02: fresh T2 timing/paste capture per question

    const q    = qs[idx]
    const prevQ = idx > 0 ? qs[idx - 1] : null

    // Auto-focus the relevant editor tab (the pane is always present now).
    if (q.section === 'whiteboard') setEditorTab('whiteboard')
    else if (q.section === 'technical' || q.section === 'scenario') setEditorTab('code')

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

    // Fix 2: Whiteboard section — pause until candidate clicks Done
    if (q.section === 'whiteboard' && prevQ?.section !== 'whiteboard') {
      const cue = 'Please use the whiteboard below to sketch your answer. Click Done when you are ready to explain.'
      addTranscript({ speaker: 'ai', text: cue, type: 'transition' })
      await speakText(cue)
      setWaitingWhiteboard(true)
      // Don't start listening — wait for handleWhiteboardDone()
      return
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

  // ── Generate report (called fire-and-forget after interview ends) ──
  const generateReport = useCallback(async () => {
    if (!candidate || !position || !interview) {
      console.warn('[generateReport] Missing data — candidate:', !!candidate, 'position:', !!position, 'interview:', !!interview)
      return
    }

    const payload = {
      interviewId,
      candidateId:      candidate.id,
      candidateName:    candidate.name,
      candidateEmail:   candidate.email ?? '',
      positionTitle:    position.title,
      company:          position.company,
      interviewDate:    new Date().toISOString().slice(0, 10),
      duration:         position.interviewDuration ?? PRODUCTION_INTERVIEW_MINUTES,
      transcript:       transcriptRef.current,
      questionResponses: responsesRef.current,
      resumeText:       '',
      techStack:        position.techStack ?? [],
      experienceLevel:  position.experienceLevel ?? '',
      roleType:         '',
      // bugfix: no candidate speech captured all session → likely mic/STT failure,
      // not a real (poor) interview. Lets the report note it honestly.
      sttFailed:        !candidateSpokeRef.current && responsesRef.current.length === 0,
    }

    console.log('[generateReport] Starting — candidateId:', candidate.id, 'transcript lines:', transcriptRef.current.length, 'responses:', responsesRef.current.length)

    // Also save to localStorage so the report page can retry if needed
    try {
      localStorage.setItem(`ic_interview_${interviewId}_complete`, JSON.stringify({
        completedAt:       new Date().toISOString(),
        transcript:        transcriptRef.current,
        responses:         responsesRef.current,
        candidateId:       candidate.id,
        candidateName:     candidate.name,
        candidateEmail:    candidate.email ?? '',
        positionTitle:     position.title,
        company:           position.company,
        techStack:         position.techStack ?? [],
        experienceLevel:   position.experienceLevel ?? '',
        interviewDuration: position.interviewDuration ?? PRODUCTION_INTERVIEW_MINUTES,
      }))
    } catch { /* non-critical */ }

    const attempt = async (): Promise<boolean> => {
      try {
        const res = await fetch('/api/generate-report', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        })
        if (!res.ok) {
          const errBody = await res.text().catch(() => '(unreadable)')
          console.error('[generateReport] HTTP', res.status, errBody)
          return false
        }
        const data = await res.json()
        if (data.error) { console.error('[generateReport] API error:', data.error); return false }
        addReport(interviewId, data)
        updateCandidate(candidate.id, { reportGenerated: true, reportGeneratedAt: new Date().toISOString() })
        console.log('[generateReport] ✓ Report saved — score:', data.overallScore, 'recommendation:', data.recommendation)
        return true
      } catch (err) {
        console.error('[generateReport] fetch error:', err)
        return false
      }
    }

    const ok = await attempt()
    if (!ok) {
      // Retry once after 10 seconds
      console.log('[generateReport] Retrying in 10 s…')
      await delay(10000)
      const ok2 = await attempt()
      if (!ok2) {
        console.error('[generateReport] Both attempts failed — user can regenerate from the report page')
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate, position, interview, interviewId, addReport, updateCandidate])

  // End the interview because the CANDIDATE asked to (or withdrew consent).
  // Uses an honest acknowledgment — NOT the canned "ran out of questions"
  // closing — persists the reason, and never double-fires (Build 01-B1/B2).
  // A consent-withdrawn session is a hard stop and is NOT scored normally.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const endByTermination = useCallback(async (reason: TerminationReason) => {
    if (wrapUpFiredRef.current) return
    wrapUpFiredRef.current = true
    setShowEndConfirm(false)
    stopAllAudio(); stopListening()
    stopAndUploadFraudRecording()  // ship audio for post-interview diarization
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)

    const firstName = candidate?.name.split(' ')[0] || 'there'
    const closing = reason === TERMINATION_REASONS.CONSENT_WITHDRAWN
      ? `Understood, ${firstName}. I'm stopping the interview now, and your withdrawal of consent has been recorded. Thank you for your time.`
      : `Understood, ${firstName}. We'll end the interview here as you've asked. Thank you for your time — the team will follow up on next steps.`
    addTranscript({ speaker: 'ai', text: closing, type: 'closing' })
    await speakText(closing)

    setPhase('completed')
    stopListening()
    if (interview) updateInterview(interview.id, { status: 'completed', candidateJoined: true })
    fetch(`/api/interviews/${interviewId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'completed', completedAt: new Date().toISOString(), terminationReason: reason,
        ...(reason === TERMINATION_REASONS.CONSENT_WITHDRAWN ? { consentWithdrawnAt: new Date().toISOString() } : {}),
      }),
    }).catch(() => {})

    // Consent withdrawal → do NOT score as a normal completion. A candidate-
    // ended interview still produces a report (it will mark dimensions with no
    // evaluable content as insufficient-evidence rather than confident scores).
    if (reason !== TERMINATION_REASONS.CONSENT_WITHDRAWN) generateReport().catch(console.error)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate, interview, interviewId, stopAllAudio, stopListening, addTranscript, speakText, setPhase, updateInterview])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const startClosing = useCallback(async (opts?: { closing?: string; alreadyClaimed?: boolean }) => {
    // exactly-once wrap-up (Build 01-B2). handleTimeUp claims the flag itself and
    // passes alreadyClaimed so this doesn't no-op out from under it.
    if (!opts?.alreadyClaimed) {
      if (wrapUpFiredRef.current) return
      wrapUpFiredRef.current = true
    }
    setPhase('closing')
    const firstName = candidate?.name.split(' ')[0] || 'there'
    const closing = opts?.closing ??
      `Thank you ${firstName}, that brings us to the end of our interview today. ` +
      `You covered a great deal of ground and I appreciate your thoughtfulness in each response. ` +
      `The team will review your evaluation and be in touch with next steps. ` +
      `It was great speaking with you.`

    addTranscript({ speaker: 'ai', text: closing, type: 'closing' })
    await speakText(closing)
    finishInterview()
    generateReport().catch(console.error)
    // Increment usage counter (fire-and-forget) — NEVER for demo runs (Build 05),
    // so a logged-in prospect trying the demo can't burn their paid quota.
    if (!isDemoRef.current) {
      fetch('/api/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'increment' }),
      }).catch(() => { /* non-critical */ })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate, setPhase, addTranscript, speakText])

  /* ── Likert culture-fit segment (Build 08): after Q&A, before closing ─── */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const beginCultureFit = useCallback(async () => {
    if (cultureFitDoneRef.current && cultureFitActive) return
    cultureFitDoneRef.current = true            // one-shot
    if (wrapUpFiredRef.current) { await startClosing(); return }
    stopListening()
    setPhase('processing')
    let items: LikertItem[] = []
    try {
      const r = await fetch(`/api/interview/culture-fit?interviewId=${encodeURIComponent(interviewId)}`)
      if (r.ok) items = (await r.json()).items ?? []
    } catch { /* fall through to closing if unavailable */ }
    if (!items.length || wrapUpFiredRef.current) { await startClosing(); return }
    setCultureFitItems(items)
    const intro = "Before we wrap up, I'd like to understand how you like to work. I'll show a few short statements — for each, choose how much you agree, from strongly disagree to strongly agree. This is about fit, separate from the technical questions."
    addTranscript({ speaker: 'ai', text: intro, type: 'transition' })
    await speakText(intro)
    setCultureFitActive(true)  // render the on-screen Likert form (selectable)
  }, [interviewId, addTranscript, speakText, startClosing, stopListening, setPhase])

  const submitCultureFit = useCallback(async () => {
    const responses = cultureFitItems.map((it) => ({
      ...it,
      value: cultureFitAnswers[it.id]?.value ?? 0,
      label: cultureFitAnswers[it.id]?.label ?? '',
    }))
    setCultureFitActive(false)
    // Persist + score on the SEPARATE axis (fire-and-forget — never blocks closing).
    fetch('/api/interview/culture-fit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ interviewId, responses }),
    }).catch(() => {})
    const ack = 'Thank you — that is everything I needed.'
    addTranscript({ speaker: 'ai', text: ack, type: 'transition' })
    await startClosing()
  }, [cultureFitItems, cultureFitAnswers, interviewId, addTranscript, startClosing])

  const finishInterview = useCallback(() => {
    console.log('[interview] Status changed to completed')
    console.log('[interview] Transcript entries:', transcriptRef.current.length)
    console.log('[interview] Question responses:', responsesRef.current.length)
    console.log('[interview] Triggering report generation...')
    setPhase('completed')
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    stopListening()
    stopAndUploadFraudRecording()  // ship audio for post-interview diarization

    updateCandidate(interview?.candidateId ?? '', {
      status: 'completed',
      score: runningScore > 0 ? runningScore : 72,
    })
    if (interview) updateInterview(interview.id, { status: 'completed', candidateJoined: true })

    // Save completion to DB
    fetch(`/api/interviews/${interviewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', completedAt: new Date().toISOString(), terminationReason: TERMINATION_REASONS.COMPLETED }),
    }).catch(() => {})

    try {
      localStorage.setItem(`ic_interview_${interviewId}_complete`, JSON.stringify({
        completedAt: new Date().toISOString(),
        transcript:  transcriptRef.current,
        responses:   responsesRef.current,
      }))
    } catch {}
  }, [setPhase, stopListening, updateCandidate, updateInterview, interview, interviewId, runningScore])

  const handleTimeUp = useCallback(async () => {
    // Deterministic priority gate (Fix 3): the time-up wrap-up wins, exactly once,
    // and never overlaps a next question. Claim the wrap-up FIRST (synchronously)
    // so any in-flight moveToQuestion/captureResponse bails on wrapUpFiredRef, then
    // cancel any question TTS already playing so there's no simultaneous speech.
    if (wrapUpFiredRef.current || phaseRef.current === 'completed' || phaseRef.current === 'closing') return
    wrapUpFiredRef.current = true
    stopAllAudio()       // cut off any in-progress next-question TTS
    stopListening()
    const firstName = candidate?.name.split(' ')[0] || 'there'
    const closing = `Thank you ${firstName} — that's the time we have for today. ` +
      `I appreciate everything you shared. The team will review your evaluation and be in touch with next steps. It was great speaking with you.`
    await startClosing({ closing, alreadyClaimed: true })
  }, [stopListening, stopAllAudio, startClosing, candidate])

  // Fix 2: Whiteboard Done handler — resume AI flow after candidate submits diagram
  const handleWhiteboardDone = useCallback(async () => {
    setWaitingWhiteboard(false)
    const transition = 'Thank you. I can see your diagram. Walk me through your thinking.'
    addTranscript({ speaker: 'ai', text: transition, type: 'transition' })
    await speakText(transition)
    await delay(800)
    startListening()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addTranscript, speakText, startListening])

  /* ── Warm-up arc (Build 03) ───────────────────────────────── */
  // Listen for one brief warm-up reply (or resolve '' on a short timeout so a
  // silent candidate still progresses). Routes capture via warmupCaptureRef.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const awaitWarmupReply = useCallback((timeoutMs: number): Promise<string> => {
    return new Promise((resolve) => {
      let done = false
      const finish = (text: string) => {
        if (done) return
        done = true
        warmupCaptureRef.current = null
        try { stopListening() } catch {}
        resolve(text)
      }
      warmupCaptureRef.current = (text) => finish(text)
      startListening()
      setTimeout(() => finish(''), timeoutMs)
    })
  }, [startListening, stopListening])

  // Three-beat, time-boxed warm-up, then a firm transition into the questions.
  // ≤3 exchanges / ~60s. Reactive: beat 2 conditions on the candidate's reply.
  // Build-01 termination handling is preserved even here.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const runWarmup = useCallback(async () => {
    if (!candidate || !position) { await moveToQuestion(0); return }
    warmupActiveRef.current = true
    const firstName = candidate.name.split(' ')[0]
    const ctx = buildSessionContext()  // candidate's real local day/time

    // Beat 1 — VARIED, warm opener (Fix 4): generated fresh each run, conditioned
    // on the real local day/time. Falls back to the deterministic buildOpener if
    // the model is slow/unavailable so the warm-up never blocks.
    let opener = ''
    try {
      const r = await fetch('/api/interview/warmup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beat: 'opener', firstName, role: position.title, dayContext: ctx }),
      })
      if (r.ok) opener = (await r.json()).line
    } catch { /* fall back below */ }
    if (!opener) opener = buildOpener({ firstName, ctx, role: position.title, orgName: position.company })
    addTranscript({ speaker: 'ai', text: opener, type: 'intro' })
    await speakText(opener)
    const reply1 = await awaitWarmupReply(15000)

    // Preserve Build-01: honor explicit termination even during warm-up.
    const term1 = detectTerminationIntent(reply1)
    if (term1) { warmupActiveRef.current = false; warmupCaptureRef.current = null; await endByTermination(term1.reason); return }

    // Beat 2 — ONE reactive follow-up conditioned on the actual reply.
    let followup = ''
    try {
      const r = await fetch('/api/interview/warmup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateReply: reply1, firstName, role: position.title, dayContext: ctx }),
      })
      if (r.ok) followup = (await r.json()).line
    } catch { /* fall back below */ }
    if (!followup) followup = reply1 ? 'Thanks for sharing that — glad you could make it.' : 'No worries — glad you could join.'
    addTranscript({ speaker: 'ai', text: followup, type: 'transition' })
    await speakText(followup)
    const reply2 = await awaitWarmupReply(12000)
    const term2 = detectTerminationIntent(reply2)
    if (term2) { warmupActiveRef.current = false; warmupCaptureRef.current = null; await endByTermination(term2.reason); return }

    // Beat 3 — signposted, firm transition into the evaluation.
    const transition = buildTransition()
    addTranscript({ speaker: 'ai', text: transition, type: 'transition' })
    await speakText(transition)
    await awaitWarmupReply(7000)  // brief "ready?" — don't require, time-box firmly

    warmupActiveRef.current = false
    warmupCaptureRef.current = null
    await delay(600)
    await moveToQuestion(0)
  }, [candidate, position, addTranscript, speakText, awaitWarmupReply, moveToQuestion, endByTermination])

  /* ── Fraud recording (interview-long; batch-diarized post-interview) ── */
  const startFraudRecording = useCallback(async () => {
    if (fraudRecorderRef.current || typeof MediaRecorder === 'undefined') return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      fraudStreamRef.current = stream
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
      const rec = new MediaRecorder(stream, { mimeType: mime })
      rec.ondataavailable = (e) => { if (e.data.size > 0) fraudChunksRef.current.push(e.data) }
      rec.start(2000)
      fraudRecorderRef.current = rec
    } catch { /* best-effort; fraud diarization is review-only and non-blocking */ }
  }, [])

  // Stop the recording and ship it to batch diarization (fire-and-forget, once).
  const stopAndUploadFraudRecording = useCallback(() => {
    if (fraudUploadedRef.current) return
    fraudUploadedRef.current = true
    const rec = fraudRecorderRef.current
    const finish = () => {
      const chunks = fraudChunksRef.current
      fraudStreamRef.current?.getTracks().forEach((t) => t.stop())
      fraudStreamRef.current = null
      if (!chunks.length) return
      const blob = new Blob(chunks, { type: rec?.mimeType || 'audio/webm' })
      // Skip uploads that are too small to contain a real second voice.
      if (blob.size < 4096) return
      try {
        fetch(`/api/interview/fraud-diarize?interviewId=${encodeURIComponent(interviewId)}`, {
          method: 'POST', headers: { 'Content-Type': blob.type }, body: blob, keepalive: true,
        }).catch(() => {})
      } catch {}
    }
    if (rec && rec.state !== 'inactive') { rec.onstop = finish; try { rec.stop() } catch { finish() } }
    else finish()
    fraudRecorderRef.current = null
  }, [interviewId])

  /* ── Auto-tour: narrated walkthrough before the first question ──────── */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const runTour = useCallback(async () => {
    const steps: { area: string; line: string }[] = [
      { area: 'question',   line: "Before we begin, a quick tour. Across the top you'll always see your current question." },
      { area: 'ai',         line: "On the left is me, Alex — this panel lights up when I'm speaking or listening." },
      { area: 'video',      line: "Just below me is your camera, with a live-monitoring indicator. Keep your face comfortably in view." },
      { area: 'editor',     line: "On the right is your workspace — a Code or Text editor with a language picker, plus a Whiteboard tab. When you've written or sketched your answer, press Submit." },
      { area: 'transcript', line: "And below the editor is the live transcript of our conversation. It scrolls as we talk, and you can scroll back any time. That's it — let's get started." },
    ]
    setTourActive(true)
    tourSkipRef.current = false
    for (const step of steps) {
      if (tourSkipRef.current) break
      setTourHighlight(step.area)
      addTranscript({ speaker: 'ai', text: step.line, type: 'transition' })
      await speakText(step.line)            // resolves early if Skip calls stopAllAudio()
      if (tourSkipRef.current) break
      await delay(250)
    }
    setTourHighlight(null)
    setTourActive(false)
  }, [addTranscript, speakText])

  const skipTour = useCallback(() => {
    tourSkipRef.current = true
    stopAllAudio()  // cut the current narration so skip is immediate
  }, [stopAllAudio])

  /* ── Start interview ──────────────────────────────────────── */
  const startInterview = useCallback(async () => {
    if (!candidate || !position || !interview) return
    startFraudRecording()  // begin the interview-long recording for fraud diarization

    // Fix 6: load questions from DB questionSet first; fall back to buildQuestions()
    let qs: LocalQuestion[] = []
    try {
      const qsRes = await fetch(`/api/positions/${interview.positionId}/questions`)
      if (qsRes.ok) {
        const dbQs = await qsRes.json()
        const toLocal = (arr: unknown[], section: LocalQuestion['section']): LocalQuestion[] =>
          (Array.isArray(arr) ? arr : []).map((q: unknown, i: number) => {
            const item = q as Record<string, unknown>
            return {
              id: String(item.id ?? `${section}-${i}`),
              section,
              question: String(item.question ?? ''),
              expectedKeyPoints: Array.isArray(item.expectedKeyPoints) ? item.expectedKeyPoints as string[] : [],
              techTag: String(item.techTag ?? ''),
              estimatedMinutes: Number(item.estimatedMinutes ?? 3),
              isPreset: true,
              followUp: String(item.followUp ?? ''),
            }
          })
        qs = [
          ...toLocal(dbQs.technicalQuestions,  'technical'),
          ...toLocal(dbQs.scenarioQuestions,   'scenario'),
          ...toLocal(dbQs.whiteboardQuestions, 'whiteboard'),
          ...toLocal(dbQs.behavioralQuestions, 'behavioral'),
          ...toLocal(dbQs.eqQuestions,         'eq'),
        ].filter(q => q.question.trim().length > 0)
        console.log('[interview] Loaded', qs.length, 'questions from DB questionSet')
        console.log('[interview] Breakdown — tech:', dbQs.technicalQuestions?.length, 'scenario:', dbQs.scenarioQuestions?.length, 'whiteboard:', dbQs.whiteboardQuestions?.length, 'behavioral:', dbQs.behavioralQuestions?.length, 'eq:', dbQs.eqQuestions?.length)
      }
    } catch (err) {
      console.warn('[interview] Failed to load DB questions, using buildQuestions():', err)
    }

    if (qs.length < 3) {
      console.warn('[interview] Low DB question count (' + qs.length + ') — falling back to buildQuestions()')
      qs = buildQuestions(position)
    }

    setQuestions(qs)
    questionsRef.current = qs

    const duration = position.interviewDuration ?? PRODUCTION_INTERVIEW_MINUTES
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

    // Save startedAt to DB
    fetch(`/api/interviews/${interviewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress', startedAt: new Date().toISOString() }),
    }).catch(() => {}) // fire and forget

    // 2 s pause — give candidate time to settle before the interviewer speaks
    await delay(2000)

    // Brief automatic interface tour (skippable) — completes BEFORE the first
    // question (runWarmup → moveToQuestion(0) runs only after this returns).
    await runTour()

    // Build 03: warm, time-boxed warm-up arc (greet + day/time opener → one
    // reactive follow-up → signposted transition) replaces the static intro.
    // It flows into moveToQuestion(0) itself.
    await runWarmup()
  }, [
    candidate, position, interview, interviewId,
    setActiveSession, updateInterview, setPhase,
    addTranscript, speakText, runWarmup, runTour,
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
    terminationAskedRef.current = false
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
    // Candidate confirmed they want to stop → honest termination closing +
    // persisted reason, NOT the canned end-of-flow script.
    await endByTermination(TERMINATION_REASONS.TERMINATED_BY_CANDIDATE)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopAllAudio, endByTermination])

  /* ── Code editor sync (debounced 1 s) ────────────────────── */
  const handleCodeChange = (val: string | undefined) => {
    const v = val ?? ''
    // T2 telemetry: first-keystroke latency + typed-char accounting (Build 02).
    if (firstKeystrokeRef.current === null) firstKeystrokeRef.current = Date.now()
    const delta = v.length - codeContentRef.current.length
    if (delta > 0 && delta < 20) pasteStatsRef.current.typed += delta  // small positive deltas = typing
    codeContentRef.current = v
    setCodeContent(v)
    if (codeDebounceRef.current) clearTimeout(codeDebounceRef.current)
    codeDebounceRef.current = setTimeout(() => {
      updateSessionCode(v, codeLanguage)
    }, 1000)
  }

  // Monaco mount — register paste capture (metadata only, never the clipboard text).
  const handleEditorMount = useCallback((editor: unknown) => {
    const ed = editor as { onDidPaste: (cb: (e: { range: unknown }) => void) => void; getModel: () => { getValueInRange: (r: unknown) => string } | null }
    try {
      ed.onDidPaste((e) => {
        const text = ed.getModel()?.getValueInRange(e.range) ?? ''
        const size = text.length
        const s = pasteStatsRef.current
        s.count += 1; s.total += size; s.largest = Math.max(s.largest, size)
      })
    } catch { /* editor API shape differs — non-critical */ }
  }, [])

  // Fire the T2 content-analysis for a coding answer (fire-and-forget; never
  // blocks the interview). Sends only text needed for analysis — no raw video.
  const runIntegrityAnalysis = useCallback((answer: string, questionText: string, difficulty: string | null, questionId?: string) => {
    if (!answer || answer.trim().length < 40) return
    const baseline = transcriptRef.current.filter((t) => t.speaker === 'candidate').slice(0, 4).map((t) => t.text).join('\n').slice(0, 1500)
    // Anti-overlay latency: the gap from the question being shown to the answer
    // STARTING. For typed answers that's the first keystroke; for SPOKEN answers
    // (the overlay-on-voice case) it's the first spoken word — previously null, so
    // the "long silence → sudden complete answer" pattern never fired on voice.
    const spoken = !codeContentRef.current.trim()
    const answerStartedAt = firstKeystrokeRef.current ?? speechStartedAtRef.current
    const idleBeforeAnswerMs = answerStartedAt ? answerStartedAt - questionStartRef.current : null
    fetch('/api/interview/integrity/analyze', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        interviewId, questionText, questionId, questionDifficulty: difficulty, answer, baseline, spoken,
        latency: { timeToFirstKeystrokeMs: idleBeforeAnswerMs, idleBeforeAnswerMs },
        paste: pasteStatsRef.current,
      }),
    }).catch(() => {})
  }, [interviewId])

  /* ── Whiteboard export ────────────────────────────────────── */
  const handleWhiteboardExport = (dataUrl: string) => {
    updateSessionWhiteboard(dataUrl)
  }

  // Base "Submit Answer" — submits the ACTIVE tab's work for the current question.
  // Switching tabs never loses unsubmitted work (both stay mounted); only this
  // explicit submit captures an answer.
  const submitActiveTab = () => {
    if (editorTab === 'whiteboard') {
      // While the flow is paused on a whiteboard question, Submit = "Done sketching".
      if (waitingWhiteboard) { void handleWhiteboardDone(); return }
      if (phaseRef.current !== 'listening' || capturedRef.current) return
      capturedRef.current = true
      candidateSpokeRef.current = true
      captureResponse('(Answer provided on the whiteboard — diagram attached.)')
      return
    }
    submitCodeAnswer()
  }
  // Whether the base Submit is actionable right now (per active tab).
  const canSubmit = editorTab === 'whiteboard'
    ? (waitingWhiteboard || phase === 'listening')
    : (phase === 'listening' && codeContent.trim().length > 0)

  /* ═══════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════ */

  if (dbLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={32} color="#7C3AED" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 14, color: '#94A3B8' }}>Loading your interview…</div>
        </div>
      </div>
    )
  }

  if (dbError || !interview || !candidate || !position) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <div style={{ textAlign: 'center', maxWidth: 380, color: '#94A3B8' }}>
          <AlertTriangle size={40} style={{ margin: '0 auto 12px', color: '#EF4444' }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: '#4F46E5' }}>
            {dbError || 'Interview not found'}
          </div>
          <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
            Please check your email for the correct interview link, or contact your recruiter.
          </div>
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
    // Demo runs: instead of "close this window", show the prospect their real
    // evidence report (the whole point of the demo). Client-side navigation keeps
    // the ephemeral demo data alive (no pagehide → no cleanup beacon) until the
    // report tab is closed, and the report page surfaces the full integrity panel.
    if (isDemoRef.current) {
      return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
          <div style={{ textAlign: 'center', maxWidth: 480, padding: 40 }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>📊</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: '#4F46E5', marginBottom: 12 }}>Your sample report is ready</div>
            <div style={{ fontSize: 15, color: '#64748B', lineHeight: 1.7 }}>
              Great job, {candidate.name.split(' ')[0]}! We&apos;ve scored your responses and run the same integrity checks a real candidate gets. Open your evidence report to see scores, strengths, concerns and the integrity panel.
            </div>
            <button
              onClick={() => router.push(`/report/${interviewId}?demo=1`)}
              style={{ marginTop: 28, padding: '14px 28px', background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(79,70,229,0.32)', letterSpacing: '-0.01em' }}
            >
              View your sample report →
            </button>
            <div style={{ marginTop: 14, fontSize: 12, color: '#94A3B8' }}>
              This is a demo — your data is temporary and isn&apos;t shared with any employer.
            </div>
          </div>
        </div>
      )
    }
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
          <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 28 }}>Duration: {position.interviewDuration ?? PRODUCTION_INTERVIEW_MINUTES} minutes · AI Interviewer: Alex</div>
          <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.7, marginBottom: 28, padding: '14px 16px', background: '#F8FAFC', borderRadius: 10 }}>
            <strong>Before you start:</strong> ensure you are in a quiet place, your microphone is working, and you have a stable internet connection. Speak clearly and take your time with each answer.
          </div>
          {/* Soft consent gate (I-P0-1): the interview cannot START until the
              candidate explicitly acknowledges the recording/data-processing
              notice. Acknowledgement is logged with a timestamp server-side. */}
          {!consentOk && (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, textAlign: 'left', fontSize: 12.5, color: '#475569', lineHeight: 1.6, marginBottom: 14, cursor: 'pointer', padding: '12px 14px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10 }}>
              <input type="checkbox" onChange={async (e) => {
                if (!e.target.checked) return
                try { await fetch(`/api/schedule/${interviewId}/consent`, { method: 'POST' }) } catch {}
                setConsentOk(true)
              }} style={{ marginTop: 2 }} />
              <span>I consent to this interview being <strong>recorded and monitored</strong> and to my responses being processed and evaluated by Levl1&apos;s AI for this hiring assessment. I understand I can withdraw consent at any time to stop the interview.</span>
            </label>
          )}
          <button
            onClick={startInterview}
            disabled={!consentOk}
            style={{ width: '100%', padding: '14px 0', background: consentOk ? 'linear-gradient(135deg, #4F46E5, #4338CA)' : '#CBD5E1', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: consentOk ? 'pointer' : 'not-allowed', letterSpacing: '-0.01em' }}
          >
            Start Interview →
          </button>
          <div style={{ marginTop: 14, fontSize: 12, color: '#94A3B8' }}>{consentOk ? 'Consent acknowledged. You can begin when ready.' : 'Acknowledge the consent notice above to begin.'}</div>
        </div>
      </div>
    )
  }

  /* ── Active interview UI ───────────────────────────────────── */
  const currentQ   = questions[currentQIdx]
  const timerColor = timeRemaining <= 120 ? '#DC2626' : timeRemaining <= 300 ? '#D97706' : '#4F46E5'

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F0F4F8', overflow: 'hidden' }}>

      {/* Tier-1 proctoring (Build 01-A) — the single live capture instance now renders
          INLINE in the top-left video slot below (one camera stream + one CV client). */}
      {/* Demo conversion affordance — self-gates on ?demo=1 (Build 05). */}
      <DemoSalesCTA label="Talk to sales" />

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

      {/* Auto-tour banner — short narrated walkthrough; skippable; ends before Q1. */}
      {tourActive && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 80, display: 'flex', alignItems: 'center', gap: 12, background: '#0F0F1A', color: '#E2E8F0', borderRadius: 100, padding: '8px 10px 8px 18px', boxShadow: '0 10px 30px rgba(15,23,42,0.35)', border: '1px solid rgba(124,58,237,0.4)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#A78BFA', animation: 'pulseDot 1.2s ease-in-out infinite' }} />
            Quick interface tour…
          </span>
          <button onClick={skipTour} style={{ padding: '6px 14px', borderRadius: 100, border: 'none', cursor: 'pointer', background: '#4F46E5', color: '#fff', fontSize: 12.5, fontWeight: 700 }}>Skip tour →</button>
        </div>
      )}

      {/* ── Likert culture-fit segment (Build 08) — after Q&A, before closing ── */}
      {cultureFitActive && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ width: 640, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 18, padding: '24px 26px', boxShadow: '0 24px 60px rgba(15,23,42,0.3)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Culture &amp; values fit · separate from your technical score</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 800, color: '#4F46E5', margin: '0 0 6px' }}>A few quick statements</h2>
            <p style={{ fontSize: 13.5, color: '#64748B', margin: '0 0 18px' }}>For each statement, choose how much you agree. There are no right answers — this is about how you like to work.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {cultureFitItems.map((it, idx) => (
                <div key={it.id}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 8, lineHeight: 1.5 }}>{idx + 1}. {it.prompt}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                    {LIKERT_OPTIONS.map((opt) => {
                      const sel = cultureFitAnswers[it.id]?.value === opt.value
                      return (
                        <button key={opt.value} onClick={() => setCultureFitAnswers((a) => ({ ...a, [it.id]: { value: opt.value, label: opt.label } }))}
                          style={{ padding: '8px 6px', borderRadius: 9, cursor: 'pointer', border: `1px solid ${sel ? '#4F46E5' : '#E2E8F0'}`, background: sel ? '#4F46E5' : '#F8FAFC', color: sel ? '#fff' : '#475569', fontSize: 11, fontWeight: 600, lineHeight: 1.25, transition: 'all 0.12s' }}>
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 22 }}>
              <span style={{ fontSize: 12, color: '#94A3B8' }}>{Object.keys(cultureFitAnswers).length} of {cultureFitItems.length} answered</span>
              <button onClick={submitCultureFit} disabled={Object.keys(cultureFitAnswers).length < cultureFitItems.length}
                style={{ marginLeft: 'auto', padding: '11px 26px', borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 700, cursor: Object.keys(cultureFitAnswers).length < cultureFitItems.length ? 'not-allowed' : 'pointer', background: Object.keys(cultureFitAnswers).length < cultureFitItems.length ? '#E2E8F0' : 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: Object.keys(cultureFitAnswers).length < cultureFitItems.length ? '#94A3B8' : '#fff' }}>
                Finish interview →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content: question full-width on top, then two columns
           (left = AI + candidate video, stacked & equal; right = editor + transcript). ── */}
      <main className="iv-surface" style={{ flex: 1, overflow: 'hidden', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>

        {messageFromRecruiter && (
          <div style={{ padding: '10px 16px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, fontSize: 13, fontWeight: 600, color: '#92400E', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span>📋 {messageFromRecruiter}</span>
            <button onClick={() => setMessageFromRecruiter(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400E' }}><X size={14} /></button>
          </div>
        )}

        {/* ════ Question Display — FULL WIDTH across the top ════ */}
        <div data-tour="question" style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0, outline: tourHighlight === 'question' ? '3px solid #7C3AED' : 'none', outlineOffset: 2, transition: 'outline 0.2s' }}>
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
                <p style={{ fontSize: 16, fontWeight: 600, color: '#4F46E5', lineHeight: 1.6, margin: 0 }}>{currentQ.question}</p>
                {currentQ.section === 'whiteboard' && (
                  <div style={{ fontSize: 12, color: '#8B5CF6', fontWeight: 600 }}>✏️ Use the Whiteboard tab below to sketch your answer</div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 15, color: '#64748B', lineHeight: 1.6 }}>
                {phase === 'intro' ? 'Your interview is starting…' : 'Preparing next question…'}
              </div>
            )}
            {/* slim progress strip */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 2 }}>
              {questions.map((q, idx) => {
                const done = idx < currentQIdx; const current = idx === currentQIdx; const color = SECTION_COLOR[q.section]
                return <div key={q.id} title={SECTION_LABEL[q.section]} style={{ flex: 1, height: 4, borderRadius: 2, background: done ? color : current ? `${color}55` : '#E2E8F0', transition: 'all 0.4s ease' }} />
              })}
            </div>
          </div>

        {/* ════ TWO COLUMNS ════ */}
        <div className="iv-cols" style={{ flex: 1, minHeight: 0, display: 'flex', gap: 16 }}>

          {/* ──── LEFT: AI window (top) + candidate video (below) — stacked & EQUAL ──── */}
          <div className="iv-left" style={{ width: 440, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
            <div data-tour="ai" className="iv-ai-fill" style={{ flex: 1, minHeight: 0, display: 'flex', borderRadius: 18, outline: tourHighlight === 'ai' ? '3px solid #7C3AED' : 'none', outlineOffset: 2, transition: 'outline 0.2s' }}>
              <AIVisualizer
                phase={phase}
                isWarmingUp={isWarmingUp}
                liveTranscriptLength={liveTranscript.length}
                timeRemaining={timeRemaining}
                candidateName={candidate.name}
                positionTitle={position.title}
                compact
              />
            </div>
            {/* Candidate video — same IntegrityMonitor feed/CV (inline variant).
                Equal-sized box with normal proportions; objectFit:cover keeps the
                face naturally framed (no stretch/letterbox). */}
            <div data-tour="video" style={{ flex: 1, minHeight: 0, position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid #E2E8F0', background: '#0F172A', outline: tourHighlight === 'video' ? '3px solid #7C3AED' : 'none', outlineOffset: 2, transition: 'outline 0.2s' }}>
              <IntegrityMonitor interviewId={interviewId} active={true} variant="inline" />
            </div>
          </div>

          {/* ──── RIGHT: editor (top, generous height) + transcript (below) — stacked ──── */}
          <div className="iv-right" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>

          {/* Editor pane — PERMANENT, tab strip + content + base Submit */}
          <div data-tour="editor" style={{ flex: 1.7, minHeight: 0, background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', overflow: 'hidden', outline: tourHighlight === 'editor' ? '3px solid #7C3AED' : 'none', outlineOffset: 2, transition: 'outline 0.2s' }}>
            {/* tab strip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 10px', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
              <button onClick={() => setEditorTab('code')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: editorTab === 'code' ? '#4F46E5' : '#F1F5F9', color: editorTab === 'code' ? '#fff' : '#64748B', fontSize: 12, fontWeight: 700, transition: 'all 0.15s' }}>
                <Code2 size={13} /> Code / Text
              </button>
              <button onClick={() => setEditorTab('whiteboard')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: editorTab === 'whiteboard' ? '#4F46E5' : '#F1F5F9', color: editorTab === 'whiteboard' ? '#fff' : '#64748B', fontSize: 12, fontWeight: 700, transition: 'all 0.15s' }}>
                <PenLine size={13} /> Whiteboard
              </button>
              {waitingWhiteboard && editorTab === 'whiteboard' && <span style={{ marginLeft: 8, fontSize: 11, color: '#8B5CF6', fontWeight: 600 }}>Sketch your answer, then Submit when ready</span>}
            </div>

            {/* tab content — BOTH stay mounted, toggled via display so work is retained when switching */}
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              {/* Code / Text */}
              <div style={{ position: 'absolute', inset: 0, display: editorTab === 'code' ? 'flex' : 'none', flexDirection: 'column' }}>
                <div style={{ padding: '6px 12px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>Language:</span>
                  {(['plaintext', 'javascript', 'typescript', 'python', 'java', 'sql', 'go', 'cpp'] as const).map(lang => (
                    <button key={lang} onClick={() => setCodeLanguage(lang)} style={{ padding: '3px 10px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: codeLanguage === lang ? '#4F46E5' : 'transparent', color: codeLanguage === lang ? '#fff' : '#64748B' }}>
                      {lang === 'plaintext' ? 'Plain Text' : lang === 'cpp' ? 'C++' : lang === 'javascript' ? 'JavaScript' : lang === 'typescript' ? 'TypeScript' : lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="interview-monaco-wrapper" style={{ flex: 1, minHeight: 0 }}>
                  <MonacoEditor
                    height="100%"
                    language={codeLanguage}
                    theme="vs-dark"
                    value={codeContent}
                    onChange={handleCodeChange}
                    onMount={handleEditorMount}
                    options={{ minimap: { enabled: false }, fontSize: 13, lineNumbers: 'on', scrollBeyondLastLine: false, automaticLayout: true, wordWrap: 'on', padding: { top: 12, bottom: 12 } }}
                  />
                </div>
              </div>
              {/* Whiteboard */}
              <div style={{ position: 'absolute', inset: 0, display: editorTab === 'whiteboard' ? 'block' : 'none', overflow: 'hidden' }}>
                <Whiteboard onExport={handleWhiteboardExport} onDone={waitingWhiteboard ? handleWhiteboardDone : undefined} />
              </div>
            </div>

            {/* base Submit — submits the ACTIVE tab's answer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, padding: '8px 12px', borderTop: '1px solid #E2E8F0', flexShrink: 0 }}>
              <span style={{ marginRight: 'auto', fontSize: 11, color: '#94A3B8' }}>{editorTab === 'code' ? 'Submit your written answer for this question' : 'Submit your whiteboard answer for this question'}</span>
              <button onClick={submitActiveTab} disabled={!canSubmit} title={canSubmit ? 'Submit your answer' : 'Wait for your turn to answer'} style={{ padding: '8px 22px', borderRadius: 8, border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed', background: canSubmit ? '#4F46E5' : '#E2E8F0', color: canSubmit ? '#fff' : '#94A3B8', fontSize: 13, fontWeight: 700, transition: 'all 0.15s' }}>
                Submit Answer
              </button>
            </div>
          </div>

          {/* Transcript — BELOW the editor in the right column. Live, auto-scroll, scrollable back. */}
          <div data-tour="transcript" className="iv-transcript" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden', outline: tourHighlight === 'transcript' ? '3px solid #7C3AED' : 'none', outlineOffset: 2, transition: 'outline 0.2s' }}>
          {/* header + live status */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #E2E8F0', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#4F46E5', fontFamily: 'var(--font-display)' }}>Transcript</span>
              {isWarmingUp ? (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', fontStyle: 'italic' }}>Take your time…</span>
              ) : isListening ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#DC2626' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626', animation: 'pulseDot 1.2s ease-in-out infinite', display: 'inline-block' }} />
                  Recording…
                </span>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {micFailed ? <MicOff size={12} /> : <Mic size={12} />}{micFailed ? 'Mic unavailable' : 'Waiting'}
                </span>
              )}
            </div>
            {listeningHint && <div style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>{listeningHint}</div>}
            {sttWarning && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: '#B45309', background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '8px 10px' }}>
                <MicOff size={14} color="#D97706" /><span>{sttWarning}</span>
              </div>
            )}
          </div>

          {/* full live transcript (Scribe v2 Realtime), auto-scroll, scrollable back */}
          <div ref={transcriptBoxRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {transcript.map(entry => (
              <div key={entry.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: entry.speaker === 'ai' ? '#7C3AED' : '#10B981', letterSpacing: '0.04em' }}>{entry.speaker === 'ai' ? 'ALEX' : 'YOU'}</span>
                <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.55 }}>{entry.text}</span>
              </div>
            ))}
            {liveTranscript && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981', letterSpacing: '0.04em' }}>YOU</span>
                <span style={{ fontSize: 13, color: '#64748B', fontStyle: 'italic', lineHeight: 1.55 }}>{liveTranscript}</span>
              </div>
            )}
          </div>

          {/* text input fallback at the base of the rail */}
          {(textInputMode || micFailed) && phase === 'listening' && (
            <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid #E2E8F0', flexShrink: 0 }}>
              <textarea
                value={textInputValue}
                onChange={e => setTextInputValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) submitTextInput() }}
                placeholder="Type your response… (⌘+Enter)"
                style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 13, lineHeight: 1.5, resize: 'vertical', minHeight: 56, fontFamily: 'var(--font-sans)', outline: 'none', color: '#334155' }}
              />
              <button onClick={submitTextInput} disabled={!textInputValue.trim()} style={{ padding: '0 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: textInputValue.trim() ? '#4F46E5' : '#E2E8F0', color: textInputValue.trim() ? '#fff' : '#94A3B8', fontSize: 13, fontWeight: 700 }}>Send</button>
            </div>
          )}
          </div>

          </div>{/* iv-right */}
        </div>{/* iv-cols */}

      </main>

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

        /* AI window fills its (equal-sized) box so it matches the candidate video. */
        .iv-ai-fill > div { flex: 1; height: 100%; justify-content: center; }

        /* ── Narrower widths: stack the two columns; keep the editor present.
           Desktop-first — this only prevents bad breakage below ~900px. ── */
        @media (max-width: 900px) {
          .iv-surface { overflow: auto !important; }
          .iv-cols { flex-direction: column !important; flex: none !important; }
          .iv-left { width: 100% !important; }
          .iv-left > div { min-height: 200px; }
          .iv-transcript { min-height: 240px; }
        }
      `}</style>
    </div>
  )
}
