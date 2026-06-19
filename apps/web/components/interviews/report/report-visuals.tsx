'use client'
import { useState } from 'react'

// ── Evidence Report visuals (Build 04, Screen-scoped) ──────────────────────
// Verdict-forward, two-axis (competency radar vs communication dial), skill
// rows that EXPAND TO EVIDENCE, and a first-class integrity panel. SVG-only —
// no charting dependency. INSUFFICIENT_EVIDENCE never renders as a number.
// Indigo brand; prints cleanly.

const INDIGO = '#4F46E5'
const VIOLET = '#7C3AED'
const INSUFFICIENT = 'INSUFFICIENT_EVIDENCE'

export interface Dimension { key: string; label: string; score: number | null; outOf: number; status?: string; color?: string }
export interface Communication { coherence?: number; fluency?: number; grammar?: number; clarity?: number; cefr?: string; rationale?: string; status?: string }
export interface EvidenceQuestion { questionText: string; questionType?: string; candidateResponseExcerpt?: string; keyPointsCovered?: string[]; keyPointsMissed?: string[]; score?: number; evaluatorNote?: string; status?: string }
export interface IntegritySummaryShape {
  reviewStatus: 'CLEAN' | 'FLAGGED_FOR_REVIEW'
  totalEvents: number; totalFlags: number; countsByType: Record<string, number>; threshold: number
  events: { type: string; label: string; occurredAt: string; durationMs: number | null; confidence: number; detail: string | null; meta?: unknown }[]
  combined: { detected: boolean; rationale: string | null; at: string | null }
}

const scoreHue = (s: number) => (s >= 7 ? '#059669' : s >= 5 ? '#D97706' : '#DC2626')
const isInsufficient = (d: { status?: string; score: number | null }) => d.status === INSUFFICIENT || d.score == null

function InsufficientTag() {
  return <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 100, padding: '2px 9px', whiteSpace: 'nowrap' }}>Insufficient evidence to score</span>
}

// ── R2a. Competency radar ──────────────────────────────────────────────────
export function CompetencyRadar({ dimensions, size = 260 }: { dimensions: Dimension[]; size?: number }) {
  const cx = size / 2, cy = size / 2, R = size / 2 - 38
  const n = Math.max(dimensions.length, 3)
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
  const pt = (i: number, r: number) => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))]
  const rings = [0.25, 0.5, 0.75, 1]
  const evaluable = dimensions.filter((d) => !isInsufficient(d))
  const poly = evaluable.length >= 3
    ? dimensions.map((d, i) => { const v = isInsufficient(d) ? 0 : (d.score ?? 0) / d.outOf; return pt(i, R * v).join(',') }).join(' ')
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size} role="img" aria-label="Competency radar">
        {rings.map((rr, ri) => (
          <polygon key={ri} points={dimensions.map((_, i) => pt(i, R * rr).join(',')).join(' ')} fill="none" stroke="#E2E8F0" strokeWidth={1} />
        ))}
        {dimensions.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#E2E8F0" strokeWidth={1} /> })}
        {poly && <polygon points={poly} fill={`${INDIGO}22`} stroke={INDIGO} strokeWidth={2} />}
        {poly && dimensions.map((d, i) => { if (isInsufficient(d)) return null; const [x, y] = pt(i, R * ((d.score ?? 0) / d.outOf)); return <circle key={i} cx={x} cy={y} r={3.5} fill={INDIGO} /> })}
        {dimensions.map((d, i) => {
          const [x, y] = pt(i, R + 20)
          return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight={700} fill="#475569">{d.label}</text>
        })}
      </svg>
      {evaluable.length < 3 && <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>Not enough scored competencies to plot.</div>}
    </div>
  )
}

// ── R2b. Communication dial + sub-metrics + CEFR ───────────────────────────
export function CommunicationDial({ communication }: { communication: Communication | null }) {
  const insufficient = !communication || communication.status === INSUFFICIENT
  const subs = [
    { label: 'Coherence', v: communication?.coherence },
    { label: 'Fluency', v: communication?.fluency },
    { label: 'Grammar', v: communication?.grammar },
    { label: 'Clarity', v: communication?.clarity },
  ]
  const vals = subs.map((s) => s.v).filter((v): v is number => typeof v === 'number')
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null

  const size = 150, stroke = 12, r = (size - stroke) / 2, cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  const frac = avg != null ? Math.max(0, Math.min(1, avg / 10)) : 0

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} role="img" aria-label="Communication dial">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#EEF2FF" strokeWidth={stroke} />
          {!insufficient && <circle cx={cx} cy={cy} r={r} fill="none" stroke={VIOLET} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - frac)} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {insufficient ? <span style={{ fontSize: 11, color: '#64748B', textAlign: 'center', padding: 8 }}>Insufficient evidence</span> : (
            <>
              <span style={{ fontSize: 28, fontWeight: 800, color: VIOLET, fontFamily: 'var(--font-display)' }}>{avg?.toFixed(1)}</span>
              <span style={{ fontSize: 11, color: '#94A3B8' }}>/ 10</span>
            </>
          )}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 180 }}>
        {!insufficient && communication?.cefr && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CEFR</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', background: VIOLET, borderRadius: 7, padding: '3px 10px' }}>{communication.cefr}</span>
          </div>
        )}
        {insufficient ? <div style={{ marginTop: 4 }}><InsufficientTag /></div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {subs.map((s) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#64748B', width: 72 }}>{s.label}</span>
                <div style={{ flex: 1, height: 6, borderRadius: 4, background: '#EEF2FF', overflow: 'hidden' }}>
                  <div style={{ width: `${((s.v ?? 0) / 10) * 100}%`, height: '100%', background: VIOLET }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', width: 24, textAlign: 'right' }}>{typeof s.v === 'number' ? s.v : '—'}</span>
              </div>
            ))}
          </div>
        )}
        {!insufficient && communication?.rationale && <div style={{ fontSize: 12, color: '#64748B', marginTop: 10, lineHeight: 1.5 }}>{communication.rationale}</div>}
      </div>
    </div>
  )
}

// ── R3. Skill-wise ranked list — each row EXPANDS TO EVIDENCE ───────────────
export function SkillEvidenceList({ dimensions, questions }: { dimensions: Dimension[]; questions: EvidenceQuestion[] }) {
  const ranked = [...dimensions].sort((a, b) => {
    if (isInsufficient(a) && !isInsufficient(b)) return 1
    if (!isInsufficient(a) && isInsufficient(b)) return -1
    return ((b.score ?? 0) / b.outOf) - ((a.score ?? 0) / a.outOf)
  })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {ranked.map((d, i) => <SkillRow key={d.key} rank={i + 1} dim={d} questions={questions} />)}
    </div>
  )
}

function SkillRow({ rank, dim, questions }: { rank: number; dim: Dimension; questions: EvidenceQuestion[] }) {
  const [open, setOpen] = useState(false)
  const insufficient = isInsufficient(dim)
  const pct = insufficient ? 0 : Math.round(((dim.score ?? 0) / dim.outOf) * 100)
  const score10 = insufficient ? null : Math.round(((dim.score ?? 0) / dim.outOf) * 10)
  // Evidence: questions whose type matches this competency (best-effort), else all.
  const evidence = questions.filter((q) => (q.questionType ?? '').toLowerCase().includes(dim.key.toLowerCase()))
  const shown = evidence.length ? evidence : []

  return (
    <div className="lv-skill" style={{ border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#CBD5E1', width: 20 }}>{rank}</span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{dim.label}</span>
        {insufficient ? <InsufficientTag /> : (
          <>
            <div style={{ width: 120, height: 7, borderRadius: 4, background: '#F1F5F9', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: scoreHue(score10 ?? 0) }} />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 800, color: scoreHue(score10 ?? 0), width: 42, textAlign: 'right' }}>{score10}<span style={{ fontSize: 11, color: '#94A3B8' }}>/10</span></span>
          </>
        )}
        <span style={{ color: '#CBD5E1', fontSize: 12, width: 14 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid #F1F5F9' }}>
          {insufficient && <div style={{ fontSize: 13, color: '#64748B', marginTop: 12 }}>No evaluable answers were captured for this competency, so it is not scored.</div>}
          {!insufficient && shown.length === 0 && <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 12 }}>Score derived from the overall interview; see the transcript section for full context.</div>}
          {shown.map((q, qi) => (
            <div key={qi} style={{ marginTop: 12, borderLeft: `3px solid ${INDIGO}`, paddingLeft: 12 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>{q.questionText}{typeof q.score === 'number' ? <span style={{ color: '#94A3B8', fontWeight: 600 }}> · {q.score}/10</span> : null}</div>
              {q.candidateResponseExcerpt && <div style={{ fontSize: 12.5, color: '#475569', marginTop: 4, fontStyle: 'italic' }}>“{q.candidateResponseExcerpt}”</div>}
              {q.evaluatorNote && <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{q.evaluatorNote}</div>}
              {(q.keyPointsCovered?.length || q.keyPointsMissed?.length) ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                  {q.keyPointsCovered?.map((p) => <span key={'c' + p} style={{ fontSize: 11, color: '#059669', background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', borderRadius: 100, padding: '2px 8px' }}>✓ {p}</span>)}
                  {q.keyPointsMissed?.map((p) => <span key={'m' + p} style={{ fontSize: 11, color: '#B45309', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 100, padding: '2px 8px' }}>✗ {p}</span>)}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── R4. Integrity panel — first-class, evidence-linked, never "disqualified" ─
// Reviewer-facing summary categories: a stable, scannable headline set. Each maps
// one or more raw event types to a human label (e.g. tab_switch + window_blur →
// "Tab / window switches"). Counts come from the summary's countsByType.
const INTEGRITY_CATEGORIES: { label: string; types: string[]; keyZero?: boolean }[] = [
  { label: 'Tab / window switches',     types: ['tab_switch', 'window_blur'] },
  { label: 'Phone / off-screen glances', types: ['gaze_away'] },
  { label: 'Second person on screen',   types: ['multiple_faces'], keyZero: true },
  { label: 'Face not visible',          types: ['no_face'] },
  { label: 'Left fullscreen / share',   types: ['fullscreen_exit', 'screen_share_drop'] },
  { label: 'AI-assistance signals',     types: ['ai_assisted_answer'], keyZero: true },
  { label: 'Answer-timing anomalies',   types: ['latency_anomaly'] },
  { label: 'Reading / read-aloud',      types: ['reading_gaze', 'read_aloud_cadence'] },
  { label: 'Pasted blocks',             types: ['paste_anomaly'] },
  { label: 'Second voice detected',     types: ['second_voice'], keyZero: true },
]

type IntegrityEvt = IntegritySummaryShape['events'][number]
const CLUSTER_MS = 75_000  // events within this gap are treated as co-occurring

function clockOf(iso: string) { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
function qContextOf(events: IntegrityEvt[]): string | null {
  for (const e of events) {
    const m = e.meta as { questionText?: string } | null
    if (m?.questionText) return m.questionText
  }
  return null
}

function EvidenceRow({ e }: { e: IntegrityEvt }) {
  const span = (e.meta as { span?: string; transcript?: string } | null)?.span ?? (e.meta as { transcript?: string } | null)?.transcript
  return (
    <div style={{ display: 'flex', gap: 10, fontSize: 12.5 }}>
      <span style={{ color: '#94A3B8', fontFamily: 'var(--font-mono, monospace)', whiteSpace: 'nowrap', fontSize: 11.5, paddingTop: 1 }}>{clockOf(e.occurredAt)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: 700, color: '#334155' }}>{e.label}</span>
        {typeof e.confidence === 'number' && e.confidence < 1 && <span style={{ color: '#94A3B8' }}> · {Math.round(e.confidence * 100)}% conf.</span>}
        {e.detail && <div style={{ color: '#64748B', marginTop: 2 }}>{e.detail}</div>}
        {span && <div style={{ color: '#475569', marginTop: 3, fontStyle: 'italic', borderLeft: '2px solid #E2E8F0', paddingLeft: 8 }}>“{span}”</div>}
      </div>
    </div>
  )
}

export function IntegrityPanel({ integrity, terminationReason }: { integrity: IntegritySummaryShape | null; terminationReason?: string | null }) {
  if (!integrity) return null
  const flagged = integrity.reviewStatus === 'FLAGGED_FOR_REVIEW'
  const color = flagged ? '#B45309' : '#059669'
  const bg = flagged ? 'rgba(245,158,11,0.1)' : 'rgba(5,150,105,0.1)'

  // R1 — summary: category → count. Show any with a count, plus the key categories
  // even at zero (reassuring "0 second person / second voice").
  const counts = integrity.countsByType
  const summary = INTEGRITY_CATEGORIES
    .map((c) => ({ label: c.label, n: c.types.reduce((s, t) => s + (counts[t] ?? 0), 0), keyZero: !!c.keyZero }))
    .filter((c) => c.n > 0 || c.keyZero)

  // R2 — detail: chronological, with overlapping events grouped into correlated
  // clusters (co-occurring in time → one linked entry tied to the answer window).
  const sorted = [...integrity.events].sort((a, b) => +new Date(a.occurredAt) - +new Date(b.occurredAt))
  const clusters: { events: IntegrityEvt[]; lastAt: number }[] = []
  for (const e of sorted) {
    const t = +new Date(e.occurredAt)
    const last = clusters[clusters.length - 1]
    if (last && t - last.lastAt <= CLUSTER_MS) { last.events.push(e); last.lastAt = t }
    else clusters.push({ events: [e], lastAt: t })
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>Interview Integrity</h3>
        <span style={{ fontSize: 12.5, fontWeight: 800, color, background: bg, borderRadius: 100, padding: '4px 12px' }}>{flagged ? 'Flagged for review' : 'Clean'}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11.5, color: '#94A3B8' }}>Separate from competency · for human review, not a verdict</span>
      </div>
      <p style={{ fontSize: 12.5, color: '#64748B', margin: '0 0 16px' }}>
        Proctoring &amp; answer-content signals captured during the session. These inform a human reviewer; they never auto-disqualify and do not change the competency score.
      </p>

      {/* ── R1: SUMMARY (bold counts per activity) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, marginBottom: 16 }}>
        {summary.map((c) => {
          const hit = c.n > 0
          return (
            <div key={c.label} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '10px 12px', borderRadius: 10, border: `1px solid ${hit ? 'rgba(245,158,11,0.3)' : '#EEF2F6'}`, background: hit ? 'rgba(245,158,11,0.06)' : '#F8FAFC' }}>
              <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, color: hit ? '#B45309' : '#94A3B8', fontFamily: 'var(--font-display, inherit)' }}>{c.n}</span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: hit ? '#92400E' : '#64748B' }}>{c.label}</span>
            </div>
          )
        })}
      </div>

      {integrity.combined.detected && integrity.combined.rationale && (
        <div style={{ fontSize: 12.5, color: '#92400E', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '10px 12px', marginBottom: 16 }}>
          <strong>Combined signal:</strong> {integrity.combined.rationale}
        </div>
      )}

      {/* ── R2: DETAIL (chronological, correlated) ── */}
      <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Evidence timeline</div>
      {integrity.events.length === 0 ? (
        <div style={{ fontSize: 13, color: '#94A3B8' }}>No integrity events were recorded for this session.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {clusters.map((cl, i) => {
            if (cl.events.length === 1) {
              return <div key={i} style={{ padding: '8px 10px', border: '1px solid #F1F5F9', borderRadius: 8 }}><EvidenceRow e={cl.events[0]} /></div>
            }
            // Correlated group — co-occurring signals shown as one linked entry.
            const qText = qContextOf(cl.events)
            const labels = Array.from(new Set(cl.events.map((e) => e.label)))
            return (
              <div key={i} style={{ border: '1px solid rgba(124,58,237,0.25)', background: 'rgba(124,58,237,0.04)', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#6D28D9', marginBottom: 6 }}>
                  Correlated activity — {labels.length} signals co-occurred{qText ? <> while answering: <span style={{ fontStyle: 'italic', fontWeight: 600, color: '#4F46E5' }}>“{qText.slice(0, 90)}{qText.length > 90 ? '…' : ''}”</span></> : ''}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderLeft: '2px solid rgba(124,58,237,0.25)', paddingLeft: 10 }}>
                  {cl.events.map((e, j) => <EvidenceRow key={j} e={e} />)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {terminationReason && terminationReason !== 'COMPLETED' && (
        <div style={{ fontSize: 12, color: '#64748B', marginTop: 12, borderTop: '1px solid #F1F5F9', paddingTop: 10 }}>
          Session ended: <strong>{terminationReason.replace(/_/g, ' ').toLowerCase()}</strong>.
        </div>
      )}
    </div>
  )
}
