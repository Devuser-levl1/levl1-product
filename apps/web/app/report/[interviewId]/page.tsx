'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Zap, Download, ArrowLeft, PlayCircle, ThumbsUp, XCircle, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react'
import { useAppStore, CandidateReport } from '@/store/appStore'
import toast from 'react-hot-toast'
import {
  CompetencyRadar, CommunicationDial, SkillEvidenceList, IntegrityPanel,
  CultureFitPanel, CultureFitShape, MustHavePanel, MustHaveShape, LogisticsPanel, LogisticsShape,
  ConceptRubricPanel, ConceptAssessmentShape, KnockoutPanel,
  Dimension, Communication, EvidenceQuestion, IntegritySummaryShape,
} from '@/components/interviews/report/report-visuals'
import { DemoSalesCTA } from '@/components/interviews/DemoSalesCTA'
import { WorkSamplePanel, type WorkSampleShape } from '@/components/interviews/report/WorkSamplePanel'
import { Button, ButtonLink, LoadingBlock } from '@/components/screen/ui'

// Design-System Pass 3 (group 5): colours resolve to the Screen tokens and the
// controls use the canonical Button. Report data, actions and print rules unchanged.

/* ─── Constants ─────────────────────────────────────────────────── */
const SECTION_LABELS: Record<string, string> = { technical: 'Technical', scenario: 'Scenario', behavioral: 'Behavioral', eq: 'Emotional IQ', whiteboard: 'Whiteboard' }
const SECTION_COLORS: Record<string, string> = { technical: 'var(--lv-brand)', scenario: 'var(--lv-accent)', behavioral: 'var(--lv-success)', eq: 'var(--lv-warning)', whiteboard: 'var(--lv-brand)' }
const INDIGO = 'var(--lv-brand)'

// Verdict-forward mapping — the decision, stated plainly.
const VERDICT: Record<string, { label: string; tone: string; color: string; bg: string; border: string }> = {
  strong_yes: { label: 'Recommended to advance', tone: 'Strong fit', color: 'var(--lv-success)', bg: 'color-mix(in srgb, var(--lv-success) 10%, transparent)', border: 'color-mix(in srgb, var(--lv-success) 30%, transparent)' },
  yes:        { label: 'Recommended to advance', tone: 'Good fit',   color: 'var(--lv-success)', bg: 'color-mix(in srgb, var(--lv-success) 10%, transparent)', border: 'color-mix(in srgb, var(--lv-success) 30%, transparent)' },
  maybe:      { label: 'Borderline',             tone: 'Further review', color: 'var(--lv-warning)', bg: 'color-mix(in srgb, var(--lv-warning) 10%, transparent)', border: 'color-mix(in srgb, var(--lv-warning) 30%, transparent)' },
  no:         { label: 'Not recommended',        tone: 'Not a fit',  color: 'var(--lv-danger)', bg: 'color-mix(in srgb, var(--lv-danger) 10%, transparent)',  border: 'color-mix(in srgb, var(--lv-danger) 30%, transparent)' },
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
  cultureFit: CultureFitShape | null
  workSample?: WorkSampleShape | null
  mustHaveAssessment?: MustHaveShape[] | null
  conceptAssessment?: ConceptAssessmentShape[] | null
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

  // Logistics (early filters) — recruiter-only endpoint because it carries the
  // comp expectation; silently absent for anyone else (e.g. demo viewers).
  const [logistics, setLogistics] = useState<LogisticsShape | null>(null)
  useEffect(() => {
    if (!interviewId) return
    let alive = true
    fetch(`/api/reports/interview/${interviewId}/logistics`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.logistics) setLogistics(d.logistics as LogisticsShape) })
      .catch(() => {})
    return () => { alive = false }
  }, [interviewId])

  useEffect(() => {
    if (report || !interviewId) return
    const isDemo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1'
    let alive = true
    setLoadingFromDb(true)
    // Demo reports are generated async right as the interview ends, so the first
    // fetch can race ahead of generation — poll a few times on 404 before giving up.
    const MAX_TRIES = isDemo ? 10 : 1
    const load = (attempt: number) => {
      fetch(`/api/reports/interview/${interviewId}`)
        .then((res) => {
          // Signed out (e.g. clicked the report email) → log in, then come back here.
          if (res.status === 401) {
            window.location.replace(`/interviews/login?next=${encodeURIComponent(`/report/${interviewId}`)}`)
            return null
          }
          return res.ok ? res.json() : null
        })
        .then((data: (CandidateReport & { error?: string }) | null) => {
          if (!alive) return
          if (data && !data.error) {
            addReport(interviewId, data as CandidateReport)
            const c = candidates.find((x) => x.interviewId === interviewId)
            if (c) updateCandidate(c.id, { reportGenerated: true })
            setLoadingFromDb(false)
          } else if (attempt < MAX_TRIES) {
            setTimeout(() => { if (alive) load(attempt + 1) }, 2500)
          } else {
            setLoadingFromDb(false)
          }
        })
        .catch(() => {
          if (!alive) return
          if (attempt < MAX_TRIES) setTimeout(() => { if (alive) load(attempt + 1) }, 2500)
          else setLoadingFromDb(false)
        })
    }
    load(1)
    return () => { alive = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId])

  // Demo hygiene: after the prospect has seen the demo report, kill it. Beacon
  // deletes the (ephemeral) server data on tab-leave; unmount purges the store so
  // a logged-in agency never sees the demo in their candidates/reports.
  useEffect(() => {
    if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('demo') !== '1') return
    const onLeave = () => { try { navigator.sendBeacon('/api/demo/cleanup', new Blob([JSON.stringify({ interviewId })], { type: 'text/plain' })) } catch {} }
    window.addEventListener('pagehide', onLeave)
    return () => { window.removeEventListener('pagehide', onLeave); useAppStore.getState().purgeDemoData() }
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
    } catch { toast.error('Couldn\'t generate the report. Please try again.') } finally { setGenerating(false) }
  }
  function pushToL2() { if (candidate) { updateCandidate(candidate.id, { status: 'scheduled', recommendation: report?.recommendation }); toast.success(`${candidate.name} pushed to L2 shortlist`) } }
  function rejectCandidate() { if (candidate) { updateCandidate(candidate.id, { status: 'cancelled' }); toast.success('Candidate marked as rejected') } }

  if (loadingFromDb) {
    return <Centered><LoadingBlock label="Loading report…" /></Centered>
  }
  if (!report) {
    return (
      <Centered>
        <ClipboardList size={48} color="var(--lv-border-strong)" />
        <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--lv-text)', margin: '8px 0' }}>Report not found</h2>
        <p style={{ fontSize: 14, color: 'var(--lv-text-muted)', maxWidth: 340, lineHeight: 1.6, textAlign: 'center' }}>No report exists for interview ID <strong>{interviewId}</strong>.{candidate ? ' Click below to generate one.' : ' The interview ID may be incorrect.'}</p>
        {candidate && <Button onClick={generateReport} loading={generating} leftIcon={<Zap size={16} />}>{generating ? 'Generating…' : 'Generate Report'}</Button>}
        <Button variant="tertiary" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={() => router.back()}>Go back</Button>
      </Centered>
    )
  }

  const R = report as unknown as ReportPayload
  const verdict = VERDICT[R.recommendation] ?? VERDICT.maybe
  const insufficient = !!R.insufficientEvidence

  const dimensions: Dimension[] = Object.entries(R.sectionScores || {}).map(([key, s]) => ({
    key, label: SECTION_LABELS[key] ?? key, score: s?.status === 'INSUFFICIENT_EVIDENCE' ? null : (s?.score ?? null), outOf: s?.outOf ?? 100, status: s?.status, color: SECTION_COLORS[key],
  }))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--lv-surface-sunken)', fontFamily: 'var(--lv-font-sans)' }}>
      <DemoSalesCTA />
      {/* Print header */}
      <div className="print-only" style={{ display: 'none', padding: '0 0 16px', borderBottom: `2px solid ${INDIGO}`, marginBottom: 24, alignItems: 'center', gap: 10 }}>
        <Zap size={16} />
        <span style={{ fontSize: 18, fontWeight: 600, color: INDIGO }}>Levl1</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--lv-text-muted)' }}>Confidential — for internal use only</span>
      </div>

      {/* Sticky nav */}
      <header className="no-print" style={{ position: 'sticky', top: 0, zIndex: 50, background: 'color-mix(in srgb, var(--lv-surface) 95%, transparent)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--lv-border)', display: 'flex', alignItems: 'center', gap: 8, padding: '0 clamp(12px, 3vw, 32px)', minHeight: 56, flexWrap: 'wrap' }}>
        <Button variant="tertiary" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={() => router.back()}>Back</Button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
          <div aria-hidden="true" style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--lv-gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zap size={14} color="white" fill="white" /></div>
          <span style={{ fontSize: 14, fontWeight: 600, color: INDIGO }}>Levl1</span>
        </div>
        <div style={{ flex: 1 }} />
        <ButtonLink href={`/playback/${interviewId}`} variant="tertiary" size="sm" leftIcon={<PlayCircle size={14} />}>Replay interview</ButtonLink>
        <Button variant="secondary" size="sm" leftIcon={<Download size={14} />} onClick={() => window.print()}>Export</Button>
      </header>

      <div className="report-body" style={{ maxWidth: 920, margin: '0 auto', padding: '28px 24px 60px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* R1 — Verdict-forward header */}
        <section style={{ background: 'var(--lv-surface)', border: `1px solid ${verdict.border}`, borderRadius: 8, padding: 'clamp(18px, 3vw, 26px)', borderTop: `4px solid ${verdict.color}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: verdict.bg, borderRadius: 100, padding: '6px 16px', marginBottom: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: verdict.color }} />
                <span style={{ fontSize: 16, fontWeight: 600, color: verdict.color }}>{insufficient ? 'Insufficient evidence' : verdict.label}</span>
                {!insufficient && <span style={{ fontSize: 12, color: 'var(--lv-text-muted)', fontWeight: 600 }}>· {verdict.tone}</span>}
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--lv-text)', margin: '0 0 4px' }}>{R.candidateName ?? candidate?.name ?? 'Candidate'}</h1>
              <div style={{ fontSize: 14, color: 'var(--lv-text-muted)' }}>{[R.positionTitle ?? candidate?.positionTitle, R.company].filter(Boolean).join(' · ')}</div>
              <div style={{ fontSize: 13, color: 'var(--lv-text-muted)', marginTop: 6 }}>{[R.interviewDate, R.duration ? `${R.duration} min` : null].filter(Boolean).join('  ·  ')}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 44, fontWeight: 600, color: insufficient ? 'var(--lv-text-muted)' : verdict.color, fontFamily: 'var(--lv-font-display)', lineHeight: 1 }}>{insufficient ? '—' : R.overallScore}</div>
              <div style={{ fontSize: 12, color: 'var(--lv-text-muted)', marginTop: 2 }}>{insufficient ? 'not scored' : 'composite / 100'}</div>
            </div>
          </div>
          {R.professionalSummary && <p style={{ fontSize: 14, color: 'var(--lv-text-body)', lineHeight: 1.65, margin: '16px 0 0', paddingTop: 16, borderTop: '1px solid var(--lv-surface-muted)' }}>{R.professionalSummary}</p>}
        </section>

        {/* R1a — Logistics: early filters (location, notice, comp, work-auth) */}
        <LogisticsPanel logistics={logistics} />

        {/* R1a2 — Recruiter knockout questions: surfaced for review, never auto-reject */}
        <KnockoutPanel items={logistics?.knockouts} />

        {/* R1b — Must-have requirements: the pass/fail lens on non-negotiables */}
        <MustHavePanel items={R.mustHaveAssessment} />

        {/* R1c — JD-based concept rubric ratings */}
        <ConceptRubricPanel items={R.conceptAssessment} />

        {/* R1d — Observe & Defend work sample (separate judgment axes) */}
        <WorkSamplePanel workSample={R.workSample} />

        {/* R2 — Two-axis scoring (visually distinct) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }} className="report-grid2">
          <section style={card}>
            <SectionHead title="Competency" sub="Technical & role skills · 0–10" color={INDIGO} />
            <CompetencyRadar dimensions={dimensions} />
          </section>
          <section style={card}>
            <SectionHead title="Communication" sub="Spoken delivery · separate axis" color="var(--lv-text-muted)" />
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
            <section style={card}><SectionHead title="Strengths" color="var(--lv-success)" />{listOrEmpty(R.strengthAreas, 'var(--lv-success)')}</section>
            <section style={card}><SectionHead title="Concerns" color="var(--lv-warning)" />{listOrEmpty(R.concernAreas, 'var(--lv-warning)')}</section>
          </div>
        ) : null}

        {/* R4 — Integrity panel. In demo mode with no integrity data captured,
            HIDE it rather than render an empty/zeroed section to a prospect. */}
        {!(R.isDemo && (!R.integrity || R.integrity.totalEvents === 0)) && (
          <IntegrityPanel integrity={R.integrity} terminationReason={R.terminationReason} />
        )}

        {/* R4b — Culture & values fit (separate axis from competency) */}
        <CultureFitPanel cultureFit={R.cultureFit} />

        {/* R5 — Transcript / highlights (collapsible) */}
        <Collapsible title="Transcript highlights & questions">
          {R.transcriptHighlights?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {R.transcriptHighlights.map((h, i) => (
                <div key={i} style={{ borderLeft: `3px solid ${INDIGO}`, paddingLeft: 12 }}>
                  <div style={{ fontSize: 13, color: 'var(--lv-text-body)', fontStyle: 'italic' }}>“{h.quote}”</div>
                  {h.context && <div style={{ fontSize: 12, color: 'var(--lv-text-muted)', marginTop: 2 }}>{h.context}</div>}
                </div>
              ))}
            </div>
          ) : null}
          {R.questionWiseEvaluation?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {R.questionWiseEvaluation.map((q, i) => (
                <div key={i} style={{ fontSize: 13, color: 'var(--lv-text-body)', padding: '8px 0', borderTop: i ? '1px solid var(--lv-surface-muted)' : 'none' }}>
                  <strong style={{ color: 'var(--lv-text)' }}>{q.questionText}</strong>
                  {q.status === 'INSUFFICIENT_EVIDENCE' ? <span style={{ color: 'var(--lv-text-muted)' }}> — insufficient evidence to score</span> : typeof q.score === 'number' ? <span style={{ color: 'var(--lv-text-muted)' }}> — {q.score}/10</span> : null}
                  {q.candidateResponseExcerpt && <div style={{ fontStyle: 'italic', color: 'var(--lv-text-muted)', marginTop: 2 }}>“{q.candidateResponseExcerpt}”</div>}
                </div>
              ))}
            </div>
          ) : null}
        </Collapsible>

        {/* Actions */}
        <div className="no-print" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {(R.recommendation === 'strong_yes' || R.recommendation === 'yes') && (
            <Button onClick={pushToL2} leftIcon={<ThumbsUp size={16} />}>Push to L2 shortlist</Button>
          )}
          <Button variant="secondary" onClick={rejectCandidate} leftIcon={<XCircle size={16} />} style={{ color: 'var(--lv-danger)', borderColor: 'var(--lv-danger-border)' }}>Reject</Button>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .lv-skill { transition: box-shadow .15s, border-color .15s; }
        .rp-collapse:focus-visible { outline: none; box-shadow: var(--lv-focus-ring); }
        .lv-skill:hover { border-color: var(--lv-brand-soft-border); box-shadow: 0 2px 10px color-mix(in srgb, var(--lv-brand) 6%, transparent); }
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
const card: React.CSSProperties = { background: 'var(--lv-surface)', border: '1px solid var(--lv-border)', borderRadius: 8, padding: 'clamp(16px, 3vw, 22px)' }

function Centered({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: '100vh', background: 'var(--lv-surface-sunken)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--lv-font-sans)', gap: 12 }}>{children}<style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style></div>
}
function SectionHead({ title, sub, color }: { title: string; sub?: string; color: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ width: 4, height: 16, borderRadius: 2, background: color }} />
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--lv-text)', margin: 0 }}>{title}</h3>
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--lv-text-muted)', marginTop: 3, marginLeft: 12 }}>{sub}</div>}
    </div>
  )
}
function listOrEmpty(items: string[] | undefined, color: string) {
  if (!items?.length) return <div style={{ fontSize: 13, color: 'var(--lv-text-muted)' }}>None noted.</div>
  return <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>{items.map((s, i) => <li key={i} style={{ fontSize: 13, color: 'var(--lv-text-body)', lineHeight: 1.5 }}><span style={{ color }}>•</span> {s}</li>)}</ul>
}
function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <section style={card}>
      <button type="button" className="rp-collapse" aria-expanded={open} onClick={() => setOpen((o) => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', borderRadius: 8 }}>
        <SectionHead title={title} color={INDIGO} />
        <span aria-hidden="true" style={{ marginLeft: 'auto', color: 'var(--lv-text-muted)' }}>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
      </button>
      {open && <div style={{ marginTop: 4 }}>{children}</div>}
    </section>
  )
}
