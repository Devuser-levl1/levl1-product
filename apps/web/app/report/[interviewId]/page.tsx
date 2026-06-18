'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Zap, Download, ArrowLeft, ThumbsUp, XCircle, Loader2, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react'
import { useAppStore, CandidateReport } from '@/store/appStore'
import toast from 'react-hot-toast'
import {
  CompetencyRadar, CommunicationDial, SkillEvidenceList, IntegrityPanel,
  Dimension, Communication, EvidenceQuestion, IntegritySummaryShape,
} from '@/components/interviews/report/report-visuals'
import { DemoSalesCTA } from '@/components/interviews/DemoSalesCTA'

/* ─── Constants ─────────────────────────────────────────────────── */
const SECTION_LABELS: Record<string, string> = { technical: 'Technical', scenario: 'Scenario', behavioral: 'Behavioral', eq: 'Emotional IQ', whiteboard: 'Whiteboard' }
const SECTION_COLORS: Record<string, string> = { technical: '#4F46E5', scenario: '#7C3AED', behavioral: '#10B981', eq: '#F59E0B', whiteboard: '#6366F1' }
const INDIGO = '#4F46E5'

// Verdict-forward mapping — the decision, stated plainly.
const VERDICT: Record<string, { label: string; tone: string; color: string; bg: string; border: string }> = {
  strong_yes: { label: 'Recommended to advance', tone: 'Strong fit', color: '#059669', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.3)' },
  yes:        { label: 'Recommended to advance', tone: 'Good fit',   color: '#059669', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.3)' },
  maybe:      { label: 'Borderline',             tone: 'Further review', color: '#D97706', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.3)' },
  no:         { label: 'Not recommended',        tone: 'Not a fit',  color: '#DC2626', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.3)' },
}

interface ReportPayload {
  recommendation: string
  overallScore: number
  professionalSummary: string
  sectionScores: Record<string, { score: number; outOf: number; status?: string }>
  communication: Communication | null
  questionWiseEvaluation: EvidenceQuestion[]
  strengthAreas: string[]
  concernAreas: string[]
  transcriptHighlights: { quote: string; context: string }[]
  integrity: IntegritySummaryShape | null
  terminationReason: string | null
  isDemo?: boolean
  candidateName?: string; positionTitle?: string; company?: string; interviewDate?: string; duration?: number
  insufficientEvidence?: boolean
}

export default function ReportPage() {
  const params = useParams()
  const router = useRouter()
  const interviewId = params?.interviewId as string

  const { reports, candidates, updateCandidate, addReport } = useAppStore()
  const [generating, setGenerating] = useState(false)
  const [loadingFromDb, setLoadingFromDb] = useState(false)

  const report = reports[interviewId]
  const candidate = candidates.find((c) => c.interviewId === interviewId)

  useEffect(() => {
    if (report || !interviewId) return
    setLoadingFromDb(true)
    fetch(`/api/reports/interview/${interviewId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: (CandidateReport & { error?: string }) | null) => {
        if (data && !data.error) {
          addReport(interviewId, data as CandidateReport)
          const c = candidates.find((x) => x.interviewId === interviewId)
          if (c) updateCandidate(c.id, { reportGenerated: true })
        }
      })
      .catch(console.error)
      .finally(() => setLoadingFromDb(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId])

  async function generateReport() {
    if (!candidate) { toast.error('Candidate not found for this interview'); return }
    setGenerating(true)
    try {
      let savedTranscript: unknown[] = []; let savedResponses: unknown[] = []
      try {
        const raw = localStorage.getItem(`ic_interview_${interviewId}_complete`)
        if (raw) { const parsed = JSON.parse(raw); savedTranscript = parsed.transcript ?? []; savedResponses = parsed.responses ?? [] }
      } catch {}
      const res = await fetch('/api/generate-report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId, candidateId: candidate.id, candidateName: candidate.name, candidateEmail: candidate.email, positionTitle: candidate.positionTitle, company: '', interviewDate: candidate.scheduledAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10), duration: 30, transcript: savedTranscript, questionResponses: savedResponses, resumeText: '', techStack: candidate.topSkills ?? [], experienceLevel: '', roleType: '' }),
      })
      if (!res.ok) throw new Error('Generation failed')
      const data = await res.json() as CandidateReport & { error?: string }
      if (data.error) throw new Error(data.error)
      addReport(interviewId, data)
      updateCandidate(candidate.id, { reportGenerated: true, reportGeneratedAt: new Date().toISOString() })
      toast.success('Report generated')
    } catch { toast.error('Could not generate report — check API key') } finally { setGenerating(false) }
  }
  function pushToL2() { if (candidate) { updateCandidate(candidate.id, { status: 'scheduled', recommendation: report?.recommendation }); toast.success(`${candidate.name} pushed to L2 shortlist`) } }
  function rejectCandidate() { if (candidate) { updateCandidate(candidate.id, { status: 'cancelled' }); toast.success('Candidate marked as rejected') } }

  if (loadingFromDb) {
    return <Centered><Loader2 size={32} color="#7C3AED" style={{ animation: 'spin 1s linear infinite' }} /><p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 500 }}>Loading report…</p></Centered>
  }
  if (!report) {
    return (
      <Centered>
        <ClipboardList size={48} color="#CBD5E1" />
        <h2 style={{ fontSize: 22, fontWeight: 700, color: INDIGO, margin: '8px 0' }}>No Report Found</h2>
        <p style={{ fontSize: 14, color: '#94A3B8', maxWidth: 340, lineHeight: 1.6, textAlign: 'center' }}>No evaluation report exists for interview ID <strong>{interviewId}</strong>.{candidate ? ' Click below to generate one.' : ' The interview ID may be incorrect.'}</p>
        {candidate && <button onClick={generateReport} disabled={generating} style={{ background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 9, padding: '12px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>{generating ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={16} />}{generating ? 'Generating…' : 'Generate Report'}</button>}
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: 13, cursor: 'pointer' }}>← Go back</button>
      </Centered>
    )
  }

  const R = report as unknown as ReportPayload
  const wl = report as unknown as { brandColor?: string | null; agencyName?: string | null }
  const brandColor = wl.brandColor || INDIGO
  const verdict = VERDICT[R.recommendation] ?? VERDICT.maybe
  const insufficient = !!R.insufficientEvidence

  const dimensions: Dimension[] = Object.entries(R.sectionScores || {}).map(([key, s]) => ({
    key, label: SECTION_LABELS[key] ?? key, score: s?.status === 'INSUFFICIENT_EVIDENCE' ? null : (s?.score ?? null), outOf: s?.outOf ?? 100, status: s?.status, color: SECTION_COLORS[key],
  }))

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFF', fontFamily: 'var(--font-sans)' }}>
      <DemoSalesCTA />
      {/* Print header */}
      <div className="print-only" style={{ display: 'none', padding: '0 0 16px', borderBottom: `2px solid ${INDIGO}`, marginBottom: 24, alignItems: 'center', gap: 10 }}>
        <Zap size={18} color="#7C3AED" fill="#7C3AED" />
        <span style={{ fontSize: 18, fontWeight: 800, color: INDIGO }}>Levl1</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94A3B8' }}>Confidential — for internal use only</span>
      </div>

      {/* Sticky nav */}
      <header className="no-print" style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 16, padding: '0 32px', height: 56 }}>
        <button onClick={() => router.back()} style={navBtn}><ArrowLeft size={14} /> Back</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zap size={13} color="white" fill="white" /></div>
          <span style={{ fontSize: 14, fontWeight: 700, color: INDIGO }}>Levl1</span>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => window.print()} style={{ ...navBtn, background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)', color: INDIGO }}><Download size={14} /> Export</button>
      </header>

      <div className="report-body" style={{ maxWidth: 920, margin: '0 auto', padding: '28px 24px 60px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* R1 — Verdict-forward header */}
        <section style={{ background: '#fff', border: `1px solid ${verdict.border}`, borderRadius: 18, padding: 26, borderTop: `4px solid ${verdict.color}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: verdict.bg, borderRadius: 100, padding: '6px 16px', marginBottom: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: verdict.color }} />
                <span style={{ fontSize: 16, fontWeight: 800, color: verdict.color }}>{insufficient ? 'Insufficient evidence' : verdict.label}</span>
                {!insufficient && <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>· {verdict.tone}</span>}
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>{R.candidateName ?? candidate?.name ?? 'Candidate'}</h1>
              <div style={{ fontSize: 14, color: '#64748B' }}>{[R.positionTitle ?? candidate?.positionTitle, R.company].filter(Boolean).join(' · ')}</div>
              <div style={{ fontSize: 12.5, color: '#94A3B8', marginTop: 6 }}>{[R.interviewDate, R.duration ? `${R.duration} min` : null].filter(Boolean).join('  ·  ')}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 44, fontWeight: 800, color: insufficient ? '#94A3B8' : verdict.color, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{insufficient ? '—' : R.overallScore}</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{insufficient ? 'not scored' : 'composite / 100'}</div>
            </div>
          </div>
          {R.professionalSummary && <p style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.65, margin: '16px 0 0', paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>{R.professionalSummary}</p>}
        </section>

        {/* R2 — Two-axis scoring (visually distinct) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }} className="report-grid2">
          <section style={card}>
            <SectionHead title="Competency" sub="Technical & role skills · 0–10" color={INDIGO} />
            <CompetencyRadar dimensions={dimensions} />
          </section>
          <section style={card}>
            <SectionHead title="Communication" sub="Spoken delivery · separate axis" color="#7C3AED" />
            <CommunicationDial communication={R.communication} />
          </section>
        </div>

        {/* R3 — Skill-wise ranked list (expand to evidence) */}
        <section style={card}>
          <SectionHead title="Competencies, ranked" sub="Click any line for the supporting evidence" color={INDIGO} />
          <SkillEvidenceList dimensions={dimensions} questions={R.questionWiseEvaluation || []} />
        </section>

        {/* Strengths / concerns */}
        {(R.strengthAreas?.length || R.concernAreas?.length) ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }} className="report-grid2">
            <section style={card}><SectionHead title="Strengths" color="#059669" />{listOrEmpty(R.strengthAreas, '#059669')}</section>
            <section style={card}><SectionHead title="Concerns" color="#B45309" />{listOrEmpty(R.concernAreas, '#B45309')}</section>
          </div>
        ) : null}

        {/* R4 — Integrity panel. In demo mode with no integrity data captured,
            HIDE it rather than render an empty/zeroed section to a prospect. */}
        {!(R.isDemo && (!R.integrity || R.integrity.totalEvents === 0)) && (
          <IntegrityPanel integrity={R.integrity} terminationReason={R.terminationReason} />
        )}

        {/* R5 — Transcript / highlights (collapsible) */}
        <Collapsible title="Transcript highlights & questions">
          {R.transcriptHighlights?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {R.transcriptHighlights.map((h, i) => (
                <div key={i} style={{ borderLeft: `3px solid ${INDIGO}`, paddingLeft: 12 }}>
                  <div style={{ fontSize: 13, color: '#334155', fontStyle: 'italic' }}>“{h.quote}”</div>
                  {h.context && <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>{h.context}</div>}
                </div>
              ))}
            </div>
          ) : null}
          {R.questionWiseEvaluation?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {R.questionWiseEvaluation.map((q, i) => (
                <div key={i} style={{ fontSize: 12.5, color: '#475569', padding: '8px 0', borderTop: i ? '1px solid #F1F5F9' : 'none' }}>
                  <strong style={{ color: '#0F172A' }}>{q.questionText}</strong>
                  {q.status === 'INSUFFICIENT_EVIDENCE' ? <span style={{ color: '#94A3B8' }}> — insufficient evidence to score</span> : typeof q.score === 'number' ? <span style={{ color: '#94A3B8' }}> — {q.score}/10</span> : null}
                  {q.candidateResponseExcerpt && <div style={{ fontStyle: 'italic', color: '#64748B', marginTop: 2 }}>“{q.candidateResponseExcerpt}”</div>}
                </div>
              ))}
            </div>
          ) : null}
        </Collapsible>

        {/* Actions */}
        <div className="no-print" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {(R.recommendation === 'strong_yes' || R.recommendation === 'yes') && (
            <button onClick={pushToL2} style={{ ...actionBtn, background: INDIGO, color: '#fff' }}><ThumbsUp size={15} /> Push to L2 shortlist</button>
          )}
          <button onClick={rejectCandidate} style={{ ...actionBtn, background: '#fff', color: '#DC2626', border: '1px solid #FECACA' }}><XCircle size={15} /> Reject</button>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .lv-skill { transition: box-shadow .15s, border-color .15s; }
        .lv-skill:hover { border-color: #C7D2FE; box-shadow: 0 2px 10px rgba(79,70,229,0.06); }
        @media (max-width: 720px) { .report-grid2 { grid-template-columns: 1fr !important; } }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: flex !important; }
          .report-body { max-width: 100% !important; padding: 0 !important; gap: 14px !important; }
          section, .lv-skill { break-inside: avoid; box-shadow: none !important; }
          body { background: #fff !important; }
        }
      `}</style>
    </div>
  )
}

/* ─── Small presentational helpers ─────────────────────────────── */
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 22 }
const navBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '7px 12px', borderRadius: 8 }
const actionBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, borderRadius: 9, border: 'none', padding: '11px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }

function Centered({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: '100vh', background: '#FAFAFA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)', gap: 12 }}>{children}<style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style></div>
}
function SectionHead({ title, sub, color }: { title: string; sub?: string; color: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ width: 4, height: 16, borderRadius: 2, background: color }} />
        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>{title}</h3>
      </div>
      {sub && <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 3, marginLeft: 12 }}>{sub}</div>}
    </div>
  )
}
function listOrEmpty(items: string[] | undefined, color: string) {
  if (!items?.length) return <div style={{ fontSize: 13, color: '#94A3B8' }}>None noted.</div>
  return <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>{items.map((s, i) => <li key={i} style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}><span style={{ color }}>•</span> {s}</li>)}</ul>
}
function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <section style={card}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <SectionHead title={title} color={INDIGO} />
        <span style={{ marginLeft: 'auto', color: '#94A3B8' }}>{open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
      </button>
      {open && <div style={{ marginTop: 4 }}>{children}</div>}
    </section>
  )
}
