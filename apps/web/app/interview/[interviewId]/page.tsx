'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAppStore, InterviewPhase, TranscriptEntry, QuestionResponse } from '@/store/appStore'
import { Position } from '@/store/appStore'
import Whiteboard from '@/components/interview/Whiteboard'
import { AIVisualizer } from '@/components/interview/AIVisualizer'
import { Mic, MicOff, Code2, PenLine, Clock, AlertTriangle, X, Loader2, Monitor, BarChart3, Check, ArrowDown, ArrowUp, Maximize2, Minimize2, ChevronDown, ChevronUp, ShieldCheck, Play, ListChecks, Wand2, CheckCircle2, XCircle, EyeOff, VolumeX } from 'lucide-react'
import { IntegrityMonitor, type PresenceSample } from '@/components/interviews/IntegrityMonitor'
import { HEARTBEAT_MS, type HeartbeatInput } from '@/lib/screen/control-room/live'
import { DemoSalesCTA } from '@/components/interviews/DemoSalesCTA'
import { detectTerminationIntent } from '@/lib/screen/session/termination'
import { TERMINATION_REASONS, TerminationReason } from '@/lib/screen/session/lifecycle'
import { ScribeStt, DEFAULT_KEYTERMS, prefetchScribeToken } from '@/lib/screen/interview/scribe-stt'
import { sttKeyterms, normalizeSpokenTech } from '@/lib/screen/tech-terms'
import { playStreamedSpeech, unlockTtsAudio, TtsError, TTS_TIMING, type StreamHandle } from '@/lib/screen/interview/tts-stream'
import { BargeInDetector, BARGE_IN_CONFIG } from '@/lib/screen/interview/barge-in'
import { buildSessionContext, buildOpener, buildTransition } from '@/lib/screen/session/persona'
import { LIKERT_OPTIONS, type LikertItem } from '@/lib/screen/session/culture-fit'
import { PRODUCTION_INTERVIEW_MINUTES, CULTURE_FIT_RESERVE_SEC, MIN_QUESTION_SEC } from '@/lib/screen/session/duration'
import { INTERVIEWER_NAME } from '@/lib/screen/interviewer'
import { logisticsIntro, LOGISTICS_MAX_MS, LOGISTICS_HARD_CAP_MS, type SegmentTurn } from '@/lib/screen/logistics/prompts'
import { ConsentCheckbox } from '@/components/interviews/ConsentCheckbox'
import { CaptureNotice, MediaConsent } from '@/components/screen/candidate/CaptureNotice'
import { digest, type TimelineEvent } from '@/lib/screen/workspace/timeline'
import { LANGUAGE_LABEL, WORKSPACE_LANGUAGES, type PublicTask } from '@/lib/screen/workspace/task'
import { hasWorkspace, isInterviewMode, type InterviewMode } from '@/lib/screen/workspace/modes'
import { ScreenLogo } from '@/components/screen/brand/ScreenLogo'

/* ── Utility helpers ─────────────────────────────────────────────── */
const wordCount0 = (t: string) => t.trim().split(/\s+/).filter(Boolean).length
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

// Candidate checking the line ("can you hear me?") — a meta-question, never an
// answer: confirm and keep listening on the SAME question.
const AUDIO_CHECK_TRIGGERS = [
  'can you hear me', 'can u hear me', 'do you hear me', 'are you able to hear',
  'are you there', 'is this working', 'am i audible', 'is my mic', 'is my microphone',
  'can you hear what i', 'hello can you', 'hello are you',
] as const

// When the brain is unavailable, a trivial answer is PROBED, never silently accepted.
const DEGRADED_PROBES = [
  'Could you walk me through your reasoning in a bit more detail?',
  'Can you take that a level deeper — how would it actually work here?',
  'Talk me through your approach step by step, please.',
] as const
const LOW_SCORE_PROBES = [
  "That doesn't quite address the question yet. Could you walk me through how you would actually solve it?",
  "I don't think that answers what I asked. Take a moment — how would you approach this problem?",
] as const
const isTrivialAnswer = (text: string) => {
  const t = text.trim()
  const words = t.split(/\s+/).filter(Boolean).length
  return t.length < 60 || words < 8 || /^\s*print\s*\(\s*["']hello/i.test(t)
}

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

// Short connectors after a confirm-back (the restatement carries the substance).
const TR_CONFIRM_NEXT = [
  'Let me move us on.',
  'Next one.',
  'Let us keep going.',
  'On to something different.',
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260, background: 'var(--lv-surface)', color: 'var(--lv-text-muted)', fontSize: 13 }}>
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
  kind?: 'worksample'   // Observe & Defend hands-on task (technical / hybrid modes)
}

// Observe & Defend workspace result shapes (from /api/interview/workspace/run).
interface RunOutputShape { status: string; statusText: string; stdout: string; stderr: string; compileOutput: string; timeSec: number | null }
interface TestResultShape { passed: number; total: number; results: { id: string; name: string; hidden: boolean; passed: boolean; status: string; actual?: string; expected?: string; input?: string; stderr?: string }[] }
const WS_QUESTION_ID = 'ws-task'
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
  confirmBack?: string   // one-sentence restatement of a substantive answer (active mirroring)
  speech?: { followUpQuestion?: string; confirmBack?: string }   // same lines + optional delivery tags (voice only)
  degraded?: boolean        // the brain was unavailable — this is NOT a real evaluation
  degradedReason?: string
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
// Display-only: strip emoji / pictographic markers from question text shown to
// the candidate (stored question sets may still carry them). The spoken text
// and every stored value are untouched.
const PICTOGRAPHIC = new RegExp('[\\p{Extended_Pictographic}\\uFE0F\\u200D]', 'gu')  // constructor: tsconfig targets ES5
const displayText = (t: string) => t.replace(PICTOGRAPHIC, '').replace(/\s{2,}/g, ' ').trim()

const SECTION_LABEL: Record<string, string> = {
  technical: 'Technical', behavioral: 'Behavioral',
  scenario: 'Scenario', eq: 'Values', whiteboard: 'System Design',
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
        if (data.interviewer?.name) setInterviewer({ name: data.interviewer.name, voiceKey: data.interviewer.voiceKey ?? null })
        setConsentOk(!!data.consentGiven || !!data.isDemo)  // I-P0-1 soft consent gate
        setMediaOk(!!data.mediaConsentGiven || !!data.isDemo)
        if (data.privacy) setPrivacy({ orgName: data.position?.agency?.name ?? 'The hiring team', mediaRetentionDays: data.privacy.mediaRetentionDays, transcriptRetentionDays: data.privacy.transcriptRetentionDays })
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
  // Measured screen-rect of the currently highlighted area → drives the focus
  // ring + pointer arrow overlay during the tour.
  const [tourRect, setTourRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
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
  const timeRemainingRef = useRef(0)  // read by moveToQuestion's culture-fit reserve
  useEffect(() => { timeRemainingRef.current = timeRemaining }, [timeRemaining])
  const [, setQuestionResponses]     = useState<QuestionResponse[]>([])
  const [runningScore, setRunningScore] = useState(0)
  // Permanent editor pane: which tab is active. Both tabs stay mounted so work is
  // retained when switching (Monaco keeps codeContent; whiteboard keeps its canvas).
  const [editorTab, setEditorTab] = useState<'code' | 'whiteboard'>('code')
  const [waitingWhiteboard, setWaitingWhiteboard] = useState(false) // Fix 2
  const [codeContent, setCodeContent] = useState('')
  const [codeLanguage, setCodeLanguage] = useState('javascript')
  // ── Observe & Defend workspace (technical / hybrid only) ──
  const [workMode, setWorkMode] = useState<InterviewMode>('technical')
  const workModeRef = useRef<InterviewMode>('technical')
  workModeRef.current = workMode
  const [workTask, setWorkTask] = useState<PublicTask | null>(null)
  const workTaskRef = useRef<PublicTask | null>(null)
  const [waitingWorkSample, setWaitingWorkSample] = useState(false)
  const waitingWorkSampleRef = useRef(false)
  const [wsStarted, setWsStarted] = useState(false)
  const [wsTab, setWsTab] = useState<'task' | 'code' | 'tests' | 'output'>('code')
  const [runBusy, setRunBusy] = useState<null | 'run' | 'tests'>(null)
  const [runOutput, setRunOutput] = useState<RunOutputShape | null>(null)
  const [testResults, setTestResults] = useState<TestResultShape | null>(null)
  const [execNote, setExecNote] = useState<string | null>(null)
  const [customStdin, setCustomStdin] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'offline'>('idle')
  const wsActiveRef = useRef(false)              // timeline + autosave only while the task is the current question
  const wsStartRef = useRef<number | null>(null)
  const wsResumeMsRef = useRef(0)                // continue the timeline clock after a refresh
  const timelineRef = useRef<TimelineEvent[]>([])
  const pendingEventsRef = useRef<TimelineEvent[]>([])
  const editWindowRef = useRef<{ start: number; n: number; d: number } | null>(null)
  const lastSnapRef = useRef<{ t: number; len: number }>({ t: 0, len: 0 })
  const wsDirtyRef = useRef(false)
  const saveInFlightRef = useRef(false)
  const lastTestsSummaryRef = useRef('')
  const uncoveredKeysRef = useRef<string[]>([])   // must-have skills not yet assessed (adaptive coverage)
  const codeLanguageRef = useRef('javascript')
  codeLanguageRef.current = codeLanguage
  const editorRef = useRef<{ getValue: () => string; getAction: (id: string) => { run: () => Promise<void> } | null } | null>(null)
  const saveWorkspaceRef = useRef<((submitted?: boolean) => Promise<void>) | null>(null)
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
  const lastSpokenRef     = useRef('')  // interviewer's last line → Scribe previous_text context (Fixpack 8)
  const sttPreferWebSpeechRef = useRef(false)    // once Scribe fails, skip it for the session
  // Interview-long mic recording for post-interview fraud diarization (Scribe batch).
  const fraudRecorderRef  = useRef<MediaRecorder | null>(null)
  const fraudStreamRef    = useRef<MediaStream | null>(null)
  const fraudChunksRef    = useRef<Blob[]>([])
  const fraudUploadedRef  = useRef(false)
  const recordingStartedAtRef = useRef<number | null>(null)  // wall clock → syncs playback timeline
  // ── Recruiter Control Room heartbeat — latest presence + speech signals ──
  const presenceRef = useRef<{ camState: PresenceSample['camState']; faceCount: number | null; faceAbsentSince: string | null; multiFaceAt: string | null }>({ camState: 'starting', faceCount: null, faceAbsentSince: null, multiFaceAt: null })
  const lastSpeechAtRef = useRef<string | null>(null)
  const sentTranscriptLenRef = useRef(0)
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
  const lastConfirmBackRef    = useRef(false)    // mirroring: never confirm-back on consecutive turns
  const followUpCountRef      = useRef(0)        // I-P0-3: follow-ups asked on this question (cap 3)
  const awaitingMoveOnChoiceRef = useRef(false)  // waiting for candidate's "more time or move on" reply
  const terminationAskedRef = useRef(false)      // candidate already asked to confirm end (Build 01-B1)
  const wrapUpFiredRef = useRef(false)           // one-shot wrap-up guard — closing fires exactly once (Build 01-B2)
  // Fixpack 6 #4: each Q&A question is asked at most once. Two flows advancing
  // at the same moment (both calling moveToQuestion(current + 1)) previously
  // re-asked the same question.
  const lastAskedIdxRef = useRef(-1)
  const askedQuestionIdsRef = useRef<Set<string>>(new Set())
  // ── Warm-up arc (Build 03) — routes brief small-talk replies away from the
  // question pipeline and suppresses the question cold-start timers while active.
  const warmupActiveRef = useRef(false)
  const warmupCaptureRef = useRef<((text: string) => void) | null>(null)
  const isDemoRef = useRef(false)  // demo-gallery run (Build 05) — never bills usage
  const [consentOk, setConsentOk] = useState(false)  // soft consent gate before start (I-P0-1)
  // Checkbox state for the gate: never pre-checked; only counts once the server
  // has recorded it (a failed save unticks the box and shows an error).
  const [consentChecked, setConsentChecked] = useState(false)
  const [consentSaving, setConsentSaving] = useState(false)
  const [consentError, setConsentError] = useState<string | null>(null)
  // Captured-data privacy: the SEPARATE photo/recording/camera consent. Audio
  // recording, camera CV and the session start are all gated on it (the
  // server also refuses the start + any capture upload without it).
  const [mediaOk, setMediaOk] = useState(false)
  const [privacy, setPrivacy] = useState<{ orgName: string; mediaRetentionDays: number; transcriptRetentionDays: number } | null>(null)
  // Room polish — presentation-only UI state (no pipeline involvement).
  const [editorExpanded, setEditorExpanded] = useState(false)
  const [transcriptCollapsed, setTranscriptCollapsed] = useState(false)
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  useEffect(() => {
    if (!editorExpanded) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setEditorExpanded(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editorExpanded])
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
  // ── Barge-in (Fixpack 4): candidate speaking over the interviewer stops TTS
  // and switches to listening; buffered audio is handed to the next STT session.
  const bargeInRef        = useRef<BargeInDetector | null>(null)
  const bargeInPendingRef = useRef(false)   // a barge-in happened; next startListening takes its audio
  const playbackStopRef   = useRef<(() => void) | null>(null)  // resolves the in-flight speakText
  // Streamed interviewer voice (no browser speechSynthesis — ever).
  const ttsHandleRef      = useRef<StreamHandle | null>(null)
  const speakGenRef       = useRef(0)                 // bumps per line; a stale retry loop exits
  const voiceTokenRef     = useRef<{ token: string; exp: number } | null>(null)
  const voiceUnblockRef   = useRef<(() => void) | null>(null)
  const brainDownReportedRef = useRef(false)          // report a degraded brain once per session
  const whiteboardHasInkRef  = useRef(false)          // has the candidate drawn anything?
  const whiteboardEmptyNudgedRef = useRef(false)
  const lastTestedCodeRef    = useRef<string | null>(null)  // code the last test run used
  // Per-turn latency telemetry: candidate last heard → STT turn end → brain →
  // interviewer's first audio. One turn_timing log line per answer.
  const lastHeardAtRef = useRef<number | null>(null)
  const turnTimingRef  = useRef<{ lastHeard: number | null; commit: number; brainStart?: number; brainEnd?: number; brainDegraded?: boolean; ttsStart?: number; ttsAttempts?: number; path: 'voice' | 'typed' | 'editor' } | null>(null)
  const [voiceStatus, setVoiceStatusState] = useState<'ok' | 'reconnecting' | 'unavailable' | 'blocked'>('ok')
  const voiceStatusRef    = useRef<'ok' | 'reconnecting' | 'unavailable' | 'blocked'>('ok')
  const setVoiceStatus = useCallback((v: 'ok' | 'reconnecting' | 'unavailable' | 'blocked') => { voiceStatusRef.current = v; setVoiceStatusState(v) }, [])
  // Interviewer voice + matching name for THIS interview (position → account → env default).
  const [interviewer, setInterviewer] = useState<{ name: string; voiceKey: string | null }>({ name: INTERVIEWER_NAME, voiceKey: null })
  const interviewerRef    = useRef(interviewer)
  interviewerRef.current  = interviewer
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
      bargeInRef.current?.dispose(); bargeInRef.current = null
      // A generation counter, not a DOM ref: bumping it stops any in-flight retry loop.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      speakGenRef.current++
      ttsHandleRef.current?.stop(); ttsHandleRef.current = null
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current = null
      }
    }
  }, [])

  /* ── Kill audio when interview completes ──────────────────── */
  useEffect(() => {
    if (phase === 'completed') {
      speakGenRef.current++
      ttsHandleRef.current?.stop(); ttsHandleRef.current = null
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current = null
      }
    }
  }, [phase])

  /* ── Observe & Defend: work-capture timeline ─────────────── */
  const wsT = () => (wsStartRef.current ? Date.now() - wsStartRef.current : 0)
  const pushEvent = (e: TimelineEvent) => {
    if (!wsActiveRef.current) return
    timelineRef.current.push(e); pendingEventsRef.current.push(e)
  }
  const editorValue = () => { try { return editorRef.current?.getValue() ?? codeContentRef.current } catch { return codeContentRef.current } }
  const flushEditWindow = () => {
    const w = editWindowRef.current
    if (w && (w.n || w.d)) pushEvent({ t: w.start, k: 'edit', n: w.n, d: w.d })
    editWindowRef.current = null
  }
  const maybeSnapshot = (force = false) => {
    if (!wsActiveRef.current) return
    const code = editorValue(); const now = wsT(); const last = lastSnapRef.current
    if (force || Math.abs(code.length - last.len) > 80 || (now - last.t > 45_000 && code.length !== last.len)) {
      pushEvent({ t: now, k: 'snapshot', code: code.slice(0, 12_000) })
      lastSnapRef.current = { t: now, len: code.length }
    }
  }

  // Load mode + task + any saved work (refresh / network-drop recovery).
  useEffect(() => {
    if (!interviewId) return
    let alive = true
    fetch(`/api/interview/workspace?interviewId=${encodeURIComponent(interviewId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return
        const mode: InterviewMode = isInterviewMode(d.mode) ? d.mode : 'technical'
        setWorkMode(mode)
        if (!hasWorkspace(mode)) { setCodeLanguage('plaintext'); return }
        if (!d.task) return
        const task = d.task as PublicTask
        setWorkTask(task); workTaskRef.current = task
        let code: string = d.saved?.code ?? ''
        let lang: string = d.saved?.language ?? task.language
        const serverAt = d.saved?.savedAt ? Date.parse(d.saved.savedAt) : 0
        try {
          const local = JSON.parse(localStorage.getItem(`lv_ws_${interviewId}`) ?? 'null') as { code?: string; language?: string; savedAt?: number } | null
          if (local?.code && (local.savedAt ?? 0) > serverAt) { code = local.code; lang = local.language ?? lang }
        } catch { /* storage blocked */ }
        setCodeLanguage(lang)
        if (code) { setCodeContent(code); codeContentRef.current = code }
        if (typeof d.resumeMs === 'number') wsResumeMsRef.current = d.resumeMs
      })
      .catch(() => { /* workspace optional — the interview still runs */ })
    return () => { alive = false }
  }, [interviewId])

  // Continuous autosave (server, serialized) + local mirror; retries after a drop.
  useEffect(() => {
    if (!workTask) return
    const save = async (submitted = false) => {
      if (!wsStartRef.current || saveInFlightRef.current) return
      const w = editWindowRef.current
      if (w && wsT() - w.start > 4000) flushEditWindow()
      maybeSnapshot()
      const events = pendingEventsRef.current.splice(0)
      if (!wsDirtyRef.current && !events.length && !submitted) return
      const code = editorValue()
      try { localStorage.setItem(`lv_ws_${interviewId}`, JSON.stringify({ code, language: codeLanguageRef.current, savedAt: Date.now() })) } catch { /* ignore */ }
      saveInFlightRef.current = true; wsDirtyRef.current = false; setSaveState('saving')
      try {
        const r = await fetch('/api/interview/workspace', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interviewId, code, language: codeLanguageRef.current, events, ...(submitted ? { submitted: true } : {}) }),
        })
        if (!r.ok) throw new Error(String(r.status))
        setSaveState('saved'); setDraftSavedAt(Date.now())
      } catch {
        pendingEventsRef.current.unshift(...events); wsDirtyRef.current = true; setSaveState('offline')
      } finally { saveInFlightRef.current = false }
    }
    saveWorkspaceRef.current = save
    const iv = setInterval(() => { void save() }, 4000)
    const onHide = () => { if (document.visibilityState === 'hidden') void save() }
    const onOnline = () => { void save() }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('online', onOnline)
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onHide); window.removeEventListener('online', onOnline) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workTask, interviewId])

  // Final flush when the session wraps (time-up / end) — never lose the work.
  useEffect(() => {
    if ((phase === 'closing' || phase === 'completed') && wsActiveRef.current) { flushEditWindow(); maybeSnapshot(true); void saveWorkspaceRef.current?.() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /* ── Recruiter Control Room: live heartbeat ──────────────── */
  // Pushes the signals this page ALREADY has (phase, question, CV face count,
  // STT/mic state, transcript) so recruiters can monitor without joining.
  // Fire-and-forget; never blocks or alters the interview.
  const liveSignalsRef = useRef({ micFailed, textInputMode, sttWarning })
  liveSignalsRef.current = { micFailed, textInputMode, sttWarning }
  useEffect(() => { if (liveTranscript) lastSpeechAtRef.current = new Date().toISOString() }, [liveTranscript])
  const handlePresence = useCallback((p: PresenceSample) => {
    const cur = presenceRef.current
    const now = new Date().toISOString()
    presenceRef.current = {
      camState: p.camState,
      faceCount: p.faceCount ?? cur.faceCount,
      faceAbsentSince: p.faceCount === 0 ? (cur.faceAbsentSince ?? now) : p.faceCount === null ? cur.faceAbsentSince : null,
      multiFaceAt: p.faceCount !== null && p.faceCount > 1 ? now : cur.multiFaceAt,
    }
  }, [])
  const sendHeartbeat = useCallback((final = false) => {
    if (!interviewId) return
    const sig = liveSignalsRef.current
    const q = questionsRef.current[currentQIdxRef.current]
    const tx = transcriptRef.current
    const grew = tx.length !== sentTranscriptLenRef.current
    const beat: HeartbeatInput & { interviewId: string } = {
      interviewId,
      phase: phaseRef.current,
      questionIndex: q ? currentQIdxRef.current : undefined,
      questionCount: questionsRef.current.length || undefined,
      questionText: q?.question,
      ...presenceRef.current,
      sttMode: sig.textInputMode ? 'text' : sig.micFailed ? 'none' : sttPreferWebSpeechRef.current ? 'webspeech' : 'scribe',
      micOk: !sig.micFailed,
      sttWarning: sig.sttWarning,
      lastSpeechAt: lastSpeechAtRef.current,
      tabHidden: typeof document !== 'undefined' && document.hidden,
      interim: liveTranscriptRef.current || '',
      ...(grew || final ? { transcript: tx.map((e) => ({ speaker: e.speaker, text: e.text, timestamp: e.timestamp, ...(e.segment ? { segment: e.segment } : {}) })) } : {}),
    }
    if (grew) sentTranscriptLenRef.current = tx.length
    try {
      fetch('/api/interview/live-heartbeat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(beat), keepalive: final && tx.length < 200 }).catch(() => {})
    } catch { /* telemetry only */ }
  }, [interviewId])
  const liveSessionOn = phase !== 'waiting' && phase !== 'completed'
  useEffect(() => {
    if (!liveSessionOn) return
    sendHeartbeat()
    const iv = setInterval(() => sendHeartbeat(), HEARTBEAT_MS)
    const onVis = () => sendHeartbeat()  // tab hide/show → reflect immediately
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onVis) }
  }, [liveSessionOn, sendHeartbeat])
  // Final beat: phase "completed" + the complete transcript for playback.
  useEffect(() => { if (phase === 'completed') sendHeartbeat(true) }, [phase, sendHeartbeat])

  /* ── Countdown timer ──────────────────────────────────────── */
  useEffect(() => {
    // Don't start the clock until the interface tour has finished — the timer
    // begins with the warm-up, not while the candidate is being walked through.
    if (phase === 'waiting' || phase === 'completed' || tourActive) return
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
  }, [phase === 'waiting', phase === 'completed', tourActive])

  /* ── Tour focus: measure the highlighted area for the ring + arrow ───── */
  useEffect(() => {
    if (!tourHighlight) { setTourRect(null); return }
    const measure = () => {
      const el = document.querySelector(`[data-tour="${tourHighlight}"]`)
      if (el) {
        const r = el.getBoundingClientRect()
        setTourRect({ top: r.top, left: r.left, width: r.width, height: r.height })
      }
    }
    measure()
    const t = setTimeout(measure, 80)   // re-measure once layout/transitions settle
    window.addEventListener('resize', measure)
    return () => { clearTimeout(t); window.removeEventListener('resize', measure) }
  }, [tourHighlight])

  /* ── Clear all silence timers ─────────────────────────────── */
  const clearSilenceTimers = useCallback(() => {
    silenceTimersRef.current.forEach(t => clearTimeout(t))
    silenceTimersRef.current = []
  }, [])

  /* ── Stop all audio immediately ──────────────────────────── */
  const stopAllAudio = useCallback(() => {
    if (!bargeInPendingRef.current) bargeInRef.current?.disarm()
    playbackStopRef.current = null
    speakGenRef.current++                       // any retry loop for an older line stops
    ttsHandleRef.current?.stop(); ttsHandleRef.current = null
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
  }, [])

  /* ── TTS ──────────────────────────────────────────────────── */
  // Short-lived voice token for /api/interview/generate-speech (the endpoint
  // only speaks for a live interview). Refreshed 5 min before expiry.
  const ensureVoiceToken = useCallback(async (): Promise<string> => {
    const cur = voiceTokenRef.current
    if (cur && cur.exp - Date.now() > 5 * 60_000) return cur.token
    const res = await fetch('/api/interview/voice-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ interviewId }) })
    if (!res.ok) throw new TtsError(res.status === 409 ? 'unauthorized' : 'http', res.status)
    const d = (await res.json()) as { token: string; expiresAt: string }
    voiceTokenRef.current = { token: d.token, exp: new Date(d.expiresAt).getTime() }
    return d.token
  }, [interviewId])

  // Voice trouble is reported server-side (ops logs + Control Room), never just console.
  const reportVoice = useCallback((kind: 'retry' | 'reconnecting' | 'recovered' | 'gave_up' | 'blocked' | 'stt_error' | 'brain_unavailable' | 'barge_in' | 'turn_timing', detail?: string, attempt?: number, timing?: Record<string, number | string | boolean | null>) => {
    const token = voiceTokenRef.current?.token
    if (kind !== 'turn_timing') console.warn('[voice]', kind, detail ?? '', attempt ?? '')
    else console.info('[turn]', timing)
    if (!token) return
    fetch('/api/interview/voice-event', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-voice-token': token }, body: JSON.stringify({ kind, detail, attempt, timing }), keepalive: true }).catch(() => {})
  }, [])

  // Pre-warm the interviewer voice while the candidate is on the pre-start
  // screen: V4 Turbo's FIRST request is ~2 s slower than later ones, so the
  // opening line would lag. Warm on load, re-warm every 2 min until Start
  // (max 5 — a few characters each). Nothing is played.
  useEffect(() => {
    if (dbLoading || !interview || phase !== 'waiting') return
    let warms = 0
    const warmNow = async () => {
      if (warms >= 5) return
      warms++
      try {
        const token = await ensureVoiceToken()
        await fetch('/api/interview/generate-speech', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-voice-token': token }, body: JSON.stringify({ warm: true, voiceAccent: interviewerRef.current.voiceKey ?? undefined }) })
      } catch { /* best-effort: the real line still works, just cold */ }
    }
    void warmNow()
    const iv = setInterval(() => { void warmNow() }, 120_000)
    return () => clearInterval(iv)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbLoading, !!interview, phase === 'waiting', ensureVoiceToken])

  // opts.bargeIn: the candidate may interrupt this line (only lines that are
  // followed by listening opt in). Resolves 'interrupted' if they did.
  const speakText = useCallback(async (text: string, opts: { bargeIn?: boolean } = {}): Promise<'done' | 'interrupted'> => {
    // Always cancel previous audio before starting new (Fix 4)
    stopAllAudio()

    // Fix 4: Sanitize text — remove non-ASCII chars that cause gibberish
    const cleanText = text
      .replace(/[^\x20-\x7E\n]/g, ' ')  // strip non-printable / non-ASCII
      .replace(/\s+/g, ' ')
      .trim()

    if (!cleanText || cleanText.length < 2) {
      console.warn('[speakText] Empty or invalid text, skipping')
      return 'done'
    }
    console.log('[speakText] Speaking:', cleanText.slice(0, 80))
    lastSpokenRef.current = cleanText
    if (!sttPreferWebSpeechRef.current) prefetchScribeToken()  // next listen opens faster

    if (!isMountedRef.current) return 'done'
    setPhase('speaking')

    // Barge-in arming: only for opted-in lines, never once the session is
    // wrapping up, and not when the candidate is typing (no mic) — sig is the
    // heartbeat's live view of mic/text mode.
    const sig = liveSignalsRef.current
    const canBargeIn = !!opts.bargeIn && BARGE_IN_CONFIG.enabled && !wrapUpFiredRef.current && !sig.micFailed && !sig.textInputMode && !!bargeInRef.current
    let interrupted = false
    let armedOnce = false   // 'playing' can re-fire after a stall — calibrate once per line
    const armBargeIn = (stop: () => void) => {
      if (!canBargeIn || armedOnce) return
      armedOnce = true
      bargeInPendingRef.current = false
      bargeInRef.current!.arm(() => {
        if (wrapUpFiredRef.current || !isMountedRef.current) return
        interrupted = true
        bargeInPendingRef.current = true
        aiSpeakingRef.current = false   // what follows is the candidate, not echo
        reportVoice('barge_in')         // telemetry: proves barge-in fires in real interviews
        stop()
      })
    }
    // Echo guard: while Alex speaks, the mic may transcribe his own TTS. Mark it
    // so the recognizer drops those captures (prevents the false-termination loop
    // where "…end the interview…" gets re-heard and treated as candidate intent).
    aiSpeakingRef.current = true

    // ── Streamed ElevenLabs voice (no robotic fallback, ever) ─────────────
    // First audio ~1s (PCM streamed as generated). On failure: retry once at
    // once; then show "voice reconnecting" and keep retrying with backoff up to
    // TTS_TIMING.reconnectMaxMs. If it still can't speak, the line stays on
    // screen (transcript) and the interview continues — it NEVER switches to the
    // browser's speechSynthesis voice. Pronunciation fixes run server-side on
    // every attempt. Every retry/reconnect is reported server-side (voice-event).
    const gen = ++speakGenRef.current
    const lineStart = Date.now()
    let attempt = 0
    let reportedReconnect = false
    while (isMountedRef.current && gen === speakGenRef.current) {
      attempt++
      if (turnTimingRef.current && !turnTimingRef.current.ttsStart) turnTimingRef.current.ttsStart = Date.now()
      if (turnTimingRef.current) turnTimingRef.current.ttsAttempts = attempt
      try {
        const token = await ensureVoiceToken()
        if (gen !== speakGenRef.current || !isMountedRef.current) return 'done'
        const result = await playStreamedSpeech({
          url: '/api/interview/generate-speech',
          headers: { 'x-voice-token': token },
          body: { text: cleanText, voiceAccent: interviewerRef.current.voiceKey ?? undefined, stream: true },
          register: (h) => { ttsHandleRef.current = h; playbackStopRef.current = () => h.stop() },
          // Arm once sound is actually playing so calibration hears the echo level.
          onPlaying: () => {
            armBargeIn(() => ttsHandleRef.current?.stop())
            // Turn timing: the interviewer's first audible response to this answer.
            const tt = turnTimingRef.current
            if (tt && tt.ttsStart) {
              const now = Date.now()
              const ms = (a?: number | null, b?: number | null) => (a != null && b != null ? Math.max(0, Math.round(b - a)) : null)
              reportVoice('turn_timing', undefined, undefined, {
                path: tt.path,
                sttTurnEndMs: ms(tt.lastHeard, tt.commit),      // candidate last heard → turn committed
                brainMs: ms(tt.brainStart, tt.brainEnd),          // evaluate-response round trip
                brainDegraded: tt.brainDegraded ?? null,
                gapBeforeVoiceMs: ms(tt.brainEnd ?? tt.commit, tt.ttsStart),  // client logic between brain and the next line
                ttsFirstAudioMs: ms(tt.ttsStart, now),           // voice request → first audio
                ttsAttempts: tt.ttsAttempts ?? 1,
                totalMs: ms(tt.lastHeard ?? tt.commit, now),      // what the candidate actually waited
              })
              turnTimingRef.current = null
            }
          },
        })
        // A newer line may already own the handle — only clear our own.
        if (gen !== speakGenRef.current) return interrupted ? 'interrupted' : 'done'
        ttsHandleRef.current = null
        playbackStopRef.current = null
        if (attempt > 1 || reportedReconnect || voiceStatusRef.current !== 'ok') { setVoiceStatus('ok'); reportVoice('recovered', undefined, attempt) }
        if (interrupted) return 'interrupted'
        void result
        bargeInRef.current?.disarm()
        // Brief grace so the tail/echo of the last words isn't captured as speech.
        setTimeout(() => { aiSpeakingRef.current = false }, 500)
        return 'done'
      } catch (err) {
        if (gen !== speakGenRef.current || !isMountedRef.current) return 'done'
        const kind = err instanceof TtsError ? err.kind : 'network'
        if (kind === 'unauthorized') voiceTokenRef.current = null   // mint a fresh token next attempt
        reportVoice('retry', kind, attempt)
        if (kind === 'autoplay_blocked') {
          // Needs a tap (e.g. after a page refresh). Wait for it; don't burn the budget.
          setVoiceStatus('blocked'); reportVoice('blocked', kind, attempt)
          await new Promise<void>((resolve) => { voiceUnblockRef.current = resolve })
          voiceUnblockRef.current = null
          setVoiceStatus('reconnecting')
          continue
        }
        if (attempt === 1 && kind !== 'rate_limited') continue   // one immediate retry
        if (Date.now() - lineStart > TTS_TIMING.reconnectMaxMs) {
          setVoiceStatus('unavailable'); reportVoice('gave_up', kind, attempt)
          bargeInRef.current?.disarm()
          setTimeout(() => { aiSpeakingRef.current = false }, 300)
          return 'done'   // the line is on screen; the interview carries on
        }
        if (!reportedReconnect) { reportedReconnect = true; setVoiceStatus('reconnecting'); reportVoice('reconnecting', kind, attempt) }
        await delay(Math.min(8000, 1000 * 2 ** Math.max(0, attempt - 2)))
      }
    }
    return 'done'
  }, [setPhase, stopAllAudio, ensureVoiceToken, reportVoice, setVoiceStatus])

  /* ── STT ──────────────────────────────────────────────────── */
  // Stop whichever recognizer is currently active (Deepgram or Web Speech).
  const stopActiveRecognizer = useCallback(() => {
    if (recognitionRef.current) { try { recognitionRef.current.stop() } catch {} recognitionRef.current = null }
    if (dgSttRef.current)       { try { dgSttRef.current.stop() }       catch {} dgSttRef.current = null }
  }, [])

  const startListening = useCallback(() => {
    // Never re-open the mic once the interview has wrapped up (time-up / termination
    // / closing) — stops an in-flight question flow from reviving after Fix 3.
    // A barge-in's buffered audio is only for THIS listen; take it now.
    const bargedIn = bargeInPendingRef.current
    bargeInPendingRef.current = false
    const takeBargeInAudio = bargedIn ? () => bargeInRef.current?.takePreroll() ?? null : undefined
    if (wrapUpFiredRef.current || phaseRef.current === 'closing' || phaseRef.current === 'completed') { bargeInRef.current?.disarm(); return }
    if (micFailed) { bargeInRef.current?.disarm(); setTextInputMode(true); return }

    // Reset per-listen state (shared by Deepgram + Web Speech fallback)
    clearSilenceTimers()
    stopActiveRecognizer()
    hasSpokenRef.current = false
    capturedRef.current  = false
    setListeningHint('')
    if (!bargedIn) playChime()  // soft chime → mic is live (skipped when they're already talking)

    // Shared end-of-turn capture. During the warm-up arc, route to its handler.
    const captureNow = (rawText: string) => {
      const text = normalizeSpokenTech(rawText)   // idempotent; covers the Web Speech path too
      if (!aiSpeakingRef.current && text.trim() && !capturedRef.current) {
        turnTimingRef.current = { lastHeard: lastHeardAtRef.current, commit: Date.now(), path: 'voice' }
        lastHeardAtRef.current = null
      }
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
        if (text) lastHeardAtRef.current = Date.now()
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
      // (Web Speech can't take buffered audio — a barge-in's first words are lost.)
      bargeInRef.current?.disarm()
      runWebSpeech()
    } else {
      // ── ElevenLabs Scribe v2 Realtime (primary) ──
      //   VAD commit handles endpointing (tuned NOT to cut off mid-sentence);
      //   committed_transcript → onUtteranceEnd. Keyterms bias control + tech words.
      // Fixpack 8 #5: control words + the position's skills (canonical + spoken
      // forms, e.g. "C#" + "C sharp") + a base tech glossary.
      const keyterms = sttKeyterms(DEFAULT_KEYTERMS, [...((position?.techStack ?? []) as string[]), ...(((position as { mustHaves?: string[] } | null)?.mustHaves ?? []) as string[])])
      const dg = new ScribeStt({
        onInterim: (text) => {
          if (aiSpeakingRef.current) return  // echo guard — ignore Alex's own voice
          if (text) lastHeardAtRef.current = Date.now()
          liveTranscriptRef.current = text
          setLiveTranscript(text)
          if (text) { hasSpokenRef.current = true; if (speechStartedAtRef.current === null) speechStartedAtRef.current = Date.now(); setListeningHint(''); clearSilenceTimers() }
        },
        onUtteranceEnd: (text) => captureNow(text),
        // A socket/auth/quota failure before the candidate was heard → Web Speech
        // for the rest of the session instead of a silent, dead mic.
        onError: (reason) => {
          // Loud, never silent: every Scribe error is reported server-side (ops log).
          reportVoice('stt_error', reason)
          const kind = reason.split(':')[0]
          const fatal = ['auth_error', 'socket_error', 'quota_exceeded', 'rate_limited', 'resource_exhausted', 'invalid_request', 'unaccepted_terms', 'error'].includes(kind)
          if (!fatal || dgSttRef.current !== dg || capturedRef.current || hasSpokenRef.current || phaseRef.current !== 'listening') return
          sttPreferWebSpeechRef.current = true
          try { dg.stop() } catch {}
          dgSttRef.current = null
          runWebSpeech()
        },
      }, {
        languageCode: process.env.NEXT_PUBLIC_SCRIBE_LANGUAGE ?? 'en',
        keyterms,
        // Timings: SCRIBE_DEFAULTS (env NEXT_PUBLIC_SCRIBE_VAD_SILENCE_SECS / _COMMIT_GRACE_MS).
        previousText: lastSpokenRef.current,
        normalize: normalizeSpokenTech,   // "see sharp" → "C#", "dot net" → ".NET"
        preroll: takeBargeInAudio,
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
      const nudgeRes = await speakText(nudge, { bargeIn: true })

      const phaseAfter12 = phaseRef.current as string
      if (phaseAfter12 !== 'completed' && phaseAfter12 !== 'closing') {
        if (nudgeRes !== 'interrupted') await delay(1500)
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
      const choiceRes = await speakText(prompt, { bargeIn: true })
      awaitingMoveOnChoiceRef.current = true  // next captureResponse handles the choice

      const phaseAfter20 = phaseRef.current as string
      if (phaseAfter20 !== 'completed' && phaseAfter20 !== 'closing') {
        if (choiceRes !== 'interrupted') await delay(1500)
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
    turnTimingRef.current = { lastHeard: null, commit: Date.now(), path: 'typed' }
    setTextInputValue('')
    capturedRef.current = true
    candidateSpokeRef.current = true   // typed input is genuine input
    noInputStrikesRef.current = 0
    setSttWarning(null)
    // Warm-up / logistics segments own their replies (typed ones too).
    const segmentCb = warmupCaptureRef.current
    if (segmentCb) segmentCb(text)
    else captureResponse(text)
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

    // ── 0b. "Can you hear me?" — answer it, keep listening on the same question.
    if (wordCount0(lower) <= 10 && AUDIO_CHECK_TRIGGERS.some((w) => lower.includes(w))) {
      addTranscript({ speaker: 'candidate', text: responseText, questionId: q.id, type: 'preset' })
      const resp = pick(['Yes, I can hear you clearly. Take your time with the question.', 'Yes, I can hear you fine. Go ahead whenever you are ready.', 'I can hear you clearly — please go ahead.'] as const)
      addTranscript({ speaker: 'ai', text: resp, type: 'transition' })
      if ((await speakText(resp, { bargeIn: true })) !== 'interrupted') await delay(600)
      startListening()
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
        if ((await speakText(ack, { bargeIn: true })) !== 'interrupted') await delay(600)
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
      if ((await speakText(resp, { bargeIn: true })) !== 'interrupted') await delay(800)
      startListening()  // re-listen on the SAME question — no advance
      return
    }

    // ── 2. Company / role questions ──────────────────────────────────
    if (COMPANY_QUESTION_TRIGGERS.some(w => lower.includes(w))) {
      addTranscript({ speaker: 'candidate', text: responseText, questionId: q.id, type: 'preset' })
      const resp = "I don't have that detail handy — the hiring team will cover that with you. Shall we continue?"
      addTranscript({ speaker: 'ai', text: resp, type: 'transition' })
      if ((await speakText(resp, { bargeIn: true })) !== 'interrupted') await delay(800)
      startListening()
      return
    }

    // ── 3. Repeat / clarification request ───────────────────────────
    if (REPEAT_TRIGGERS.some(w => lower.includes(w))) {
      if (rephraseCountRef.current >= 1) {
        const defer = 'Let me know when you are ready and we will continue.'
        addTranscript({ speaker: 'ai', text: defer, type: 'transition' })
        if ((await speakText(defer, { bargeIn: true })) !== 'interrupted') await delay(1500)
        startListening()
        return
      }
      rephraseCountRef.current++
      // Repeat verbatim — no paraphrase
      addTranscript({ speaker: 'ai', text: q.question, questionId: q.id, type: 'preset' })
      if ((await speakText(q.question, { bargeIn: true })) !== 'interrupted') await delay(1500)
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
      if ((await speakText(diluted, { bargeIn: true })) !== 'interrupted') await delay(1200)
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

      if (!turnTimingRef.current) turnTimingRef.current = { lastHeard: null, commit: Date.now(), path: 'editor' }
      turnTimingRef.current.brainStart = Date.now()
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
          // Recent interviewer lines → the brain varies its phrasing instead of
          // repeating stock follow-ups (does not change the follow-up budget).
          recentAiLines:     transcriptRef.current.filter(e => e.speaker === 'ai').slice(-8).map(e => e.text),
          // Observe & Defend: the candidate's actual work grounds the follow-ups.
          ...(q.kind === 'worksample' ? { workContext: buildWorkContext() } : {}),
          // Technical content structure: server adds rubric probe answers +
          // role-skill-map coverage guidance (never sent back to the browser).
          interviewId,
          coverageAnswers: responsesRef.current.map(r => ({ questionText: `${r.questionText} ${r.questionType}`, score: r.score })),
          timeLeftSec: timeRemainingRef.current,
        }),
      })
      ev = await res.json()
      if (turnTimingRef.current) { turnTimingRef.current.brainEnd = Date.now(); turnTimingRef.current.brainDegraded = !!ev.degraded }
      const cov = (ev as unknown as { coverage?: { uncoveredKeys?: unknown } }).coverage
      if (cov && Array.isArray(cov.uncoveredKeys)) uncoveredKeysRef.current = (cov.uncoveredKeys as unknown[]).filter((k): k is string => typeof k === 'string')
    } catch {
      ev = { ...ev, degraded: true, degradedReason: 'network', evaluatorNote: 'Not evaluated live — the AI evaluator was unreachable.' }
    }

    // ── 7b. Brain unavailable → never silently accept ─────────────────
    // (An out-of-credits AI account once made every answer "score 5, move on".)
    // Report it once (ops log + Control Room), and PROBE a trivial answer —
    // "print('hello world')", one-liners, an empty-ish reply — instead of accepting it.
    if (ev.degraded) {
      if (!brainDownReportedRef.current) { brainDownReportedRef.current = true; reportVoice('brain_unavailable', ev.degradedReason ?? 'unknown') }
      if (isTrivialAnswer(responseText) && !ev.shouldAskFollowUp) {
        ev = { ...ev, shouldAskFollowUp: true, followUpQuestion: pick(DEGRADED_PROBES) }
      }
    }
    // A trivial non-answer that scored very low ("print('hello world')" to a real
    // coding question) gets ONE honest probe before moving on — never a silent pass.
    else if (!ev.shouldAskFollowUp && followUpCountRef.current === 0 && (ev.score ?? 5) <= 2 && isTrivialAnswer(responseText)) {
      ev = { ...ev, shouldAskFollowUp: true, followUpQuestion: pick(LOW_SCORE_PROBES) }
    }

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
        if ((await speakText(redirect, { bargeIn: true })) !== 'interrupted') await delay(1500)
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
    // Adaptive coverage: if a must-have skill is still unassessed, promote the
    // first remaining question that targets it so it is reached in time.
    promoteForCoverage(currentQIdxRef.current + 1)
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
      if ((await speakText(ev.speech?.followUpQuestion || ev.followUpQuestion, { bargeIn: true })) !== 'interrupted') await delay(1500)
      startListening()
    } else {
      // Speak quality-based transition — section changes get their own preamble in moveToQuestion
      // Active mirroring: on a substantive answer, briefly confirm it back before
      // moving on — but not on back-to-back turns, so it never feels scripted.
      const confirmBack = (ev.confirmBack ?? '').trim()
      if (confirmBack && wordCount >= 30 && !lastConfirmBackRef.current) {
        lastConfirmBackRef.current = true
        const text = isSectionChange ? confirmBack : `${confirmBack} ${pick(TR_CONFIRM_NEXT)}`
        addTranscript({ speaker: 'ai', text, type: 'transition' })
        const spokenBack = (ev.speech?.confirmBack ?? '').trim() || confirmBack
        await speakText(isSectionChange ? spokenBack : text.replace(confirmBack, spokenBack))
        await delay(400)
      } else {
        lastConfirmBackRef.current = false
        if (!isSectionChange) {
          const transText = (ev.score ?? 5) >= 6 ? pick(TR_GOOD) : pick(TR_BRIEF)
          addTranscript({ speaker: 'ai', text: transText, type: 'transition' })
          await speakText(transText)
          await delay(400)
        }
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

    // Fixpack 6 #4: duplicate / stale advance → ignore; an already-asked
    // question (e.g. re-inserted) → skip it.
    if (idx <= lastAskedIdxRef.current) return
    // Segment balance (30-min envelope): once at least one question is done,
    // don't START another if it would eat the culture-fit reserve — hand over
    // to the Likert segment instead. The time-up gate still wins if it fires.
    if (!isDemoRef.current && !cultureFitDoneRef.current && askedQuestionIdsRef.current.size > 0
      && timeRemainingRef.current > 0 && timeRemainingRef.current < CULTURE_FIT_RESERVE_SEC + MIN_QUESTION_SEC) {
      await beginCultureFit(); return
    }
    if (qs[idx]?.id && askedQuestionIdsRef.current.has(qs[idx].id)) { lastAskedIdxRef.current = idx; await moveToQuestion(idx + 1); return }
    lastAskedIdxRef.current = idx
    if (qs[idx]?.id) askedQuestionIdsRef.current.add(qs[idx].id)

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

    // Observe & Defend: the work-capture timeline + autosave are live only while
    // the task is the current question (its follow-ups included).
    if (q.kind === 'worksample') {
      setEditorTab('code'); setWsTab('task')
      codeContentRef.current = editorValue()
      const task = workTaskRef.current
      if (task && !codeContentRef.current.trim() && task.starterCode) {
        setCodeContent(task.starterCode); codeContentRef.current = task.starterCode; setCodeLanguage(task.language)
      }
      wsActiveRef.current = true
      if (!wsStartRef.current) wsStartRef.current = Date.now() - wsResumeMsRef.current
      setWsStarted(true)
      pushEvent({ t: wsT(), k: 'open', lang: codeLanguageRef.current })
      maybeSnapshot(true)
    } else if (wsActiveRef.current) {
      flushEditWindow(); maybeSnapshot(true)
      void saveWorkspaceRef.current?.()
      wsActiveRef.current = false
    }

    // Auto-focus the relevant editor tab (the pane is always present now).
    if (q.kind === 'worksample') { /* handled above */ }
    else if (q.section === 'whiteboard') setEditorTab('whiteboard')
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
    // Barge-in allowed except on whiteboard questions (they need the board first).
    if ((await speakText(q.question, { bargeIn: q.section !== 'whiteboard' && q.kind !== 'worksample' })) === 'interrupted') {
      startListening()
      return
    }

    // Observe & Defend: pause the conversation while they work; Submit resumes it.
    if (q.kind === 'worksample') {
      codeTriggerShownRef.current = true
      const cue = 'Write your solution in the Code tab. You can run it and check the tests as often as you like. Press Submit solution when you are done, and then I will ask you to walk me through it.'
      addTranscript({ speaker: 'ai', text: cue, type: 'transition' })
      await speakText(cue)
      setWsTab('code')
      waitingWorkSampleRef.current = true
      setWaitingWorkSample(true)
      return
    }

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
      // Logistics (comp / notice / work-auth) is evaluated separately and is
      // recruiter-only — never fed into competency scoring.
      transcript:       transcriptRef.current.filter(e => e.segment !== 'logistics'),
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
        status: 'completed', completedAt: new Date().toISOString(), terminationReason: reason, questionResponses: responsesRef.current,
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
      body: JSON.stringify({ status: 'completed', completedAt: new Date().toISOString(), terminationReason: TERMINATION_REASONS.COMPLETED, questionResponses: responsesRef.current }),
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
    // An EMPTY board is never accepted silently: nudge once; on a second Done,
    // let them explain verbally instead.
    if (!whiteboardHasInkRef.current && !whiteboardEmptyNudgedRef.current) {
      whiteboardEmptyNudgedRef.current = true
      const nudge = 'The whiteboard still looks empty. Sketch your design first — or press Done again and just talk me through it.'
      addTranscript({ speaker: 'ai', text: nudge, type: 'transition' })
      await speakText(nudge)
      return
    }
    setWaitingWhiteboard(false)
    const transition = whiteboardHasInkRef.current
      ? 'Thank you. I can see your diagram. Walk me through your thinking.'
      : 'No problem — talk me through your design out loud.'
    addTranscript({ speaker: 'ai', text: transition, type: 'transition' })
    if ((await speakText(transition, { bargeIn: true })) !== 'interrupted') await delay(800)
    startListening()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addTranscript, speakText, startListening])

  // Observe & Defend: Submit solution → save → ask them to walk through it.
  // From here the EXISTING adaptive brain runs (≤3 follow-ups), grounded in the work.
  const handleWorkSampleDone = useCallback(async () => {
    if (!waitingWorkSampleRef.current) return
    waitingWorkSampleRef.current = false
    setWaitingWorkSample(false)
    flushEditWindow(); maybeSnapshot(true)
    // Run the tests on what they're submitting (unless they just did): the brain
    // must judge the code by real results, not "TEST RESULTS: not run".
    const submitted = editorValue()
    if (submitted.trim() && submitted !== lastTestedCodeRef.current) await runWorkspace('tests')
    pushEvent({ t: wsT(), k: 'submit' })
    await saveWorkspaceRef.current?.(true)
    setWsTab('code')
    const transition = 'Thank you, I can see your solution. Walk me through your approach: how you structured it, and why you made the choices you did.'
    addTranscript({ speaker: 'ai', text: transition, type: 'transition' })
    if ((await speakText(transition, { bargeIn: true })) !== 'interrupted') await delay(600)
    startListening()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addTranscript, speakText, startListening])

  // Between-question adaptation (role skill map coverage from evaluate-response).
  const promoteForCoverage = (nextIdx: number) => {
    const keys = uncoveredKeysRef.current
    const qs = questionsRef.current
    if (!keys.length || nextIdx >= qs.length) return
    const hits = (q: LocalQuestion) => { const t = `${q.question} ${q.techTag}`.toLowerCase(); return keys.some((k) => k.length > 2 && t.includes(k)) }
    if (hits(qs[nextIdx])) return
    const j = qs.findIndex((q, i) => i > nextIdx && !askedQuestionIdsRef.current.has(q.id) && q.kind !== 'worksample' && hits(q))
    if (j < 0) return
    const reordered = [...qs]
    const [picked] = reordered.splice(j, 1)
    reordered.splice(nextIdx, 0, picked)
    questionsRef.current = reordered
    setQuestions(reordered)
  }

  const buildWorkContext = () => {
    const task = workTaskRef.current
    if (!task) return undefined
    return {
      task: `${task.title}. ${task.prompt}`,
      language: codeLanguageRef.current,
      code: editorValue(),
      tests: lastTestsSummaryRef.current,
      timeline: digest(timelineRef.current).text,
    }
  }

  const runWorkspace = async (kind: 'run' | 'tests') => {
    if (!workTaskRef.current || runBusy) return
    setRunBusy(kind); setExecNote(null)
    flushEditWindow(); maybeSnapshot(true)
    const t = wsT()
    const sentCode = editorValue()
    try {
      const r = await fetch('/api/interview/workspace/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId, code: sentCode, language: codeLanguageRef.current, kind, ...(kind === 'run' && customStdin !== null ? { stdin: customStdin } : {}) }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        setExecNote(d.message ?? 'Couldn\'t run your code. Please try again.')
        pushEvent({ t, k: kind, ok: false })
        return
      }
      if (kind === 'run') {
        setRunOutput(d as RunOutputShape); setWsTab('output')
        pushEvent({ t, k: 'run', ok: d.status === 'ok' })
      } else {
        setTestResults(d as TestResultShape); setWsTab('tests')
        lastTestsSummaryRef.current = `${d.passed}/${d.total} passing (incl. ${(d.results as TestResultShape['results']).filter((x) => x.hidden).length} hidden)`
        lastTestedCodeRef.current = sentCode
        pushEvent({ t, k: 'tests', ok: true, passed: d.passed, total: d.total })
      }
      if (typeof d.executionsLeft === 'number' && d.executionsLeft <= 5) setExecNote(`${d.executionsLeft} runs left for this interview`)
    } catch {
      setExecNote('Couldn\'t reach the code runner. Check your connection and try again.')
    } finally { setRunBusy(null) }
  }

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

  /* ── Logistics / filtering segment ────────────────────────── */
  // Resolves location/work-mode (negotiated against the position's constraints),
  // notice/start, comp expectation and work authorization. The server holds the
  // constraints (the comp band never reaches the browser) and drives each turn.
  // Hard-capped (~2.5 min / 7 replies); reuses the warm-up reply routing so Q&A
  // silence timers stay off. Build-01 termination handling applies to every
  // reply; the time-up gate still wins. Demo runs skip it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const runLogistics = useCallback(async (): Promise<'done' | 'ended'> => {
    if (isDemoRef.current || wrapUpFiredRef.current) return 'done'
    warmupActiveRef.current = true
    const turns: SegmentTurn[] = []
    const startedAt = Date.now()
    const finalize = (completed: boolean) => {
      if (!turns.some(t => t.speaker === 'candidate')) return
      fetch('/api/interview/logistics', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId, action: 'finalize', turns, completed }),
      }).catch(() => {})
    }
    const say = async (text: string, bargeIn = true, topic?: string) => {
      turns.push({ speaker: 'ai', text, ...(topic ? { topic } : {}) })
      addTranscript({ speaker: 'ai', text, type: 'transition', segment: 'logistics' })
      await speakText(text, { bargeIn })
    }

    await say(logisticsIntro(), true, 'location')
    let silent = 0
    let budgetMs = LOGISTICS_MAX_MS   // server may extend it for recruiter knockout questions
    while (!wrapUpFiredRef.current) {
      const reply = await awaitWarmupReply(20000)
      if (wrapUpFiredRef.current) break
      const term = detectTerminationIntent(reply)
      if (term) { finalize(false); await endByTermination(term.reason); return 'ended' }
      if (reply) {
        silent = 0
        turns.push({ speaker: 'candidate', text: reply })
        addTranscript({ speaker: 'candidate', text: reply, type: 'transition', segment: 'logistics' })
      } else {
        // Fixpack 6 #4: record the silence so the server knows this question was
        // asked and unanswered — it moves on instead of re-asking it.
        silent += 1
        turns.push({ speaker: 'candidate', text: '[no response]' })
      }
      const wrapNow = silent >= 2 || Date.now() - startedAt > budgetMs
      setPhase('processing')
      let next: { say?: string; done?: boolean; budgetMs?: number; topic?: string } = {}
      try {
        const r = await fetch('/api/interview/logistics', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interviewId, action: 'turn', turns, wrapNow }),
        })
        if (r.ok) next = await r.json()
      } catch { /* fall through — never block the interview */ }
      if (typeof next.budgetMs === 'number' && next.budgetMs > budgetMs) budgetMs = Math.min(next.budgetMs, LOGISTICS_HARD_CAP_MS)
      if (wrapUpFiredRef.current) break
      if (!next.say) break
      await say(next.say, !(next.done || wrapNow), next.topic)   // the closing line isn't interruptible
      if (next.done || wrapNow) break
    }
    finalize(!wrapUpFiredRef.current)
    return wrapUpFiredRef.current ? 'ended' : 'done'
  }, [interviewId, addTranscript, speakText, awaitWarmupReply, endByTermination, setPhase])

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
        body: JSON.stringify({ beat: 'opener', firstName, role: position.title, dayContext: ctx, interviewerName: interviewerRef.current.name }),
      })
      if (r.ok) opener = (await r.json()).line
    } catch { /* fall back below */ }
    if (!opener) opener = buildOpener({ firstName, ctx, role: position.title, orgName: position.company, name: interviewerRef.current.name })
    addTranscript({ speaker: 'ai', text: opener, type: 'intro' })
    await speakText(opener, { bargeIn: true })
    const reply1 = await awaitWarmupReply(15000)

    // Preserve Build-01: honor explicit termination even during warm-up.
    const term1 = detectTerminationIntent(reply1)
    if (term1) { warmupActiveRef.current = false; warmupCaptureRef.current = null; await endByTermination(term1.reason); return }

    // Beat 2 — ONE reactive follow-up conditioned on the actual reply.
    let followup = ''
    try {
      const r = await fetch('/api/interview/warmup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateReply: reply1, firstName, role: position.title, dayContext: ctx, interviewerName: interviewerRef.current.name }),
      })
      if (r.ok) followup = (await r.json()).line
    } catch { /* fall back below */ }
    if (!followup) followup = reply1 ? 'Thanks for sharing that — glad you could make it.' : 'No worries — glad you could join.'
    addTranscript({ speaker: 'ai', text: followup, type: 'transition' })
    await speakText(followup, { bargeIn: true })
    const reply2 = await awaitWarmupReply(12000)
    const term2 = detectTerminationIntent(reply2)
    if (term2) { warmupActiveRef.current = false; warmupCaptureRef.current = null; await endByTermination(term2.reason); return }

    // Logistics / filtering segment (~2–3 min) — after warm-up, before Q&A.
    if (await runLogistics() === 'ended' || wrapUpFiredRef.current) {
      warmupActiveRef.current = false; warmupCaptureRef.current = null
      return
    }

    // Beat 3 — signposted, firm transition into the evaluation.
    const transition = buildTransition()
    addTranscript({ speaker: 'ai', text: transition, type: 'transition' })
    await speakText(transition, { bargeIn: true })
    await awaitWarmupReply(7000)  // brief "ready?" — don't require, time-box firmly

    warmupActiveRef.current = false
    warmupCaptureRef.current = null
    await delay(600)
    await moveToQuestion(0)
  }, [candidate, position, addTranscript, speakText, awaitWarmupReply, moveToQuestion, endByTermination, runLogistics])

  /* ── Fraud recording (interview-long; batch-diarized post-interview) ── */
  const startFraudRecording = useCallback(async () => {
    if (fraudRecorderRef.current || typeof MediaRecorder === 'undefined') return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      fraudStreamRef.current = stream
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm'
      // 32 kbps Opus: plenty for speech/diarization, keeps the retained
      // playback recording small (~7 MB per 30 min).
      const rec = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 32000 })
      rec.ondataavailable = (e) => { if (e.data.size > 0) fraudChunksRef.current.push(e.data) }
      rec.start(2000)
      recordingStartedAtRef.current = Date.now()
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
      // NOT keepalive: browsers cap keepalive bodies at 64 KB and reject larger
      // ones outright, so the interview recording would never arrive. The
      // completion screen stays open long enough for a normal upload.
      try {
        fetch(`/api/interview/fraud-diarize?interviewId=${encodeURIComponent(interviewId)}`, {
          method: 'POST', headers: { 'Content-Type': blob.type }, body: blob,
        }).catch(() => {})
      } catch {}
      // Retain the same recording for recruiter session playback (consented;
      // server skips demo runs).
      const startedAt = recordingStartedAtRef.current
      if (startedAt && !isDemoRef.current) {
        const qs = new URLSearchParams({ interviewId, startedAt: new Date(startedAt).toISOString(), durationMs: String(Date.now() - startedAt) })
        try { fetch(`/api/interview/recording?${qs}`, { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob }).catch(() => {}) } catch {}
      }
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
      { area: 'ai',         line: `On the left is me, ${interviewerRef.current.name} — this panel lights up when I'm speaking or listening.` },
      { area: 'video',      line: "Just below me is your camera. Camera checks run in your browser and no video is recorded; your audio is recorded for this interview. Keep your face comfortably in view." },
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
    if (!consentOk || !mediaOk) return  // no capture without both consents
    void unlockTtsAudio()   // inside the click: lets the streamed voice play (iOS/Safari autoplay rules)
    startFraudRecording()  // begin the interview-long recording for fraud diarization
    if (BARGE_IN_CONFIG.enabled && !bargeInRef.current) {
      bargeInRef.current = new BargeInDetector()
      void bargeInRef.current.ensureStarted()   // pre-open so the first arm has no latency
    }

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

    // Observe & Defend: one hands-on task in technical (first) / hybrid (after two questions).
    const wsTask = workTaskRef.current
    if (wsTask && !qs.some((x) => x.id === WS_QUESTION_ID)) {
      const wsQ: LocalQuestion = {
        id: WS_QUESTION_ID, kind: 'worksample', section: 'technical', isPreset: true,
        question: `For this part, a hands-on task: ${wsTask.title}. The details are in the Task tab of your workspace.`,
        expectedKeyPoints: [], techTag: wsTask.title, estimatedMinutes: wsTask.minutes,
      }
      const at = workModeRef.current === 'hybrid' ? Math.min(2, qs.length) : 0
      qs = [...qs.slice(0, at), wsQ, ...qs.slice(at)]
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
    candidate, position, interview, interviewId, consentOk, mediaOk,
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
    const contRes = await speakText(continuePhrase, { bargeIn: true })
    if (isMountedRef.current && phaseRef.current !== 'completed' && phaseRef.current !== 'closing') {
      if (contRes !== 'interrupted') await delay(500)
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
    if (wsActiveRef.current) {   // Observe & Defend: coalesce edits into ~5 s windows
      const now = wsT()
      const w = editWindowRef.current ?? (editWindowRef.current = { start: now, n: 0, d: 0 })
      if (delta > 0) w.n += delta; else w.d += -delta
      if (now - w.start > 5000) flushEditWindow()
      maybeSnapshot()
      wsDirtyRef.current = true
    }
    if (codeDebounceRef.current) clearTimeout(codeDebounceRef.current)
    codeDebounceRef.current = setTimeout(() => {
      updateSessionCode(v, codeLanguage)
      setDraftSavedAt(Date.now())   // visible "Draft saved" indicator
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
        pushEvent({ t: wsT(), k: 'paste', n: size })   // Observe & Defend timeline
      })
      editorRef.current = editor as typeof editorRef.current
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
      // The brain can't see the canvas, so a placeholder "diagram attached" was
      // being evaluated as the answer (an EMPTY board passed too). Instead:
      // empty → nudge; drawn → ask them to walk through it (their words are the answer).
      void (async () => {
        stopListening()
        const line = whiteboardHasInkRef.current
          ? 'Thank you, I can see your sketch. Walk me through it.'
          : 'The whiteboard looks empty. Sketch it first, or just talk me through your answer.'
        addTranscript({ speaker: 'ai', text: line, type: 'transition' })
        if ((await speakText(line, { bargeIn: true })) !== 'interrupted') await delay(500)
        startListening()
      })()
      return
    }
    if (waitingWorkSampleRef.current) { void handleWorkSampleDone(); return }
    submitCodeAnswer()
  }
  // Whether the base Submit is actionable right now (per active tab).
  const canSubmit = editorTab === 'whiteboard'
    ? (waitingWhiteboard || phase === 'listening')
    : waitingWorkSample ? codeContent.trim().length > 0
    : (phase === 'listening' && codeContent.trim().length > 0)

  /* ═══════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════ */

  if (dbLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--lv-surface-sunken)' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ fontSize: 14, color: 'var(--lv-text-muted)' }}>Loading your interview…</div>
        </div>
      </div>
    )
  }

  if (dbError || !interview || !candidate || !position) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--lv-surface-sunken)' }}>
        <div style={{ textAlign: 'center', maxWidth: 380, color: 'var(--lv-text-muted)' }}>
          <AlertTriangle size={40} style={{ margin: '0 auto 12px', color: 'var(--lv-danger)' }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--lv-brand)' }}>
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
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--lv-bg)', padding: 32 }}>
        <div style={{ textAlign: 'center', color: 'var(--lv-text)', maxWidth: 340 }}>
          <Monitor size={28} aria-hidden="true" style={{ marginBottom: 16 }} />
          <div style={{ fontFamily: 'var(--lv-font-sans)', fontSize: 22, fontWeight: 600, marginBottom: 12 }}>Desktop Required</div>
          <div style={{ fontSize: 14, color: 'var(--lv-text-muted)', lineHeight: 1.6 }}>
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
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--lv-surface-sunken)' }}>
          <div style={{ textAlign: 'center', maxWidth: 480, padding: 40 }}>
            <div aria-hidden="true" style={{ width: 44, height: 44, borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F4F5', color: '#52525B' }}><BarChart3 size={20} /></div>
            <div style={{ fontFamily: 'var(--lv-font-sans)', fontSize: 28, fontWeight: 600, color: 'var(--lv-text)', marginBottom: 12 }}>Your sample report is ready</div>
            <div style={{ fontSize: 16, color: 'var(--lv-text-muted)', lineHeight: 1.7 }}>
              Great job, {candidate.name.split(' ')[0]}! We&apos;ve scored your responses and run the same integrity checks a real candidate gets. Open your evidence report to see scores, strengths, concerns and the integrity panel.
            </div>
            <button
              onClick={() => router.push(`/report/${interviewId}?demo=1`)}
              style={{ marginTop: 28, padding: '14px 28px', background: 'var(--lv-gradient-brand)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer', boxShadow: 'none', letterSpacing: '-0.01em' }}
            >
              View your sample report →
            </button>
            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--lv-text-muted)' }}>
              This is a demo — your data is temporary and isn&apos;t shared with any employer.
            </div>
          </div>
        </div>
      )
    }
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--lv-surface-sunken)' }}>
        <div style={{ textAlign: 'center', maxWidth: 480, padding: 40 }}>
          <div aria-hidden="true" style={{ width: 44, height: 44, borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--lv-success-soft)', color: 'var(--lv-success)' }}><Check size={22} /></div>
          <div style={{ fontFamily: 'var(--lv-font-sans)', fontSize: 28, fontWeight: 600, color: 'var(--lv-text)', marginBottom: 12 }}>Interview Complete</div>
          <div style={{ fontSize: 16, color: 'var(--lv-text-muted)', lineHeight: 1.7 }}>
            Thank you, {candidate.name.split(' ')[0]}. Your interview has been submitted. The team at {position.company} will be in touch with next steps.
          </div>
          <div style={{ marginTop: 32, padding: '14px 24px', background: 'color-mix(in srgb, var(--lv-success) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--lv-success) 22%, transparent)', borderRadius: 8, color: 'var(--lv-success)', fontSize: 13, fontWeight: 600 }}>
            You may now close this window.
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'waiting') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--lv-surface-sunken)', gap: 32 }}>
        <ScreenLogo height={40} tone="auto" />
        <div style={{ textAlign: 'center', maxWidth: 520, padding: '40px 48px', background: 'var(--lv-surface)', borderRadius: 8, border: '1px solid var(--lv-border)', boxShadow: 'none' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px', background: 'var(--lv-brand-soft)', color: 'var(--lv-brand)', border: '1px solid var(--lv-brand-soft-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mic size={24} />
          </div>
          <div style={{ fontFamily: 'var(--lv-font-sans)', fontSize: 22, fontWeight: 600, color: 'var(--lv-text)', marginBottom: 8 }}>Your Interview is Ready</div>
          <div style={{ fontSize: 14, color: 'var(--lv-text-muted)', marginBottom: 4 }}>{position.title} · {position.company}</div>
          <div style={{ fontSize: 13, color: 'var(--lv-text-muted)', marginBottom: 28 }}>Duration: {position.interviewDuration ?? PRODUCTION_INTERVIEW_MINUTES} minutes · AI Interviewer: {interviewer.name}</div>
          <div style={{ fontSize: 13, color: 'var(--lv-text-muted)', lineHeight: 1.7, marginBottom: 28, padding: '14px 16px', background: 'var(--lv-surface-sunken)', borderRadius: 6 }}>
            <strong>Before you start:</strong> ensure you are in a quiet place, your microphone is working, and you have a stable internet connection. Speak clearly and take your time with each answer.
          </div>
          {/* Soft consent gate (I-P0-1): the interview cannot START until the
              candidate explicitly acknowledges the recording/data-processing
              notice. Acknowledgement is logged with a timestamp server-side. */}
          {(!consentOk || consentChecked) && (
            <div style={{ marginBottom: 14 }}>
              <ConsentCheckbox
                checked={consentChecked}
                disabled={consentSaving || consentOk}
                note={consentSaving ? 'Recording your consent…' : consentOk ? 'Consent recorded' : undefined}
                onChange={async (checked) => {
                  if (!checked || consentOk) return
                  setConsentChecked(true); setConsentSaving(true); setConsentError(null)
                  try {
                    const r = await fetch(`/api/schedule/${interviewId}/consent`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'interview', surface: 'room' }) })
                    if (!r.ok) throw new Error()
                    setConsentOk(true)
                  } catch {
                    setConsentChecked(false)
                    setConsentError('We couldn’t record your consent — please check your connection and tick the box again.')
                  } finally { setConsentSaving(false) }
                }}>
                I consent to this interview being <strong>recorded and monitored</strong> and to my responses being processed and evaluated by Levl1&apos;s AI for this hiring assessment. I understand I can withdraw consent at any time to stop the interview.
              </ConsentCheckbox>
              {consentError && <div role="alert" style={{ marginTop: 8, fontSize: 13, color: 'var(--lv-danger)', fontWeight: 600, textAlign: 'left' }}>{consentError}</div>}
            </div>
          )}
          {/* Captured-data notice + the SEPARATE media consent (privacy build).
              Shown when it wasn't already given on the join page. */}
          {!mediaOk && (
            <div style={{ marginBottom: 14 }}>
              {privacy && (
                <div style={{ marginBottom: 12, padding: '12px 14px', background: 'var(--lv-surface-sunken)', borderRadius: 6 }}>
                  <CaptureNotice orgName={privacy.orgName} mediaRetentionDays={privacy.mediaRetentionDays} transcriptRetentionDays={privacy.transcriptRetentionDays} />
                </div>
              )}
              <MediaConsent interviewId={interviewId} surface="room" consented={mediaOk} onConsented={() => setMediaOk(true)} />
            </div>
          )}
          <button
            onClick={startInterview}
            disabled={!consentOk || !mediaOk}
            style={{ width: '100%', padding: '14px 0', background: consentOk && mediaOk ? 'var(--lv-gradient-brand)' : 'var(--lv-border-strong)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: consentOk && mediaOk ? 'pointer' : 'not-allowed', letterSpacing: '-0.01em' }}
          >
            Start Interview →
          </button>
          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--lv-text-muted)' }}>{consentOk && mediaOk ? 'Consent acknowledged. You can begin when ready.' : 'Acknowledge both consent items above to begin.'}</div>
        </div>
      </div>
    )
  }

  /* ── Active interview UI ───────────────────────────────────── */
  const currentQ   = questions[currentQIdx]
  const timerColor = timeRemaining <= 120 ? 'var(--lv-danger)' : timeRemaining <= 300 ? 'var(--lv-warning)' : 'var(--lv-text)'
  const fmtClock = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
  const lastAiIdx = (() => { for (let i = transcript.length - 1; i >= 0; i--) if (transcript[i].speaker === 'ai') return i; return -1 })()
  const qPct = questions.length ? Math.round((Math.min(currentQIdx + (currentQ ? 1 : 0), questions.length) / questions.length) * 100) : 0

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--lv-bg)', overflow: 'hidden' }}>

      {/* Tier-1 proctoring (Build 01-A) — the single live capture instance now renders
          INLINE in the top-left video slot below (one camera stream + one CV client). */}
      {/* Demo conversion affordance — self-gates on ?demo=1 (Build 05). */}
      <DemoSalesCTA label="Talk to sales" />

      {/* ── Header ── */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: 56, background: 'var(--lv-surface)', borderBottom: '1px solid var(--lv-border)', flexShrink: 0 }}>
        <ScreenLogo height={32} tone="auto" />
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text-muted)', textAlign: 'center' }}>
          {candidate.name} · {position.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} color={timerColor} aria-hidden="true" />
            <span className="font-mono" aria-label={`Time remaining ${fmt(timeRemaining)}`} style={{ fontSize: 15, fontWeight: 600, color: timerColor, letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums' }}>{fmt(timeRemaining)}</span>
          </div>
          <button
            onClick={handleEndInterviewRequest}
            style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1px solid var(--lv-danger-border)', background: 'color-mix(in srgb, var(--lv-danger) 6%, transparent)', color: 'var(--lv-danger)', cursor: 'pointer' }}
          >
            End Interview
          </button>
        </div>
      </header>

      {/* Auto-tour banner — short narrated walkthrough; skippable; ends before Q1. */}
      {/* Tour focus ring + pointer arrow — tracks the highlighted area. */}
      {tourActive && tourRect && (() => {
        const above = tourRect.top > 120   // room above? point down from above : point up from below
        const arrowTop = above ? tourRect.top - 52 : tourRect.top + tourRect.height + 10
        const arrowLeft = tourRect.left + tourRect.width / 2
        return (
          <>
            <div style={{
              position: 'fixed', top: tourRect.top - 5, left: tourRect.left - 5,
              width: tourRect.width + 10, height: tourRect.height + 10,
              borderRadius: 8, border: '2px solid var(--lv-brand)', pointerEvents: 'none', zIndex: 75,
              boxShadow: '0 0 0 4px color-mix(in srgb, var(--lv-brand) 14%, transparent)',
              transition: 'top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease',
              animation: 'tourRing 1.4s ease-in-out infinite',
            }} />
            <div style={{
              position: 'fixed', top: arrowTop, left: arrowLeft, transform: 'translateX(-50%)',
              zIndex: 76, pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--lv-brand)', color: '#fff', borderRadius: 6, padding: '6px 12px',
              fontSize: 13, fontWeight: 600, letterSpacing: '0.01em', whiteSpace: 'nowrap',
              boxShadow: 'var(--lv-shadow-sm)',
              animation: 'tourBounce 1s ease-in-out infinite',
            }}>
              {above ? <>Look here <ArrowDown size={14} aria-hidden="true" /></> : <><ArrowUp size={14} aria-hidden="true" /> Look here</>}
            </div>
          </>
        )
      })()}

      {tourActive && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 80, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--lv-surface)', color: 'var(--lv-text)', border: '1px solid var(--lv-border)', borderRadius: 8, padding: '8px 10px 8px 18px', boxShadow: 'var(--lv-shadow-md)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#818CF8', animation: 'pulseDot 1.2s ease-in-out infinite' }} />
            Quick interface tour…
          </span>
          <button onClick={skipTour} style={{ padding: '6px 14px', borderRadius: 100, border: 'none', cursor: 'pointer', background: 'var(--lv-brand)', color: '#fff', fontSize: 13, fontWeight: 600 }}>Skip tour</button>
        </div>
      )}

      {/* ── Likert culture-fit segment (Build 08) — after Q&A, before closing ── */}
      {cultureFitActive && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'var(--lv-overlay)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ width: 640, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', background: 'var(--lv-surface)', borderRadius: 8, padding: '24px 26px', boxShadow: 'var(--lv-shadow-lg)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--lv-text-muted)', marginBottom: 4 }}>Culture &amp; values fit · separate from your technical score</div>
            <h2 style={{ fontFamily: 'var(--lv-font-sans)', fontSize: 22, fontWeight: 600, color: 'var(--lv-brand)', margin: '0 0 6px' }}>A few quick statements</h2>
            <p style={{ fontSize: 14, color: 'var(--lv-text-muted)', margin: '0 0 18px' }}>For each statement, choose how much you agree. There are no right answers — this is about how you like to work.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {cultureFitItems.map((it, idx) => (
                <div key={it.id}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--lv-text-body)', marginBottom: 8, lineHeight: 1.5 }}>{idx + 1}. {it.prompt}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                    {LIKERT_OPTIONS.map((opt) => {
                      const sel = cultureFitAnswers[it.id]?.value === opt.value
                      return (
                        <button key={opt.value} onClick={() => setCultureFitAnswers((a) => ({ ...a, [it.id]: { value: opt.value, label: opt.label } }))}
                          style={{ padding: '8px 6px', borderRadius: 6, cursor: 'pointer', border: `1px solid ${sel ? 'var(--lv-brand)' : 'var(--lv-border)'}`, background: sel ? 'var(--lv-brand)' : 'var(--lv-surface-sunken)', color: sel ? '#fff' : 'var(--lv-text-body)', fontSize: 11, fontWeight: 600, lineHeight: 1.25, transition: 'all 0.12s' }}>
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 22 }}>
              <span style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>{Object.keys(cultureFitAnswers).length} of {cultureFitItems.length} answered</span>
              <button onClick={submitCultureFit} disabled={Object.keys(cultureFitAnswers).length < cultureFitItems.length}
                style={{ marginLeft: 'auto', padding: '11px 26px', borderRadius: 6, border: 'none', fontSize: 14, fontWeight: 600, cursor: Object.keys(cultureFitAnswers).length < cultureFitItems.length ? 'not-allowed' : 'pointer', background: Object.keys(cultureFitAnswers).length < cultureFitItems.length ? 'var(--lv-border)' : 'var(--lv-gradient-brand)', color: Object.keys(cultureFitAnswers).length < cultureFitItems.length ? 'var(--lv-text-muted)' : '#fff' }}>
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
          <div style={{ padding: '10px 16px', background: 'color-mix(in srgb, var(--lv-warning) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--lv-warning) 30%, transparent)', borderRadius: 6, fontSize: 13, fontWeight: 600, color: 'var(--lv-warning)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span>{messageFromRecruiter}</span>
            <button onClick={() => setMessageFromRecruiter(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--lv-warning)' }}><X size={14} /></button>
          </div>
        )}

        {/* ════ Question Display — FULL WIDTH across the top (compact) ════ */}
        <div data-tour="question" style={{ background: 'var(--lv-surface)', borderRadius: 8, border: '1px solid var(--lv-border)', padding: '10px 16px 12px', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, outline: tourHighlight === 'question' ? '2px solid var(--lv-brand)' : 'none', outlineOffset: 2, transition: 'outline 0.2s' }}>
          {/* compact metadata + slim progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, fontWeight: 600, color: 'var(--lv-text-muted)', letterSpacing: '0.04em' }}>
            {currentQ && <span style={{ textTransform: 'uppercase' }}>{SECTION_LABEL[currentQ.section]}</span>}
            {currentQ && <span aria-hidden="true">·</span>}
            {questions.length > 0 && <span>Question {Math.min(currentQIdx + 1, questions.length)} of {questions.length}</span>}
            {questions.length > 0 && (
              <div role="progressbar" aria-label="Interview progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={qPct}
                style={{ marginLeft: 'auto', width: 140, height: 3, borderRadius: 2, background: 'var(--lv-border)', overflow: 'hidden' }}>
                <div style={{ width: `${qPct}%`, height: '100%', background: 'var(--lv-brand)', transition: 'width 0.4s ease' }} />
              </div>
            )}
          </div>
          {currentQ ? (
            <>
              <p style={{ fontSize: 17, fontWeight: 500, color: 'var(--lv-text)', lineHeight: 1.5, margin: 0 }}>{displayText(currentQ.question)}</p>
              {currentQ.section === 'whiteboard' && (
                <div style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>Use the Whiteboard tab to sketch your answer.</div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 15, color: 'var(--lv-text-muted)', lineHeight: 1.5 }}>
              {phase === 'intro' ? 'Your interview is starting…' : 'Preparing next question…'}
            </div>
          )}
        </div>

        {/* ════ TWO COLUMNS ════ */}
        <div className="iv-cols" style={{ flex: 1, minHeight: 0, display: 'flex', gap: 16 }}>

          {/* ──── LEFT: AI window (top) + candidate video (below) — stacked & EQUAL ──── */}
          <div className="iv-left" style={{ width: 400, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
            <div data-tour="ai" className="iv-ai-fill" style={{ flex: 1.35, minHeight: 0, display: 'flex', borderRadius: 8, outline: tourHighlight === 'ai' ? '2px solid var(--lv-brand)' : 'none', outlineOffset: 2, transition: 'outline 0.2s' }}>
              <AIVisualizer
                phase={waitingWorkSample || waitingWhiteboard ? 'questioning' : phase /* display only: they're working, not listening */}
                isWarmingUp={isWarmingUp}
                liveTranscriptLength={liveTranscript.length}
                candidateName={candidate.name}
                positionTitle={position.title}
                compact
              />
            </div>
            {/* Candidate video — same IntegrityMonitor feed/CV (inline variant),
                unchanged. Only the surrounding frame + status bar are presentation. */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div data-tour="video" style={{ flex: 1, minHeight: 0, position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--lv-border)', background: 'var(--lv-surface-sunken)', outline: tourHighlight === 'video' ? '2px solid var(--lv-brand)' : 'none', outlineOffset: 2, transition: 'outline 0.2s' }}>
                <IntegrityMonitor interviewId={interviewId} active={true} variant="inline" onPresence={handlePresence} />
              </div>
              {/* mic + privacy status */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, color: 'var(--lv-text-muted)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: micFailed ? 'var(--lv-warning)' : 'var(--lv-text-muted)' }}>
                  {micFailed ? <MicOff size={12} aria-hidden="true" /> : <Mic size={12} aria-hidden="true" />}
                  {micFailed ? 'Mic unavailable' : isListening ? 'Mic on · listening' : 'Mic on'}
                </span>
                <button type="button" onClick={() => setPrivacyOpen((o) => !o)} aria-expanded={privacyOpen}
                  style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 4, border: '1px solid var(--lv-border)', background: 'var(--lv-surface)', color: 'var(--lv-text-body)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  <ShieldCheck size={12} aria-hidden="true" /> What&apos;s recorded
                </button>
                {privacyOpen && (
                  <div role="dialog" aria-label="What this interview records" style={{ position: 'absolute', bottom: 'calc(100% + 8px)', right: 0, width: 300, zIndex: 40, background: 'var(--lv-surface)', border: '1px solid var(--lv-border)', borderRadius: 8, boxShadow: 'var(--lv-shadow-md)', padding: '12px 14px', fontSize: 12, fontWeight: 400, color: 'var(--lv-text-body)', lineHeight: 1.55 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <strong style={{ fontSize: 12, color: 'var(--lv-text)' }}>What this interview records</strong>
                      <button type="button" onClick={() => setPrivacyOpen(false)} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--lv-text-muted)', padding: 0, display: 'flex' }}><X size={14} /></button>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 16, display: 'grid', gap: 4 }}>
                      <li><strong>Audio</strong> of this interview is recorded and transcribed to evaluate your answers.</li>
                      <li><strong>Camera</strong> checks (face in view, one person) run inside your browser. No video is recorded or uploaded.</li>
                      <li>Tab and window switches are noted for review. Flags are reviewed by a person and never reject you automatically.</li>
                      {privacy && <li>Audio and photo are deleted after {privacy.mediaRetentionDays} days; the transcript after {privacy.transcriptRetentionDays} days. Only {privacy.orgName}&apos;s hiring team can access them.</li>}
                      <li>Say &ldquo;I withdraw my consent&rdquo; at any time to stop.</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ──── RIGHT: editor (top, generous height) + transcript (below) — stacked ──── */}
          <div className="iv-right" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>

          {/* Editor pane — PERMANENT, tab strip + content + base Submit */}
          <div data-tour="editor" className="iv-editor" style={{ ...(editorExpanded ? { position: 'fixed', inset: 16, zIndex: 70, boxShadow: 'var(--lv-shadow-lg)' } : { flex: 1.7 }), minHeight: editorExpanded ? 0 : 300, background: 'var(--lv-surface)', borderRadius: 8, border: '1px solid var(--lv-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', outline: tourHighlight === 'editor' ? '2px solid var(--lv-brand)' : 'none', outlineOffset: 2, transition: 'outline 0.2s, border-color 0.15s' }}>
            {/* tab strip — technical/hybrid with a task: Task · Code · Tests · Output · Whiteboard;
                conversational: Notes · Whiteboard (no coding workspace). */}
            {(() => {
              const tabBtn = (active: boolean): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 6, border: `1px solid ${active ? 'var(--lv-border-strong)' : 'transparent'}`, cursor: 'pointer', background: active ? 'var(--lv-surface)' : 'transparent', color: active ? 'var(--lv-text)' : 'var(--lv-text-muted)', fontSize: 12, fontWeight: 600, transition: 'all 0.15s' })
              const wsOn = (k: typeof wsTab) => editorTab === 'code' && (workTask ? wsTab === k : k === 'code')
              return (
                <div role="tablist" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderBottom: '1px solid var(--lv-border)', background: 'var(--lv-surface-sunken)', flexShrink: 0, flexWrap: 'wrap' }}>
                  {workTask && (
                    <button role="tab" aria-selected={wsOn('task')} onClick={() => { setEditorTab('code'); setWsTab('task') }} style={tabBtn(wsOn('task'))}><ListChecks size={14} /> Task</button>
                  )}
                  <button role="tab" aria-selected={wsOn('code')} onClick={() => { setEditorTab('code'); setWsTab('code') }} style={tabBtn(wsOn('code'))}>
                    <Code2 size={14} /> {workTask ? 'Code' : hasWorkspace(workMode) ? 'Code / Text' : 'Notes'}
                  </button>
                  {workTask && (<>
                    <button role="tab" aria-selected={wsOn('tests')} onClick={() => { setEditorTab('code'); setWsTab('tests') }} style={tabBtn(wsOn('tests'))}>
                      Tests{testResults ? ` ${testResults.passed}/${testResults.total}` : ''}
                    </button>
                    <button role="tab" aria-selected={wsOn('output')} onClick={() => { setEditorTab('code'); setWsTab('output') }} style={tabBtn(wsOn('output'))}>Output</button>
                  </>)}
                  <button role="tab" aria-selected={editorTab === 'whiteboard'} onClick={() => setEditorTab('whiteboard')} style={tabBtn(editorTab === 'whiteboard')}>
                    <PenLine size={14} /> Whiteboard
                  </button>
                  {waitingWhiteboard && editorTab === 'whiteboard' && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--lv-text-muted)', fontWeight: 600 }}>Sketch your answer, then Submit when ready</span>}
                  <button type="button" onClick={() => setEditorExpanded((x) => !x)} title={editorExpanded ? 'Exit full screen (Esc)' : 'Expand editor'} aria-label={editorExpanded ? 'Exit full screen' : 'Expand editor'}
                    style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', padding: 6, borderRadius: 6, border: '1px solid var(--lv-border)', background: 'var(--lv-surface)', color: 'var(--lv-text-muted)', cursor: 'pointer' }}>
                    {editorExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                </div>
              )
            })()}

            {/* tab content — everything stays mounted (display toggles) so work is never lost when switching */}
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              {/* Code / Notes — Monaco */}
              <div style={{ position: 'absolute', inset: 0, display: editorTab === 'code' && (!workTask || wsTab === 'code') ? 'flex' : 'none', flexDirection: 'column' }}>
                {hasWorkspace(workMode) && (
                  <div style={{ padding: '6px 12px', background: 'var(--lv-surface-sunken)', borderBottom: '1px solid var(--lv-border)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
                    <label htmlFor="iv-lang" style={{ fontSize: 11, color: 'var(--lv-text-muted)', fontWeight: 600 }}>Language</label>
                    <select id="iv-lang" value={codeLanguage} onChange={(e) => { setCodeLanguage(e.target.value); pushEvent({ t: wsT(), k: 'lang', lang: e.target.value }) }}
                      style={{ height: 26, padding: '0 8px', borderRadius: 6, border: '1px solid var(--lv-border)', background: 'var(--lv-surface)', color: 'var(--lv-text)', fontSize: 12, fontWeight: 500, fontFamily: 'var(--lv-font-sans)', cursor: 'pointer' }}>
                      {workTask
                        ? (workTask.languages?.length ? workTask.languages : WORKSPACE_LANGUAGES).map((lang) => <option key={lang} value={lang}>{LANGUAGE_LABEL[lang]}</option>)
                        : (['plaintext', 'javascript', 'typescript', 'python', 'java', 'sql', 'go', 'cpp'] as const).map(lang => (
                          <option key={lang} value={lang}>
                            {lang === 'plaintext' ? 'Plain text' : lang === 'cpp' ? 'C++' : lang === 'javascript' ? 'JavaScript' : lang === 'typescript' ? 'TypeScript' : lang === 'sql' ? 'SQL' : lang.charAt(0).toUpperCase() + lang.slice(1)}
                          </option>
                        ))}
                    </select>
                    {(codeLanguage === 'javascript' || codeLanguage === 'typescript') && (
                      <button type="button" title="Format code" onClick={() => { void editorRef.current?.getAction('editor.action.formatDocument')?.run(); pushEvent({ t: wsT(), k: 'format' }) }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 26, padding: '0 8px', borderRadius: 6, border: '1px solid var(--lv-border)', background: 'var(--lv-surface)', color: 'var(--lv-text-body)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        <Wand2 size={12} aria-hidden="true" /> Format
                      </button>
                    )}
                    {workTask && (
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                        <button type="button" onClick={() => void runWorkspace('run')} disabled={!wsStarted || !!runBusy}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 26, padding: '0 10px', borderRadius: 6, border: '1px solid var(--lv-border)', background: 'var(--lv-surface)', color: 'var(--lv-text)', fontSize: 12, fontWeight: 600, cursor: wsStarted && !runBusy ? 'pointer' : 'not-allowed', opacity: wsStarted ? 1 : 0.55 }}>
                          {runBusy === 'run' ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={12} aria-hidden="true" />} Run
                        </button>
                        <button type="button" onClick={() => void runWorkspace('tests')} disabled={!wsStarted || !!runBusy}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 26, padding: '0 10px', borderRadius: 6, border: '1px solid var(--lv-border)', background: 'var(--lv-surface)', color: 'var(--lv-text)', fontSize: 12, fontWeight: 600, cursor: wsStarted && !runBusy ? 'pointer' : 'not-allowed', opacity: wsStarted ? 1 : 0.55 }}>
                          {runBusy === 'tests' ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <ListChecks size={12} aria-hidden="true" />} Run tests
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {execNote && <div role="status" style={{ padding: '6px 12px', fontSize: 12, color: 'var(--lv-warning)', background: 'var(--lv-warning-soft, var(--lv-surface-sunken))', borderBottom: '1px solid var(--lv-border)' }}>{execNote}</div>}
                <div className="interview-monaco-wrapper" style={{ flex: 1, minHeight: 200, position: 'relative' }}>
                  {!codeContent && !workTask && (
                    <div aria-hidden="true" style={{ position: 'absolute', top: 12, left: 16, zIndex: 1, pointerEvents: 'none', fontSize: 13, color: 'var(--lv-text-muted)' }}>
                      Type your answer here, then press Submit answer.
                    </div>
                  )}
                  <MonacoEditor
                    height="100%"
                    language={codeLanguage}
                    theme="light"
                    value={codeContent}
                    onChange={handleCodeChange}
                    onMount={handleEditorMount}
                    options={{ minimap: { enabled: false }, fontSize: 13, lineNumbers: hasWorkspace(workMode) ? 'on' : 'off', scrollBeyondLastLine: false, automaticLayout: true, wordWrap: 'on', padding: { top: 12, bottom: 12 }, tabSize: 4, autoIndent: 'full', formatOnPaste: true, quickSuggestions: hasWorkspace(workMode), bracketPairColorization: { enabled: true } }}
                  />
                </div>
              </div>

              {/* Task */}
              {workTask && (
                <div style={{ position: 'absolute', inset: 0, display: editorTab === 'code' && wsTab === 'task' ? 'block' : 'none', overflowY: 'auto', padding: '16px 18px' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--lv-text)', marginBottom: 4 }}>{workTask.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--lv-text-muted)', marginBottom: 12 }}>Suggested time: about {workTask.minutes} minutes · {workTask.language === 'sql' ? 'write a SQLite query; each test creates its own tables first' : 'read from standard input, print to standard output'}</div>
                  <p style={{ fontSize: 14, color: 'var(--lv-text-body)', lineHeight: 1.65, margin: '0 0 16px', whiteSpace: 'pre-wrap' }}>{workTask.prompt}</p>
                  {workTask.tests.map((t) => (
                    <div key={t.id} style={{ marginBottom: 10, border: '1px solid var(--lv-border)', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ padding: '6px 10px', fontSize: 12, fontWeight: 600, color: 'var(--lv-text)', background: 'var(--lv-surface-sunken)', borderBottom: '1px solid var(--lv-border)' }}>Example · {t.name}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                        <pre style={{ margin: 0, padding: 10, fontFamily: 'var(--lv-font-mono)', fontSize: 12, whiteSpace: 'pre-wrap', borderRight: '1px solid var(--lv-border)' }}>{workTask.language === 'sql' ? `-- setup\n${t.input}` : (t.input || '(empty input)')}</pre>
                        <pre style={{ margin: 0, padding: 10, fontFamily: 'var(--lv-font-mono)', fontSize: 12, whiteSpace: 'pre-wrap' }}>{t.expected}</pre>
                      </div>
                    </div>
                  ))}
                  {workTask.hiddenCount > 0 && <div style={{ fontSize: 12, color: 'var(--lv-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}><EyeOff size={12} aria-hidden="true" /> Plus {workTask.hiddenCount} hidden test{workTask.hiddenCount === 1 ? '' : 's'} with edge cases.</div>}
                  {!wsStarted && <div style={{ marginTop: 14, fontSize: 12, color: 'var(--lv-text-muted)' }}>{interviewer.name} will introduce this task when it&apos;s time.</div>}
                </div>
              )}

              {/* Tests */}
              {workTask && (
                <div style={{ position: 'absolute', inset: 0, display: editorTab === 'code' && wsTab === 'tests' ? 'block' : 'none', overflowY: 'auto', padding: '12px 14px' }}>
                  {!testResults ? (
                    <div style={{ fontSize: 13, color: 'var(--lv-text-muted)' }}>Run the tests from the Code tab to see results here.</div>
                  ) : (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 600, color: testResults.passed === testResults.total ? 'var(--lv-success)' : 'var(--lv-text)', marginBottom: 10 }}>{testResults.passed} of {testResults.total} tests passing</div>
                      {testResults.results.map((t) => (
                        <div key={t.id} style={{ marginBottom: 8, border: '1px solid var(--lv-border)', borderRadius: 6, padding: '8px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--lv-text)' }}>
                            {t.passed ? <CheckCircle2 size={14} color="var(--lv-success)" aria-label="passed" /> : <XCircle size={14} color="var(--lv-danger)" aria-label="failed" />}
                            {t.name}{t.hidden && <span style={{ fontWeight: 400, color: 'var(--lv-text-muted)' }}> · hidden</span>}
                            {t.status !== 'ok' && <span style={{ fontWeight: 400, color: 'var(--lv-warning)' }}> · {t.status.replace('_', ' ')}</span>}
                          </div>
                          {!t.hidden && !t.passed && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                              <div><div style={{ fontSize: 11, color: 'var(--lv-text-muted)' }}>Expected</div><pre style={{ margin: 0, fontFamily: 'var(--lv-font-mono)', fontSize: 12, whiteSpace: 'pre-wrap' }}>{t.expected}</pre></div>
                              <div><div style={{ fontSize: 11, color: 'var(--lv-text-muted)' }}>Your output</div><pre style={{ margin: 0, fontFamily: 'var(--lv-font-mono)', fontSize: 12, whiteSpace: 'pre-wrap' }}>{t.actual || t.stderr || '(no output)'}</pre></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* Output */}
              {workTask && (
                <div style={{ position: 'absolute', inset: 0, display: editorTab === 'code' && wsTab === 'output' ? 'flex' : 'none', flexDirection: 'column', padding: '12px 14px', gap: 8, overflowY: 'auto' }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--lv-text-muted)' }}>
                    {workTask.language === 'sql' ? 'Setup SQL for Run' : 'Input for Run'} <span style={{ fontWeight: 400 }}>(defaults to the first example)</span>
                    <textarea value={customStdin ?? workTask.tests[0]?.input ?? ''} onChange={(e) => setCustomStdin(e.target.value)} rows={3}
                      style={{ display: 'block', width: '100%', marginTop: 4, padding: 8, borderRadius: 6, border: '1px solid var(--lv-border)', fontFamily: 'var(--lv-font-mono)', fontSize: 12, resize: 'vertical', background: 'var(--lv-surface)', color: 'var(--lv-text)' }} />
                  </label>
                  {!runOutput ? (
                    <div style={{ fontSize: 13, color: 'var(--lv-text-muted)' }}>Press Run in the Code tab to see your program&apos;s output.</div>
                  ) : (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 600, color: runOutput.status === 'ok' ? 'var(--lv-success)' : 'var(--lv-warning)' }}>
                        {runOutput.statusText}{runOutput.timeSec != null ? ` · ${runOutput.timeSec.toFixed(2)}s` : ''}
                      </div>
                      <pre style={{ margin: 0, padding: 10, borderRadius: 6, background: 'var(--lv-surface-sunken)', border: '1px solid var(--lv-border)', fontFamily: 'var(--lv-font-mono)', fontSize: 12, whiteSpace: 'pre-wrap', color: 'var(--lv-text)' }}>{runOutput.stdout || '(no output)'}</pre>
                      {(runOutput.compileOutput || runOutput.stderr) && (
                        <pre style={{ margin: 0, padding: 10, borderRadius: 6, background: 'var(--lv-danger-soft, var(--lv-surface-sunken))', border: '1px solid var(--lv-border)', fontFamily: 'var(--lv-font-mono)', fontSize: 12, whiteSpace: 'pre-wrap', color: 'var(--lv-danger)' }}>{runOutput.compileOutput || runOutput.stderr}</pre>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Whiteboard */}
              <div style={{ position: 'absolute', inset: 0, display: editorTab === 'whiteboard' ? 'block' : 'none', overflow: 'hidden' }}>
                <Whiteboard onExport={handleWhiteboardExport} onDone={waitingWhiteboard ? handleWhiteboardDone : undefined} onContentChange={(has) => { whiteboardHasInkRef.current = has }} />
              </div>
            </div>

            {/* footer — save status, Save draft (secondary), Submit (primary) */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px solid var(--lv-border)', flexShrink: 0 }}>
              <span aria-live="polite" style={{ marginRight: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: saveState === 'offline' ? 'var(--lv-warning)' : 'var(--lv-text-muted)' }}>
                {editorTab !== 'code' ? 'Your sketch stays here until you submit'
                  : workTask && wsStarted
                    ? (saveState === 'offline' ? 'Offline: your work is kept on this device and will sync when you reconnect'
                      : saveState === 'saving' ? 'Saving…'
                      : draftSavedAt ? <><Check size={12} aria-hidden="true" /> Saved · {new Date(draftSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</> : 'Your work saves automatically')
                  : (draftSavedAt ? <><Check size={12} aria-hidden="true" /> Draft auto-saved · {new Date(draftSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</> : 'Drafts save automatically as you type')}
              </span>
              {editorTab === 'code' && (
                <button type="button" onClick={() => { updateSessionCode(editorValue(), codeLanguage); wsDirtyRef.current = true; void saveWorkspaceRef.current?.(); setDraftSavedAt(Date.now()) }}
                  style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid var(--lv-border)', background: 'var(--lv-surface)', color: 'var(--lv-text-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Save draft
                </button>
              )}
              <button onClick={submitActiveTab} disabled={!canSubmit} title={canSubmit ? (waitingWorkSample ? 'Submit your solution and explain it' : 'Submit your answer for this question') : 'Wait for your turn to answer'} style={{ padding: '7px 18px', borderRadius: 6, border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed', background: canSubmit ? 'var(--lv-brand)' : 'var(--lv-border)', color: canSubmit ? '#fff' : 'var(--lv-text-muted)', fontSize: 13, fontWeight: 600, transition: 'background 0.15s' }}>
                {waitingWorkSample ? 'Submit solution' : 'Submit answer'}
              </button>
            </div>
          </div>

          {/* Transcript — BELOW the editor in the right column. Live, auto-scroll, scrollable back. */}
          <div data-tour="transcript" className="iv-transcript" style={{ flex: transcriptCollapsed ? 'none' : 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--lv-surface)', borderRadius: 8, border: '1px solid var(--lv-border)', overflow: 'hidden', outline: tourHighlight === 'transcript' ? '2px solid var(--lv-brand)' : 'none', outlineOffset: 2, transition: 'outline 0.2s' }}>
          {/* header + live status */}
          <div style={{ padding: '8px 12px 8px 16px', borderBottom: transcriptCollapsed ? 'none' : '1px solid var(--lv-border)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <button type="button" onClick={() => setTranscriptCollapsed((c) => !c)} aria-expanded={!transcriptCollapsed}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--lv-text)', fontFamily: 'var(--lv-font-sans)' }}>
                {transcriptCollapsed ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />} Transcript
              </button>
              {isWarmingUp ? (
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--lv-text-muted)', fontStyle: 'italic' }}>Take your time…</span>
              ) : isListening ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: 'var(--lv-danger)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--lv-danger)', animation: 'pulseDot 1.2s ease-in-out infinite', display: 'inline-block' }} />
                  Listening…
                </span>
              ) : (
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--lv-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {micFailed ? <MicOff size={12} /> : <Mic size={12} />}{micFailed ? 'Mic unavailable' : 'Waiting'}
                </span>
              )}
            </div>
            {listeningHint && <div style={{ fontSize: 12, color: 'var(--lv-text-muted)', fontStyle: 'italic' }}>{listeningHint}</div>}
            {voiceStatus !== 'ok' && (
              <div role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--lv-text-body)', background: 'var(--lv-surface-sunken)', border: '1px solid var(--lv-border)', borderRadius: 8, padding: '8px 10px', flexWrap: 'wrap' }}>
                {voiceStatus === 'reconnecting' && <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" /><span>Voice reconnecting… one moment</span></>}
                {voiceStatus === 'unavailable' && <><VolumeX size={14} aria-hidden="true" /><span>Voice is unavailable right now — please read the question on screen. We&apos;ll keep trying.</span></>}
                {voiceStatus === 'blocked' && <>
                  <VolumeX size={14} aria-hidden="true" /><span>Your browser paused the interviewer&apos;s audio.</span>
                  <button type="button" className="lv-btn lv-btn--primary lv-btn--sm" onClick={async () => { await unlockTtsAudio(); voiceUnblockRef.current?.() }}>Turn on audio</button>
                </>}
              </div>
            )}
            {sttWarning && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--lv-warning)', background: 'color-mix(in srgb, var(--lv-warning) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--lv-warning) 30%, transparent)', borderRadius: 8, padding: '8px 10px' }}>
                <MicOff size={14} color="var(--lv-warning)" /><span>{sttWarning}</span>
              </div>
            )}
          </div>

          {/* full live transcript (Scribe v2 Realtime), auto-scroll, scrollable back */}
          <div ref={transcriptBoxRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 12px', display: transcriptCollapsed ? 'none' : 'flex', flexDirection: 'column', gap: 6 }}>
            {transcript.map((entry, i) => {
              const ai = entry.speaker === 'ai'
              const current = ai && i === lastAiIdx && phase === 'speaking' && !liveTranscript
              return (
                <div key={entry.id} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '6px 10px', borderRadius: 6, background: ai ? 'var(--lv-surface-sunken)' : 'transparent', boxShadow: current ? 'inset 2px 0 0 var(--lv-brand)' : 'none' }}>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 11, fontWeight: 600, color: ai ? 'var(--lv-text)' : 'var(--lv-text-muted)' }}>
                    {ai ? interviewer.name : 'You'}
                    <span style={{ fontWeight: 400, color: 'var(--lv-text-muted)', fontVariantNumeric: 'tabular-nums' }}>{fmtClock(entry.timestamp)}</span>
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--lv-text-body)', lineHeight: 1.55 }}>{entry.text}</span>
                </div>
              )
            })}
            {liveTranscript && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '6px 10px', borderRadius: 6, boxShadow: 'inset 2px 0 0 var(--lv-success)' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--lv-success)' }}>You · speaking</span>
                <span style={{ fontSize: 13, color: 'var(--lv-text-muted)', fontStyle: 'italic', lineHeight: 1.55 }}>{liveTranscript}</span>
              </div>
            )}
          </div>

          {/* text input fallback at the base of the rail */}
          {(textInputMode || micFailed) && phase === 'listening' && (
            <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid var(--lv-border)', flexShrink: 0 }}>
              <textarea
                value={textInputValue}
                onChange={e => setTextInputValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) submitTextInput() }}
                placeholder="Type your response… (⌘+Enter)"
                style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid var(--lv-border)', fontSize: 13, lineHeight: 1.5, resize: 'vertical', minHeight: 56, fontFamily: 'var(--font-sans)', outline: 'none', color: 'var(--lv-text-body)' }}
              />
              <button onClick={submitTextInput} disabled={!textInputValue.trim()} style={{ padding: '0 16px', borderRadius: 6, border: 'none', cursor: 'pointer', background: textInputValue.trim() ? 'var(--lv-brand)' : 'var(--lv-border)', color: textInputValue.trim() ? '#fff' : 'var(--lv-text-muted)', fontSize: 13, fontWeight: 600 }}>Send</button>
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
          background: 'var(--lv-overlay)',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeUp 0.18s ease both',
        }}>
          <div style={{
            background: 'var(--lv-surface)', borderRadius: 8, width: 400,
            boxShadow: 'var(--lv-shadow-lg)',
            border: '1px solid var(--lv-border)', overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{ padding: '22px 28px 0', borderBottom: '1px solid var(--lv-surface-muted)', paddingBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 6, background: 'color-mix(in srgb, var(--lv-danger) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={16} color="var(--lv-danger)" />
                </div>
                <div style={{ fontFamily: 'var(--lv-font-sans)', fontSize: 18, fontWeight: 600, color: 'var(--lv-text)' }}>
                  End Interview?
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 28px' }}>
              {timeRemaining > 0 && (
                <div style={{
                  padding: '10px 14px', background: 'color-mix(in srgb, var(--lv-warning) 8%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--lv-warning) 25%, transparent)', borderRadius: 6,
                  fontSize: 13, fontWeight: 600, color: 'var(--lv-warning)', marginBottom: 14,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Clock size={14} color="var(--lv-warning)" />
                  You have {fmt(timeRemaining)} remaining.
                </div>
              )}
              <p style={{ fontSize: 14, color: 'var(--lv-text-body)', lineHeight: 1.65, margin: 0 }}>
                Ending now will generate a report based on the questions answered so far.
                {timeRemaining > 0 ? ' You still have time remaining.' : ''}
              </p>
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 28px', borderTop: '1px solid var(--lv-surface-muted)',
              display: 'flex', gap: 10, justifyContent: 'flex-end',
            }}>
              <button
                onClick={handleEndConfirmContinue}
                style={{
                  padding: '9px 20px', borderRadius: 6,
                  border: '1px solid var(--lv-border)', background: 'var(--lv-surface)',
                  color: 'var(--lv-text-body)', fontWeight: 600, cursor: 'pointer', fontSize: 13,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--lv-surface-sunken)'; e.currentTarget.style.borderColor = 'var(--lv-border-strong)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--lv-surface)'; e.currentTarget.style.borderColor = 'var(--lv-border)' }}
              >
                Continue Interview
              </button>
              <button
                onClick={handleEndConfirmEnd}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 20px', borderRadius: 6, border: 'none',
                  background: 'var(--lv-gradient-brand)',
                  color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13,
                  boxShadow: 'none', transition: 'background 0.15s',
                  letterSpacing: '-0.01em',
                }}
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
        @keyframes tourRing {
          0%, 100% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--lv-brand) 14%, transparent); }
          50%      { box-shadow: 0 0 0 6px color-mix(in srgb, var(--lv-brand) 8%, transparent); }
        }
        @keyframes tourBounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%      { transform: translateX(-50%) translateY(-3px); }
        }

        /* Editor: subtle active state (no glow). */
        .iv-editor:focus-within { border-color: var(--lv-border-strong) !important; }

        /* AI window fills its box. */
        .iv-ai-fill > div { flex: 1; height: 100%; justify-content: center; }

        /* ── Narrower widths: stack the two columns; keep the editor present.
           Desktop-first — this only prevents bad breakage below ~900px. ── */
        @media (max-width: 900px) {
          .iv-surface { overflow: auto !important; }
          .iv-cols { flex-direction: column !important; flex: none !important; }
          .iv-left { width: 100% !important; }
          .iv-left > div { min-height: 200px; }
          .iv-transcript { min-height: 240px; }
          /* Stacked columns have no fixed height: give the editor a real one so the
             typing area can't collapse to zero (the "no text box" bug). */
          .iv-editor { flex: none !important; height: 420px; }
        }
      `}</style>
    </div>
  )
}
