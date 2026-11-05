'use client'

import { useState } from 'react'
import { Code2, ChevronDown, ChevronUp, CheckCircle2, XCircle, EyeOff } from 'lucide-react'

// ── Work-sample report panel (Observe & Defend) ────────────────────────────
// The task, the candidate's solution, test results, how the work evolved
// (timeline moments M#) and the SEPARATE judgment axes, each citing evidence.

interface Axis { score: number | null; rationale: string; evidence: { ref: string; note: string }[] }
export interface WorkSampleShape {
  task: { title: string; prompt: string; minutes: number; testCount: number }
  language: string
  code: string
  submitted: boolean
  tests: { id: string; name: string; hidden: boolean; passed: boolean; status: string }[]
  executions: number
  timeline: {
    durationMs: number; runs: number; testRuns: number; rewrites: number; firstAllPassAt: string | null
    pastes: { count: number; largest: number; total: number }
    moments: { id: string; at: string; kind: string; note: string }[]
  }
  scores: { approach: Axis; criticalThinking: Axis; defense: Axis; correctness: { passed: number; total: number; score: number | null }; summary: string } | null
}

const mmss = (ms: number) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
const tone = (s: number | null) => s === null ? 'var(--lv-text-muted)' : s >= 75 ? 'var(--lv-success)' : s >= 50 ? 'var(--lv-text-body)' : 'var(--lv-warning)'

function AxisCard({ label, hint, axis }: { label: string; hint: string; axis: Axis | null }) {
  const s = axis?.score ?? null
  return (
    <div style={{ border: '1px solid var(--lv-border)', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)' }}>{label}</span>
        <span style={{ fontSize: 18, fontWeight: 600, color: tone(s), fontVariantNumeric: 'tabular-nums' }}>{s ?? '—'}<span style={{ fontSize: 11, color: 'var(--lv-text-muted)', fontWeight: 500 }}>{s !== null ? '/100' : ''}</span></span>
      </div>
      <span style={{ fontSize: 11, color: 'var(--lv-text-muted)' }}>{hint}</span>
      {axis?.rationale && <p style={{ fontSize: 12, color: 'var(--lv-text-body)', lineHeight: 1.55, margin: 0 }}>{axis.rationale}</p>}
      {!!axis?.evidence?.length && (
        <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'grid', gap: 4 }}>
          {axis.evidence.map((e, i) => (
            <li key={i} style={{ fontSize: 12, color: 'var(--lv-text-body)', display: 'flex', gap: 6 }}>
              <span style={{ fontFamily: 'var(--lv-font-mono)', fontSize: 11, color: 'var(--lv-text-muted)', flexShrink: 0 }}>{e.ref}</span>{e.note}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function WorkSamplePanel({ workSample }: { workSample: WorkSampleShape | null | undefined }) {
  const [showCode, setShowCode] = useState(false)
  const [showTask, setShowTask] = useState(false)
  if (!workSample) return null
  const w = workSample
  const sc = w.scores
  const passed = w.tests.filter((t) => t.passed).length
  return (
    <section style={{ background: 'var(--lv-surface)', border: '1px solid var(--lv-border)', borderRadius: 8, padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Code2 size={16} color="var(--lv-text-muted)" aria-hidden="true" />
        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--lv-text)', margin: 0 }}>Work sample</h3>
        <span style={{ fontSize: 13, color: 'var(--lv-text-body)' }}>{w.task.title}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--lv-text-muted)' }}>Observed + defended · separate from competency</span>
      </div>

      {sc?.summary && <p style={{ fontSize: 13, color: 'var(--lv-text-body)', lineHeight: 1.6, margin: 0 }}>{sc.summary}</p>}

      {/* Judgment axes + correctness */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <AxisCard label="Approach & judgment" hint="How they tackled it — design, order of work" axis={sc?.approach ?? null} />
        <AxisCard label="Critical thinking" hint="Edge cases, testing, catching their own mistakes" axis={sc?.criticalThinking ?? null} />
        <AxisCard label="Defense" hint="Explaining and defending decisions under follow-up" axis={sc?.defense ?? null} />
        <div style={{ border: '1px solid var(--lv-border)', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)' }}>Correctness</span>
            <span style={{ fontSize: 18, fontWeight: 600, color: tone(w.tests.length ? Math.round((passed / w.tests.length) * 100) : null), fontVariantNumeric: 'tabular-nums' }}>{w.tests.length ? `${passed}/${w.tests.length}` : '—'}</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--lv-text-muted)' }}>Latest test run, hidden tests included</span>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 3 }}>
            {w.tests.map((t) => (
              <li key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--lv-text-body)' }}>
                {t.passed ? <CheckCircle2 size={13} color="var(--lv-success)" aria-label="passed" /> : <XCircle size={13} color="var(--lv-danger)" aria-label="failed" />}
                {t.name}{t.hidden && <EyeOff size={11} color="var(--lv-text-muted)" aria-label="hidden test" />}
              </li>
            ))}
            {!w.tests.length && <li style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>Tests were never run.</li>}
          </ul>
        </div>
      </div>
      {!sc && <p style={{ fontSize: 12, color: 'var(--lv-text-muted)', margin: 0 }}>Judgment scores are generated with the report.</p>}

      {/* How the work evolved */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>How the work evolved</div>
        <div style={{ fontSize: 12, color: 'var(--lv-text-body)', marginBottom: 8 }}>
          {mmss(w.timeline.durationMs)} on task · {w.timeline.runs} runs · {w.timeline.testRuns} test runs
          {w.timeline.firstAllPassAt ? ` · all tests passing at ${w.timeline.firstAllPassAt}` : ''}
          {` · ${w.timeline.rewrites} approach change${w.timeline.rewrites === 1 ? '' : 's'}`}
          {w.timeline.pastes.count ? ` · ${w.timeline.pastes.count} paste${w.timeline.pastes.count === 1 ? '' : 's'} (largest ${w.timeline.pastes.largest} chars)` : ' · no pastes'}
        </div>
        {w.timeline.moments.length ? (
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 4 }}>
            {w.timeline.moments.map((m) => (
              <li key={m.id} style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--lv-text-body)' }}>
                <span style={{ fontFamily: 'var(--lv-font-mono)', fontSize: 11, color: 'var(--lv-text-muted)', width: 28, flexShrink: 0 }}>{m.id}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--lv-text-muted)', width: 40, flexShrink: 0 }}>{m.at}</span>
                <span style={{ color: m.kind === 'paste' ? 'var(--lv-warning)' : 'var(--lv-text-body)' }}>{m.note}</span>
              </li>
            ))}
          </ol>
        ) : <p style={{ fontSize: 12, color: 'var(--lv-text-muted)', margin: 0 }}>No activity was captured.</p>}
      </div>

      {/* Task + solution (collapsible) */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setShowTask((v) => !v)} aria-expanded={showTask} className="lv-btn lv-btn--secondary lv-btn--sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {showTask ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Task
        </button>
        <button type="button" onClick={() => setShowCode((v) => !v)} aria-expanded={showCode} className="lv-btn lv-btn--secondary lv-btn--sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {showCode ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Solution ({w.language}){w.submitted ? '' : ' · not submitted'}
        </button>
      </div>
      {showTask && <p style={{ fontSize: 13, color: 'var(--lv-text-body)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{w.task.prompt}</p>}
      {showCode && (
        <pre style={{ margin: 0, padding: 14, borderRadius: 8, background: 'var(--lv-surface-sunken)', border: '1px solid var(--lv-border)', fontFamily: 'var(--lv-font-mono)', fontSize: 12, lineHeight: 1.55, color: 'var(--lv-text)', overflowX: 'auto', maxHeight: 420 }}>{w.code || '(empty)'}</pre>
      )}
    </section>
  )
}
