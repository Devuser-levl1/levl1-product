'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Zap, ChevronDown, ChevronUp, CheckCircle2, XCircle,
  Download, ArrowLeft, ThumbsUp, AlertTriangle,
  Loader2, Quote, ClipboardList, UserCheck, TrendingUp,
} from 'lucide-react'
import { useAppStore, CandidateReport } from '@/store/appStore'
import toast from 'react-hot-toast'

/* ─── Constants ─────────────────────────────────────────────────── */
const SECTION_LABELS: Record<string, string> = {
  technical:  'Technical',
  scenario:   'Scenario',
  behavioral: 'Behavioral',
  eq:         'Emotional IQ',
  whiteboard: 'Whiteboard',
}

const SECTION_COLORS: Record<string, string> = {
  technical:  '#4F46E5',
  scenario:   '#7C3AED',
  behavioral: '#10B981',
  eq:         '#F59E0B',
  whiteboard: '#6366F1',
}

const REC_CFG = {
  strong_yes: { label: 'Strong Yes',       sub: 'Proceed to L2',     color: '#059669', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)' },
  yes:        { label: 'Yes',              sub: 'Proceed to L2',     color: '#4F46E5', bg: 'rgba(79,70,229,0.10)',  border: 'rgba(79,70,229,0.25)'  },
  maybe:      { label: 'Maybe',            sub: 'Further Review',    color: '#D97706', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)' },
  no:         { label: 'Do Not Proceed',   sub: 'Not a Fit',         color: '#DC2626', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)'  },
} as const

function scoreColor(s: number) {
  if (s >= 85) return '#10B981'
  if (s >= 70) return '#4F46E5'
  if (s >= 55) return '#F59E0B'
  return '#EF4444'
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

/* ─── Score Ring (SVG) ──────────────────────────────────────────── */
function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const [animated, setAnimated] = useState(false)
  const r = size * 0.4
  const circ = 2 * Math.PI * r
  const dash = animated ? (score / 100) * circ : 0
  const color = scoreColor(score)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={size * 0.083} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={size * 0.083}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: size * 0.27, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: size * 0.11, color: '#94A3B8', fontWeight: 500, marginTop: 2 }}>/100</span>
      </div>
    </div>
  )
}

/* ─── Horizontal score bar ──────────────────────────────────────── */
function SectionBar({ label, score, outOf, color }: { label: string; score: number; outOf: number; color: string }) {
  const [w, setW] = useState(0)
  useEffect(() => { const t = setTimeout(() => setW(score), 200); return () => clearTimeout(t) }, [score])
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <div style={{ width: 96, fontSize: 13, fontWeight: 600, color: '#475569', textAlign: 'right', flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: 10, borderRadius: 5, background: '#F1F5F9', overflow: 'hidden', maxWidth: 360 }}>
        <div style={{
          height: '100%', width: `${w}%`, background: color, borderRadius: 5,
          transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
      <span style={{ fontSize: 14, fontWeight: 700, color: '#4F46E5', minWidth: 52, fontFamily: 'var(--font-display)' }}>
        {score}<span style={{ fontSize: 11, fontWeight: 500, color: '#94A3B8' }}>/{outOf}</span>
      </span>
    </div>
  )
}

/* ─── Question accordion row ────────────────────────────────────── */
function QuestionRow({ q, idx, defaultOpen }: { q: CandidateReport['questionWiseEvaluation'][0]; idx: number; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  const qColor = q.score >= 8 ? '#10B981' : q.score >= 6 ? '#4F46E5' : q.score >= 4 ? '#F59E0B' : '#EF4444'

  return (
    <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
      {/* Header row */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px', background: open ? '#FAFAFA' : '#fff',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          transition: 'background 0.15s',
        }}
      >
        {open ? <ChevronUp size={15} color="#94A3B8" /> : <ChevronDown size={15} color="#94A3B8" />}
        <span style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', minWidth: 28 }}>Q{idx + 1}</span>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
          background: `${SECTION_COLORS[q.questionType.toLowerCase()] ?? '#4F46E5'}14`,
          color: SECTION_COLORS[q.questionType.toLowerCase()] ?? '#4F46E5',
        }}>
          {q.questionType}
        </span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {q.questionText}
        </span>
        <span style={{
          fontSize: 13, fontWeight: 800, minWidth: 40, textAlign: 'right',
          color: qColor, fontFamily: 'var(--font-display)',
        }}>
          {q.score}/10
        </span>
      </button>

      {/* Expanded body */}
      {open && (
        <div style={{ padding: '0 18px 18px', background: '#FAFAFA', borderTop: '1px solid #E2E8F0' }}>
          <div style={{ paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Question */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Question</div>
              <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.65, margin: 0 }}>{q.questionText}</p>
            </div>

            {/* Candidate said */}
            {q.candidateResponseExcerpt && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Candidate said</div>
                <p style={{
                  fontSize: 14, color: '#475569', lineHeight: 1.65, margin: 0,
                  borderLeft: '3px solid #C4B5FD', paddingLeft: 12,
                  fontStyle: 'italic',
                }}>
                  &ldquo;{q.candidateResponseExcerpt}&rdquo;
                </p>
              </div>
            )}

            {/* Key Points grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Covered */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Key Points Covered</div>
                {q.keyPointsCovered.length === 0
                  ? <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>None identified</p>
                  : q.keyPointsCovered.map((pt, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                      <CheckCircle2 size={13} color="#10B981" style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>{pt}</span>
                    </div>
                  ))}
              </div>
              {/* Missed */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Key Points Missed</div>
                {q.keyPointsMissed.length === 0
                  ? <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>None — full coverage</p>
                  : q.keyPointsMissed.map((pt, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                      <XCircle size={13} color="#EF4444" style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>{pt}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Evaluator note */}
            {q.evaluatorNote && (
              <div style={{
                background: 'rgba(79,70,229,0.05)', border: '1px solid rgba(79,70,229,0.12)',
                borderRadius: 8, padding: '10px 14px',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Evaluator Note — </span>
                <span style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{q.evaluatorNote}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function ReportPage() {
  const params = useParams()
  const router = useRouter()
  const interviewId = params?.interviewId as string

  const { reports, candidates, updateCandidate, addReport } = useAppStore()
  const [generating, setGenerating] = useState(false)
  const [loadingFromDb, setLoadingFromDb] = useState(false)

  const report = reports[interviewId]
  const candidate = candidates.find(c => c.interviewId === interviewId)

  /* Fetch from DB when report is not in Zustand store */
  useEffect(() => {
    if (report || !interviewId) return
    setLoadingFromDb(true)
    fetch(`/api/reports/interview/${interviewId}`)
      .then(res => {
        if (!res.ok) return null
        return res.json()
      })
      .then((data: (CandidateReport & { error?: string }) | null) => {
        if (data && !data.error) {
          addReport(interviewId, data as CandidateReport)
          // Sync candidate store flag if found
          const c = candidates.find(x => x.interviewId === interviewId)
          if (c) updateCandidate(c.id, { reportGenerated: true })
        }
      })
      .catch(console.error)
      .finally(() => setLoadingFromDb(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId])

  /* Generate report — uses localStorage transcript/responses if available */
  async function generateReport() {
    if (!candidate) {
      toast.error('Candidate not found for this interview')
      return
    }
    setGenerating(true)
    try {
      // Prefer saved interview data from localStorage
      let savedTranscript: unknown[] = []
      let savedResponses:  unknown[] = []
      try {
        const raw = localStorage.getItem(`ic_interview_${interviewId}_complete`)
        if (raw) {
          const parsed = JSON.parse(raw)
          savedTranscript = parsed.transcript ?? []
          savedResponses  = parsed.responses  ?? []
        }
      } catch {}

      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewId,
          candidateId:   candidate.id,
          candidateName: candidate.name,
          candidateEmail: candidate.email,
          positionTitle:  candidate.positionTitle,
          company:        '',
          interviewDate:  candidate.scheduledAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
          duration:       30,
          transcript:     savedTranscript,
          questionResponses: savedResponses,
          resumeText:     '',
          techStack:      candidate.topSkills ?? [],
          experienceLevel: '',
          roleType:       '',
        }),
      })
      if (!res.ok) throw new Error('Generation failed')
      const data = await res.json() as CandidateReport & { error?: string }
      if (data.error) throw new Error(data.error)
      addReport(interviewId, data)
      updateCandidate(candidate.id, { reportGenerated: true, reportGeneratedAt: new Date().toISOString() })
      toast.success('Report generated')
    } catch {
      toast.error('Could not generate report — check API key')
    } finally {
      setGenerating(false)
    }
  }

  /* Push to L2 */
  function pushToL2() {
    if (candidate) {
      updateCandidate(candidate.id, { status: 'scheduled', recommendation: report?.recommendation })
      toast.success(`${candidate.name} pushed to L2 shortlist`)
    }
  }

  /* Reject */
  function rejectCandidate() {
    if (candidate) {
      updateCandidate(candidate.id, { status: 'cancelled' })
      toast.success('Candidate marked as rejected')
    }
  }

  /* ── Loading from DB state ── */
  if (loadingFromDb) {
    return (
      <div style={{
        minHeight: '100vh', background: '#FAFAFA', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)', gap: 16,
      }}>
        <Loader2 size={32} color="#7C3AED" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 500 }}>Loading report…</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  /* ── No report state ── */
  if (!report) {
    return (
      <div style={{
        minHeight: '100vh', background: '#FAFAFA', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)', gap: 24,
      }}>
        <div style={{ textAlign: 'center' }}>
          <ClipboardList size={48} color="#CBD5E1" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#4F46E5', marginBottom: 8 }}>No Report Found</h2>
          <p style={{ fontSize: 14, color: '#94A3B8', maxWidth: 340, lineHeight: 1.6 }}>
            No evaluation report exists for interview ID <strong>{interviewId}</strong>.
            {candidate ? ' Click below to generate one.' : ' The interview ID may be incorrect.'}
          </p>
        </div>
        {candidate && (
          <button
            onClick={generateReport}
            disabled={generating}
            style={{
              background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 9,
              padding: '12px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
            }}
          >
            {generating ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={16} />}
            {generating ? 'Generating…' : 'Generate Report'}
          </button>
        )}
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 13, cursor: 'pointer' }}
        >
          ← Go back
        </button>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const rec = REC_CFG[report.recommendation]
  const sectionEntries = Object.entries(report.sectionScores) as [keyof typeof report.sectionScores, { score: number; outOf: number }][]

  // White-label + integrity fields ride along on the fetched report payload.
  const wl = report as unknown as {
    agencyName?: string | null
    agencyLogoUrl?: string | null
    brandColor?: string | null
    verification?: {
      emailVerified: boolean
      nameConfirmed: string | null
      photoCaptured: boolean
      tabSwitchCount: number
      faceMissingMs: number
      multipleFaces: boolean
      integrityScore: number
      integrityFlags: { type: string; detail: string; at: string }[]
    } | null
  }
  const brandColor = wl.brandColor || '#4F46E5'
  const v = wl.verification

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFF', fontFamily: 'var(--font-sans)' }}>

      {/* ── Print header (hidden on screen) ── */}
      <div className="print-only" style={{ display: 'none', padding: '0 0 16px', borderBottom: '2px solid #4F46E5', marginBottom: 24, alignItems: 'center', gap: 10 }}>
        <Zap size={18} color="#7C3AED" fill="#7C3AED" />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: '#4F46E5' }}>Levl1</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94A3B8' }}>Confidential — for internal use only</span>
      </div>

      {/* ── Sticky nav bar ── */}
      <header className="no-print" style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '0 32px', height: 56,
      }}>
        <button
          onClick={() => router.back()}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
            color: '#94A3B8', fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '6px 10px',
            borderRadius: 7, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#4F46E5' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#94A3B8' }}
        >
          <ArrowLeft size={14} /> Back
        </button>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={13} color="white" fill="white" strokeWidth={2.5} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: '#4F46E5' }}>Levl1</span>
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => window.print()}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(79,70,229,0.08)',
            border: '1px solid rgba(79,70,229,0.2)', borderRadius: 8,
            color: '#4F46E5', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            padding: '7px 14px', transition: 'all 0.15s',
          }}
        >
          <Download size={13} /> Export PDF
        </button>
      </header>

      {/* ── Body ── */}
      <main style={{ maxWidth: 880, margin: '0 auto', padding: '36px 24px 80px' }}>

        {/* ════ WHITE-LABEL AGENCY HEADER ════ */}
        {(wl.agencyName || wl.agencyLogoUrl) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: `2px solid ${brandColor}` }}>
            {wl.agencyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={wl.agencyLogoUrl} alt={wl.agencyName ?? 'Agency'} height={40} style={{ objectFit: 'contain', maxWidth: 180 }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: 9, background: brandColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                {(wl.agencyName ?? 'A').charAt(0)}
              </div>
            )}
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{wl.agencyName}</div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>Candidate Evaluation Report</div>
            </div>
          </div>
        )}

        {/* ════ HEADER CARD ════ */}
        <section style={{
          background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16,
          padding: '32px 36px', marginBottom: 24,
          boxShadow: '0 1px 4px rgba(79,70,229,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 28 }}>
            {/* Avatar */}
            <div style={{
              width: 64, height: 64, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-display)',
            }}>
              {initials(report.candidateName)}
            </div>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: '#1E293B', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                {report.candidateName}
              </h1>
              <p style={{ fontSize: 14, color: '#7C3AED', fontWeight: 600, margin: '0 0 2px' }}>{report.positionTitle}</p>
              <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>{report.company}</p>
              <p style={{ fontSize: 12, color: '#CBD5E1', marginTop: 6 }}>
                Interviewed: {report.interviewDate} · {report.duration} min
              </p>
            </div>
          </div>

          {/* Score + Rec */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Overall Score</span>
              <ScoreRing score={report.overallScore} size={120} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Recommendation</span>
              <div style={{
                display: 'inline-flex', flexDirection: 'column', gap: 4,
                background: rec.bg, border: `1px solid ${rec.border}`,
                borderRadius: 12, padding: '14px 22px', minWidth: 180,
              }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: rec.color, fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
                  {rec.label === 'Strong Yes' ? '✓ ' : rec.label === 'Yes' ? '✓ ' : rec.label === 'Maybe' ? '~ ' : '✗ '}
                  {rec.label}
                </span>
                <span style={{ fontSize: 12, color: rec.color, opacity: 0.75, fontWeight: 600 }}>{rec.sub}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ════ PROFESSIONAL SUMMARY ════ */}
        <section style={{
          background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16,
          padding: '28px 36px', marginBottom: 24,
          boxShadow: '0 1px 4px rgba(79,70,229,0.06)',
        }}>
          <SectionTitle icon={<ClipboardList size={15} />} label="Professional Summary" />
          <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.75, margin: 0 }}>
            {report.professionalSummary}
          </p>
        </section>

        {/* ════ SECTION SCORES ════ */}
        <section style={{
          background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16,
          padding: '28px 36px', marginBottom: 24,
          boxShadow: '0 1px 4px rgba(79,70,229,0.06)',
        }}>
          <SectionTitle icon={<TrendingUp size={15} />} label="Section Scores" />
          <div style={{ marginTop: 8 }}>
            {sectionEntries.map(([key, val]) => (
              <SectionBar
                key={key}
                label={SECTION_LABELS[key] ?? key}
                score={val.score}
                outOf={val.outOf}
                color={SECTION_COLORS[key] ?? '#4F46E5'}
              />
            ))}
          </div>
        </section>

        {/* ════ STRENGTHS & CONCERNS ════ */}
        <section style={{
          background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16,
          padding: '28px 36px', marginBottom: 24,
          boxShadow: '0 1px 4px rgba(79,70,229,0.06)',
        }}>
          <SectionTitle icon={<ThumbsUp size={15} />} label="Strengths & Concerns" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 8 }}>
            {/* Strengths */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <CheckCircle2 size={14} color="#10B981" />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Strengths</span>
              </div>
              {report.strengthAreas.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', marginTop: 7, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{s}</span>
                </div>
              ))}
            </div>
            {/* Concerns */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <AlertTriangle size={14} color="#F59E0B" />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Concerns</span>
              </div>
              {report.concernAreas.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', marginTop: 7, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{c}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════ QUESTION BREAKDOWN ════ */}
        <section style={{
          background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16,
          padding: '28px 36px', marginBottom: 24,
          boxShadow: '0 1px 4px rgba(79,70,229,0.06)',
        }}>
          <SectionTitle icon={<ClipboardList size={15} />} label="Question-by-Question Breakdown" />
          <div style={{ marginTop: 12 }}>
            {report.questionWiseEvaluation.map((q, i) => (
              <QuestionRow key={q.questionId} q={q} idx={i} defaultOpen={i === 0} />
            ))}
          </div>
        </section>

        {/* ════ TRANSCRIPT HIGHLIGHTS ════ */}
        {report.transcriptHighlights.length > 0 && (
          <section style={{
            background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16,
            padding: '28px 36px', marginBottom: 24,
            boxShadow: '0 1px 4px rgba(79,70,229,0.06)',
          }}>
            <SectionTitle icon={<Quote size={15} />} label="Transcript Highlights" />
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {report.transcriptHighlights.map((h, i) => (
                <div key={i} style={{
                  borderLeft: '3px solid #7C3AED', paddingLeft: 16,
                }}>
                  <p style={{ fontSize: 15, color: '#334155', fontStyle: 'italic', lineHeight: 1.7, margin: '0 0 8px' }}>
                    &ldquo;{h.quote}&rdquo;
                  </p>
                  <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>— {h.context}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ════ HR NOTE ════ */}
        <section style={{
          background: '#FAFAFA', border: '1px solid #E2E8F0', borderRadius: 16,
          padding: '28px 36px', marginBottom: 24,
          boxShadow: '0 1px 4px rgba(79,70,229,0.06)',
        }}>
          <SectionTitle icon={<UserCheck size={15} />} label="Note for HR" />
          <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.75, margin: '8px 0 0' }}>
            {report.hrNote}
          </p>
        </section>

        {/* ════ IDENTITY & INTEGRITY ════ */}
        {v && (
          <section style={{
            background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16,
            padding: '28px 36px', marginBottom: 24,
            boxShadow: '0 1px 4px rgba(79,70,229,0.06)',
          }}>
            <SectionTitle icon={<UserCheck size={15} />} label="Identity & Integrity" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '12px 0 18px' }}>
              <IntegrityCheck ok={v.emailVerified} label="Email verified (OTP)" />
              <IntegrityCheck ok={!!v.nameConfirmed} label={v.nameConfirmed ? `Name confirmed: ${v.nameConfirmed}` : 'Name not confirmed'} />
              <IntegrityCheck ok={v.photoCaptured} label="Photo captured" />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: 13, color: '#64748B' }}>Integrity Score</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: scoreColor(v.integrityScore) }}>
                {v.integrityScore}<span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>/100</span>
              </span>
            </div>

            {(v.tabSwitchCount > 0 || v.faceMissingMs > 0 || v.multipleFaces) && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {v.tabSwitchCount > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#D97706' }}>
                    <AlertTriangle size={14} /> {v.tabSwitchCount} tab switch{v.tabSwitchCount !== 1 ? 'es' : ''} detected
                  </div>
                )}
                {v.faceMissingMs > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#D97706' }}>
                    <AlertTriangle size={14} /> Face not visible for ~{Math.round(v.faceMissingMs / 1000)}s total
                  </div>
                )}
                {v.multipleFaces && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#DC2626' }}>
                    <AlertTriangle size={14} /> Multiple faces detected during the interview
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ════ L2 RECOMMENDATION ════ */}
        <section style={{
          background: 'linear-gradient(135deg, rgba(79,70,229,0.04) 0%, rgba(124,58,237,0.06) 100%)',
          border: '1px solid rgba(79,70,229,0.18)', borderRadius: 16,
          padding: '28px 36px', marginBottom: 36,
        }}>
          <SectionTitle icon={<TrendingUp size={15} />} label="If Proceeding to L2 — Focus Areas" />
          <div style={{ marginTop: 12 }}>
            {report.l2Recommendation.split(/[;·•\n]/).filter(s => s.trim()).map((point, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                <span style={{ fontSize: 14, color: '#7C3AED', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                <span style={{ fontSize: 14, color: '#334155', lineHeight: 1.6 }}>{point.trim()}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ════ FOOTER ACTIONS ════ */}
        <div className="no-print" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => window.print()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#fff', border: '1px solid #E2E8F0', borderRadius: 9,
              color: '#475569', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              padding: '11px 20px', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#F8FAFF' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#fff' }}
          >
            <Download size={14} /> Export as PDF
          </button>

          {(report.recommendation === 'strong_yes' || report.recommendation === 'yes') && (
            <button
              onClick={pushToL2}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#4F46E5', border: 'none', borderRadius: 9,
                color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                padding: '11px 22px', transition: 'all 0.15s',
                boxShadow: '0 4px 14px rgba(79,70,229,0.25)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#4338CA' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#4F46E5' }}
            >
              <UserCheck size={14} /> Push to L2
            </button>
          )}

          <button
            onClick={rejectCandidate}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9,
              color: '#DC2626', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              padding: '11px 20px', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.14)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
          >
            <XCircle size={14} /> Reject Candidate
          </button>

          <button
            onClick={() => router.push('/dashboard')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', borderRadius: 9,
              color: '#94A3B8', fontSize: 14, fontWeight: 500, cursor: 'pointer',
              padding: '11px 16px', marginLeft: 'auto', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#4F46E5' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8' }}
          >
            <ArrowLeft size={14} /> Back to Rankings
          </button>
        </div>
      </main>
    </div>
  )
}

/* ─── Section title helper ──────────────────────────────────────── */
function IntegrityCheck({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: ok ? '#334155' : '#94A3B8' }}>
      {ok ? <CheckCircle2 size={15} color="#10B981" /> : <XCircle size={15} color="#CBD5E1" />}
      {label}
    </div>
  )
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <div style={{ color: '#7C3AED' }}>{icon}</div>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
        color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0,
      }}>
        {label}
      </h2>
    </div>
  )
}
