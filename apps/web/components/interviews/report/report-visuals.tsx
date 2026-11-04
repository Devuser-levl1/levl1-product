'use client'
import { useState } from 'react'

// ── Evidence Report visuals (Build 04, Screen-scoped) ──────────────────────
// Verdict-forward, two-axis (competency radar vs communication dial), skill
// rows that EXPAND TO EVIDENCE, and a first-class integrity panel. SVG-only —
// no charting dependency. INSUFFICIENT_EVIDENCE never renders as a number.
// Indigo brand; prints cleanly.

const INDIGO = 'var(--lv-brand)'
const VIOLET = 'var(--lv-accent)'
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

const scoreHue = (s: number) => (s >= 7 ? 'var(--lv-success)' : s >= 5 ? 'var(--lv-warning)' : 'var(--lv-danger)')
const isInsufficient = (d: { status?: string; score: number | null }) => d.status === INSUFFICIENT || d.score == null

function InsufficientTag() {
  return <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-text-muted)', background: 'var(--lv-surface-muted)', border: '1px solid var(--lv-border)', borderRadius: 100, padding: '2px 9px', whiteSpace: 'nowrap' }}>Insufficient evidence to score</span>
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
          <polygon key={ri} points={dimensions.map((_, i) => pt(i, R * rr).join(',')).join(' ')} fill="none" stroke="var(--lv-border)" strokeWidth={1} />
        ))}
        {dimensions.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--lv-border)" strokeWidth={1} /> })}
        {poly && <polygon points={poly} fill={`color-mix(in srgb, ${INDIGO} 13%, transparent)`} stroke={INDIGO} strokeWidth={2} />}
        {poly && dimensions.map((d, i) => { if (isInsufficient(d)) return null; const [x, y] = pt(i, R * ((d.score ?? 0) / d.outOf)); return <circle key={i} cx={x} cy={y} r={3.5} fill={INDIGO} /> })}
        {dimensions.map((d, i) => {
          const [x, y] = pt(i, R + 20)
          return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight={600} fill="var(--lv-text-body)">{d.label}</text>
        })}
      </svg>
      {evaluable.length < 3 && <div style={{ fontSize: 12, color: 'var(--lv-text-muted)', marginTop: 4 }}>Not enough scored competencies to plot.</div>}
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
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--lv-brand-soft)" strokeWidth={stroke} />
          {!insufficient && <circle cx={cx} cy={cy} r={r} fill="none" stroke={VIOLET} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - frac)} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {insufficient ? <span style={{ fontSize: 11, color: 'var(--lv-text-muted)', textAlign: 'center', padding: 8 }}>Insufficient evidence</span> : (
            <>
              <span style={{ fontSize: 28, fontWeight: 600, color: VIOLET, fontFamily: 'var(--lv-font-display)' }}>{avg?.toFixed(1)}</span>
              <span style={{ fontSize: 11, color: 'var(--lv-text-muted)' }}>/ 10</span>
            </>
          )}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 180 }}>
        {!insufficient && communication?.cefr && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--lv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CEFR</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-on-brand)', background: VIOLET, borderRadius: 6, padding: '3px 10px' }}>{communication.cefr}</span>
          </div>
        )}
        {insufficient ? <div style={{ marginTop: 4 }}><InsufficientTag /></div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {subs.map((s) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--lv-text-muted)', width: 72 }}>{s.label}</span>
                <div style={{ flex: 1, height: 6, borderRadius: 4, background: 'var(--lv-brand-soft)', overflow: 'hidden' }}>
                  <div style={{ width: `${((s.v ?? 0) / 10) * 100}%`, height: '100%', background: VIOLET }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-text-body)', width: 24, textAlign: 'right' }}>{typeof s.v === 'number' ? s.v : '—'}</span>
              </div>
            ))}
          </div>
        )}
        {!insufficient && communication?.rationale && <div style={{ fontSize: 12, color: 'var(--lv-text-muted)', marginTop: 10, lineHeight: 1.5 }}>{communication.rationale}</div>}
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
    <div className="lv-skill" style={{ border: '1px solid var(--lv-border)', borderRadius: 8, overflow: 'hidden', background: 'var(--lv-surface)' }}>
      <button type="button" className="lv-skill__toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text-muted)', width: 20 }}>{rank}</span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--lv-text)' }}>{dim.label}</span>
        {insufficient ? <InsufficientTag /> : (
          <>
            <div style={{ width: 120, height: 7, borderRadius: 4, background: 'var(--lv-surface-muted)', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: scoreHue(score10 ?? 0) }} />
            </div>
            <span style={{ fontFamily: 'var(--lv-font-display)', fontSize: 16, fontWeight: 600, color: scoreHue(score10 ?? 0), width: 42, textAlign: 'right' }}>{score10}<span style={{ fontSize: 11, color: 'var(--lv-text-muted)' }}>/10</span></span>
          </>
        )}
        <span aria-hidden="true" style={{ color: 'var(--lv-text-muted)', fontSize: 12, width: 14 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--lv-surface-muted)' }}>
          {insufficient && <div style={{ fontSize: 13, color: 'var(--lv-text-muted)', marginTop: 12 }}>No evaluable answers were captured for this competency, so it is not scored.</div>}
          {!insufficient && shown.length === 0 && <div style={{ fontSize: 13, color: 'var(--lv-text-muted)', marginTop: 12 }}>Score derived from the overall interview; see the transcript section for full context.</div>}
          {shown.map((q, qi) => (
            <div key={qi} style={{ marginTop: 12, borderLeft: `3px solid ${INDIGO}`, paddingLeft: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text-body)' }}>{q.questionText}{typeof q.score === 'number' ? <span style={{ color: 'var(--lv-text-muted)', fontWeight: 600 }}> · {q.score}/10</span> : null}</div>
              {q.candidateResponseExcerpt && <div style={{ fontSize: 13, color: 'var(--lv-text-body)', marginTop: 4, fontStyle: 'italic' }}>“{q.candidateResponseExcerpt}”</div>}
              {q.evaluatorNote && <div style={{ fontSize: 12, color: 'var(--lv-text-muted)', marginTop: 4 }}>{q.evaluatorNote}</div>}
              {(q.keyPointsCovered?.length || q.keyPointsMissed?.length) ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                  {q.keyPointsCovered?.map((p) => <span key={'c' + p} style={{ fontSize: 11, color: 'var(--lv-success)', background: 'color-mix(in srgb, var(--lv-success) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--lv-success) 20%, transparent)', borderRadius: 100, padding: '2px 8px' }}>✓ {p}</span>)}
                  {q.keyPointsMissed?.map((p) => <span key={'m' + p} style={{ fontSize: 11, color: 'var(--lv-warning)', background: 'color-mix(in srgb, var(--lv-warning) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--lv-warning) 25%, transparent)', borderRadius: 100, padding: '2px 8px' }}>✗ {p}</span>)}
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
    <div style={{ display: 'flex', gap: 10, fontSize: 13 }}>
      <span style={{ color: 'var(--lv-text-muted)', fontFamily: 'var(--font-mono, monospace)', whiteSpace: 'nowrap', fontSize: 12, paddingTop: 1 }}>{clockOf(e.occurredAt)}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: 600, color: 'var(--lv-text-body)' }}>{e.label}</span>
        {typeof e.confidence === 'number' && e.confidence < 1 && <span style={{ color: 'var(--lv-text-muted)' }}> · {Math.round(e.confidence * 100)}% conf.</span>}
        {e.detail && <div style={{ color: 'var(--lv-text-muted)', marginTop: 2 }}>{e.detail}</div>}
        {span && <div style={{ color: 'var(--lv-text-body)', marginTop: 3, fontStyle: 'italic', borderLeft: '2px solid var(--lv-border)', paddingLeft: 8 }}>“{span}”</div>}
      </div>
    </div>
  )
}

// ── Culture / values fit (Build 08) — SEPARATE axis from competency + integrity ──
export interface CultureFitShape {
  fitScore: number
  summary: string
  responses: { id: string; prompt: string; dimension?: string; reverse?: boolean; value: number; label: string }[]
}

export function CultureFitPanel({ cultureFit }: { cultureFit: CultureFitShape | null }) {
  if (!cultureFit || !Array.isArray(cultureFit.responses) || cultureFit.responses.length === 0) return null
  const s = cultureFit.fitScore
  const band = s >= 75 ? 'var(--lv-success)' : s >= 50 ? 'var(--lv-accent)' : 'var(--lv-warning)'
  return (
    <div style={{ background: 'var(--lv-surface)', border: '1px solid var(--lv-border)', borderRadius: 8, padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--lv-text)', margin: 0 }}>Culture &amp; Values Fit</h3>
        <span style={{ fontSize: 13, fontWeight: 600, color: band, background: `color-mix(in srgb, ${band} 10%, transparent)`, borderRadius: 100, padding: '4px 12px' }}>{s}/100</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--lv-text-muted)' }}>Self-reported · separate from competency</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', margin: '0 0 14px' }}>{cultureFit.summary}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {cultureFit.responses.map((r, i) => {
          const adj = r.reverse ? 6 - r.value : r.value  // positive-direction strength
          const hue = adj >= 4 ? 'var(--lv-success)' : adj >= 3 ? 'var(--lv-accent)' : 'var(--lv-warning)'
          return (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 13, padding: '9px 11px', border: '1px solid var(--lv-surface-muted)', borderRadius: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {r.dimension && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--lv-accent)', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: 6 }}>{r.dimension}</span>}
                <span style={{ color: 'var(--lv-text-body)' }}>{r.prompt}</span>
                {r.reverse && <span style={{ fontSize: 11, color: 'var(--lv-text-muted)' }}> · reverse-scored</span>}
              </div>
              <span style={{ whiteSpace: 'nowrap', fontWeight: 600, color: hue, background: `color-mix(in srgb, ${hue} 8%, transparent)`, borderRadius: 100, padding: '2px 10px', fontSize: 12 }}>{r.label || '—'}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function IntegrityPanel({ integrity, terminationReason }: { integrity: IntegritySummaryShape | null; terminationReason?: string | null }) {
  if (!integrity) return null
  const flagged = integrity.reviewStatus === 'FLAGGED_FOR_REVIEW'
  const color = flagged ? 'var(--lv-warning)' : 'var(--lv-success)'
  const bg = flagged ? 'color-mix(in srgb, var(--lv-warning) 10%, transparent)' : 'color-mix(in srgb, var(--lv-success) 10%, transparent)'

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
    <div style={{ background: 'var(--lv-surface)', border: '1px solid var(--lv-border)', borderRadius: 8, padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--lv-text)', margin: 0 }}>Interview Integrity</h3>
        <span style={{ fontSize: 13, fontWeight: 600, color, background: bg, borderRadius: 100, padding: '4px 12px' }}>{flagged ? 'Flagged for review' : 'Clean'}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--lv-text-muted)' }}>Separate from competency · for human review, not a verdict</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', margin: '0 0 16px' }}>
        Proctoring &amp; answer-content signals captured during the session. These inform a human reviewer; they never auto-disqualify and do not change the competency score.
      </p>

      {/* ── R1: SUMMARY (bold counts per activity) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, marginBottom: 16 }}>
        {summary.map((c) => {
          const hit = c.n > 0
          return (
            <div key={c.label} style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '10px 12px', borderRadius: 6, border: `1px solid ${hit ? 'color-mix(in srgb, var(--lv-warning) 30%, transparent)' : 'var(--lv-surface-sunken)'}`, background: hit ? 'color-mix(in srgb, var(--lv-warning) 6%, transparent)' : 'var(--lv-surface-sunken)' }}>
              <span style={{ fontSize: 22, fontWeight: 600, lineHeight: 1, color: hit ? 'var(--lv-warning)' : 'var(--lv-text-muted)', fontFamily: 'var(--font-display, inherit)' }}>{c.n}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: hit ? 'var(--lv-warning)' : 'var(--lv-text-muted)' }}>{c.label}</span>
            </div>
          )
        })}
      </div>

      {integrity.combined.detected && integrity.combined.rationale && (
        <div style={{ fontSize: 13, color: 'var(--lv-warning)', background: 'color-mix(in srgb, var(--lv-warning) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--lv-warning) 25%, transparent)', borderRadius: 6, padding: '10px 12px', marginBottom: 16 }}>
          <strong>Combined signal:</strong> {integrity.combined.rationale}
        </div>
      )}

      {/* ── R2: DETAIL (chronological, correlated) ── */}
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Evidence timeline</div>
      {integrity.events.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--lv-text-muted)' }}>No integrity events were recorded for this interview.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {clusters.map((cl, i) => {
            if (cl.events.length === 1) {
              return <div key={i} style={{ padding: '8px 10px', border: '1px solid var(--lv-surface-muted)', borderRadius: 8 }}><EvidenceRow e={cl.events[0]} /></div>
            }
            // Correlated group — co-occurring signals shown as one linked entry.
            const qText = qContextOf(cl.events)
            const labels = Array.from(new Set(cl.events.map((e) => e.label)))
            return (
              <div key={i} style={{ border: '1px solid color-mix(in srgb, var(--lv-accent) 25%, transparent)', background: 'color-mix(in srgb, var(--lv-accent) 4%, transparent)', borderRadius: 6, padding: '10px 12px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-accent)', marginBottom: 6 }}>
                  Correlated activity — {labels.length} signals co-occurred{qText ? <> while answering: <span style={{ fontStyle: 'italic', fontWeight: 600, color: 'var(--lv-brand)' }}>“{qText.slice(0, 90)}{qText.length > 90 ? '…' : ''}”</span></> : ''}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderLeft: '2px solid color-mix(in srgb, var(--lv-accent) 25%, transparent)', paddingLeft: 10 }}>
                  {cl.events.map((e, j) => <EvidenceRow key={j} e={e} />)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {terminationReason && terminationReason !== 'COMPLETED' && (
        <div style={{ fontSize: 12, color: 'var(--lv-text-muted)', marginTop: 12, borderTop: '1px solid var(--lv-surface-muted)', paddingTop: 10 }}>
          Interview ended: <strong>{terminationReason.replace(/_/g, ' ').toLowerCase()}</strong>.
        </div>
      )}
    </div>
  )
}

// ── Must-have requirements (Screen F3) ─────────────────────────────────────
// The recruiter's non-negotiables, each judged met / not met / insufficient
// evidence from the transcript. Insufficient is never shown as a fail.
export interface MustHaveShape { requirement: string; status: 'met' | 'not_met' | 'insufficient_evidence'; evidence: string }

const MH_STYLE: Record<MustHaveShape['status'], { label: string; fg: string; bg: string; icon: string }> = {
  met: { label: 'Met', fg: 'var(--lv-success)', bg: 'color-mix(in srgb, var(--lv-success) 10%, transparent)', icon: '✓' },
  not_met: { label: 'Not met', fg: 'var(--lv-danger)', bg: 'color-mix(in srgb, var(--lv-danger) 10%, transparent)', icon: '✕' },
  insufficient_evidence: { label: 'Insufficient evidence', fg: 'var(--lv-text-muted)', bg: 'var(--lv-surface-muted)', icon: '?' },
}

export function MustHavePanel({ items }: { items: MustHaveShape[] | null | undefined }) {
  if (!Array.isArray(items) || items.length === 0) return null
  const met = items.filter((i) => i.status === 'met').length
  const notMet = items.filter((i) => i.status === 'not_met').length
  const allMet = met === items.length
  const tone = allMet ? 'var(--lv-success)' : notMet ? 'var(--lv-danger)' : 'var(--lv-warning)'
  return (
    <div style={{ background: 'var(--lv-surface)', border: '1px solid var(--lv-border)', borderRadius: 8, padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--lv-text)', margin: 0 }}>Must-have requirements</h3>
        <span style={{ fontSize: 13, fontWeight: 600, color: tone, background: `color-mix(in srgb, ${tone} 10%, transparent)`, borderRadius: 100, padding: '4px 12px' }}>{met}/{items.length} met</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--lv-text-muted)' }}>Set by the recruiter · judged from the transcript</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', margin: '0 0 14px' }}>
        {allMet ? 'Every non-negotiable was demonstrated in the interview.'
          : notMet ? `${notMet} non-negotiable${notMet > 1 ? 's were' : ' was'} not met — review before advancing.`
          : 'Some requirements weren’t covered in enough depth to judge — consider probing them in the next round.'}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((m, i) => {
          const st = MH_STYLE[m.status] ?? MH_STYLE.insufficient_evidence
          return (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 12px', border: '1px solid var(--lv-surface-muted)', borderRadius: 6 }}>
              <span aria-hidden style={{ width: 22, height: 22, borderRadius: 6, background: st.bg, color: st.fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{st.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--lv-text)' }}>{m.requirement}</div>
                {m.evidence && <div style={{ fontSize: 13, color: 'var(--lv-text-muted)', marginTop: 2, lineHeight: 1.5 }}>{m.evidence}</div>}
              </div>
              <span style={{ whiteSpace: 'nowrap', fontWeight: 600, color: st.fg, background: st.bg, borderRadius: 100, padding: '3px 10px', fontSize: 12 }}>{st.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Logistics / early filters (Screen) ─────────────────────────────────────
// Recruiter-only. Separate axis from competency / communication / culture /
// integrity — the "can this even work?" check a recruiter reads FIRST.
type LgVerdict = 'fit' | 'resolved' | 'gap' | 'mismatch' | 'recorded' | 'unknown'
type CompVerdictT = 'below' | 'within' | 'above' | 'recorded' | 'not_disclosed'
export interface LogisticsShape {
  location: { verdict: LgVerdict; summary: string }
  notice: { verdict: LgVerdict; summary: string }
  comp: { verdict: CompVerdictT; summary: string }
  workAuth: { verdict: LgVerdict; summary: string }
  hardMismatch: boolean
  completed: boolean
  knockouts?: KnockoutShape[]
}

const LG_TONE: Record<string, { label: string; fg: string; bg: string }> = {
  fit: { label: 'Fits', fg: 'var(--lv-success)', bg: 'color-mix(in srgb, var(--lv-success) 10%, transparent)' },
  resolved: { label: 'Resolved', fg: 'var(--lv-brand)', bg: 'color-mix(in srgb, var(--lv-brand) 10%, transparent)' },
  gap: { label: 'Gap', fg: 'var(--lv-warning)', bg: 'color-mix(in srgb, var(--lv-warning) 12%, transparent)' },
  mismatch: { label: 'Mismatch', fg: 'var(--lv-danger)', bg: 'color-mix(in srgb, var(--lv-danger) 10%, transparent)' },
  recorded: { label: 'Recorded', fg: 'var(--lv-text-body)', bg: 'var(--lv-surface-muted)' },
  unknown: { label: 'Not established', fg: 'var(--lv-text-muted)', bg: 'var(--lv-surface-sunken)' },
  within: { label: 'Within band', fg: 'var(--lv-success)', bg: 'color-mix(in srgb, var(--lv-success) 10%, transparent)' },
  below: { label: 'Below band', fg: 'var(--lv-brand)', bg: 'color-mix(in srgb, var(--lv-brand) 10%, transparent)' },
  above: { label: 'Above band', fg: 'var(--lv-warning)', bg: 'color-mix(in srgb, var(--lv-warning) 12%, transparent)' },
  not_disclosed: { label: 'Not shared', fg: 'var(--lv-text-muted)', bg: 'var(--lv-surface-sunken)' },
}

export function LogisticsPanel({ logistics }: { logistics: LogisticsShape | null | undefined }) {
  if (!logistics) return null
  const rows: { key: string; title: string; verdict: string; summary: string; sensitive?: boolean }[] = [
    { key: 'location', title: 'Location & work mode', ...logistics.location },
    { key: 'notice', title: 'Notice & start date', ...logistics.notice },
    { key: 'comp', title: 'Compensation expectation', ...logistics.comp, sensitive: true },
    { key: 'workAuth', title: 'Work authorization', ...logistics.workAuth },
  ]
  return (
    <div style={{ background: 'var(--lv-surface)', border: `1px solid ${logistics.hardMismatch ? 'var(--lv-danger-border)' : 'var(--lv-border)'}`, borderRadius: 8, padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--lv-text)', margin: 0 }}>Logistics</h3>
        {logistics.hardMismatch
          ? <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-danger)', background: 'color-mix(in srgb, var(--lv-danger) 10%, transparent)', borderRadius: 100, padding: '4px 12px' }}>Hard mismatch</span>
          : <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-success)', background: 'color-mix(in srgb, var(--lv-success) 10%, transparent)', borderRadius: 100, padding: '4px 12px' }}>No hard blockers</span>}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--lv-text-muted)' }}>Early filters · recruiter-only · separate from competency</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', margin: '0 0 14px' }}>
        {logistics.hardMismatch ? 'At least one non-negotiable logistics constraint was not resolved — check before reading the competency assessment.' : 'Practical fit as discussed with the candidate, compared against this position’s constraints.'}
        {!logistics.completed && ' The segment was cut short, so some items may be missing.'}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r) => {
          const t = LG_TONE[r.verdict] ?? LG_TONE.unknown
          return (
            // Comp never prints/exports with the report (reports get forwarded to clients).
            <div key={r.key} className={r.sensitive ? 'no-print' : undefined} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 12px', border: `1px solid ${r.verdict === 'mismatch' ? 'var(--lv-danger-border)' : 'var(--lv-surface-muted)'}`, borderRadius: 6, background: r.verdict === 'mismatch' ? 'var(--lv-danger-soft)' : 'var(--lv-surface)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--lv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', gap: 6, alignItems: 'center' }}>
                  {r.title}{r.sensitive && <span style={{ fontSize: 11, color: 'var(--lv-accent)', background: 'color-mix(in srgb, var(--lv-accent) 8%, transparent)', borderRadius: 100, padding: '1px 7px', letterSpacing: 0, textTransform: 'none' }}>Sensitive · don&apos;t share</span>}
                </div>
                <div style={{ fontSize: 14, color: 'var(--lv-text)', marginTop: 3, lineHeight: 1.5 }}>{r.summary}</div>
              </div>
              <span style={{ whiteSpace: 'nowrap', fontWeight: 600, color: t.fg, background: t.bg, borderRadius: 100, padding: '3px 10px', fontSize: 12 }}>{t.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── JD-based concept rubric ratings (#13) ──────────────────────────────────
export interface ConceptAssessmentShape { concept: string; rating: 'strong' | 'adequate' | 'weak' | 'not_assessed'; evidence: string }
const CR_STYLE: Record<ConceptAssessmentShape['rating'], { label: string; fg: string; bg: string }> = {
  strong: { label: 'Strong', fg: 'var(--lv-success)', bg: 'color-mix(in srgb, var(--lv-success) 10%, transparent)' },
  adequate: { label: 'Adequate', fg: 'var(--lv-brand)', bg: 'color-mix(in srgb, var(--lv-brand) 10%, transparent)' },
  weak: { label: 'Weak', fg: 'var(--lv-danger)', bg: 'color-mix(in srgb, var(--lv-danger) 10%, transparent)' },
  not_assessed: { label: 'Not assessed', fg: 'var(--lv-text-muted)', bg: 'var(--lv-surface-muted)' },
}

export function ConceptRubricPanel({ items }: { items: ConceptAssessmentShape[] | null | undefined }) {
  if (!Array.isArray(items) || items.length === 0) return null
  const strong = items.filter((i) => i.rating === 'strong').length
  return (
    <div style={{ background: 'var(--lv-surface)', border: '1px solid var(--lv-border)', borderRadius: 8, padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--lv-text)', margin: 0 }}>Role concepts</h3>
        <span style={{ fontSize: 13, fontWeight: 600, color: INDIGO, background: 'color-mix(in srgb, var(--lv-brand) 10%, transparent)', borderRadius: 100, padding: '4px 12px' }}>{strong}/{items.length} strong</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--lv-text-muted)' }}>Rubric derived from the JD · rated from the transcript</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', margin: '0 0 14px' }}>How the candidate did on the concepts this role actually needs, against the strong/weak anchors set for this position.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((c, i) => {
          const st = CR_STYLE[c.rating] ?? CR_STYLE.not_assessed
          return (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 12px', border: '1px solid var(--lv-surface-muted)', borderRadius: 6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--lv-text)' }}>{c.concept}</div>
                {c.evidence && <div style={{ fontSize: 13, color: 'var(--lv-text-muted)', marginTop: 2, lineHeight: 1.5 }}>{c.evidence}</div>}
              </div>
              <span style={{ whiteSpace: 'nowrap', fontWeight: 600, color: st.fg, background: st.bg, borderRadius: 100, padding: '3px 10px', fontSize: 12 }}>{st.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Recruiter knockout questions (#14) — surfaced, NEVER auto-reject ───────
export interface KnockoutShape { id: string; question: string; requiredAnswer: string; answer: string | null; verdict: 'met' | 'not_met' | 'unclear' | 'not_asked' }
const KO_STYLE: Record<KnockoutShape['verdict'], { label: string; fg: string; bg: string }> = {
  met: { label: 'Met', fg: 'var(--lv-success)', bg: 'color-mix(in srgb, var(--lv-success) 10%, transparent)' },
  not_met: { label: 'Not met', fg: 'var(--lv-danger)', bg: 'color-mix(in srgb, var(--lv-danger) 10%, transparent)' },
  unclear: { label: 'Unclear', fg: 'var(--lv-warning)', bg: 'color-mix(in srgb, var(--lv-warning) 12%, transparent)' },
  not_asked: { label: 'Not asked', fg: 'var(--lv-text-muted)', bg: 'var(--lv-surface-muted)' },
}

export function KnockoutPanel({ items }: { items: KnockoutShape[] | null | undefined }) {
  if (!Array.isArray(items) || items.length === 0) return null
  const notMet = items.filter((k) => k.verdict === 'not_met').length
  return (
    <div style={{ background: 'var(--lv-surface)', border: `1px solid ${notMet ? 'var(--lv-danger-border)' : 'var(--lv-border)'}`, borderRadius: 8, padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--lv-text)', margin: 0 }}>Knockout questions</h3>
        <span style={{ fontSize: 13, fontWeight: 600, color: notMet ? 'var(--lv-danger)' : 'var(--lv-success)', background: notMet ? 'color-mix(in srgb, var(--lv-danger) 10%, transparent)' : 'color-mix(in srgb, var(--lv-success) 10%, transparent)', borderRadius: 100, padding: '4px 12px' }}>
          {notMet ? `${notMet} not met` : 'None failed'}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--lv-text-muted)' }}>Your call — never an automatic rejection</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', margin: '0 0 14px' }}>
        {notMet ? 'The candidate gave a disqualifying answer to at least one of your knockout questions. Review before deciding.' : 'Answers to the yes/no criteria you set for this position.'}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((k) => {
          const st = KO_STYLE[k.verdict] ?? KO_STYLE.unclear
          return (
            <div key={k.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 12px', border: `1px solid ${k.verdict === 'not_met' ? 'var(--lv-danger-border)' : 'var(--lv-surface-muted)'}`, borderRadius: 6, background: k.verdict === 'not_met' ? 'var(--lv-danger-soft)' : 'var(--lv-surface)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--lv-text)' }}>{k.question}</div>
                <div style={{ fontSize: 13, color: 'var(--lv-text-muted)', marginTop: 2 }}>
                  Answered: <strong style={{ color: 'var(--lv-text-body)' }}>{k.answer ?? '—'}</strong> · Required: {k.requiredAnswer}
                </div>
              </div>
              <span style={{ whiteSpace: 'nowrap', fontWeight: 600, color: st.fg, background: st.bg, borderRadius: 100, padding: '3px 10px', fontSize: 12 }}>{st.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
