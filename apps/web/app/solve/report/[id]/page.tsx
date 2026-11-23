'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, XCircle, EyeOff, RefreshCw } from 'lucide-react'
import { Page, Card, Badge, Alert, Button, LoadingBlock, type Tone } from '@/components/screen/ui'
import { SOLVE_STATUS_LABEL, DEFENSE_STATUS_LABEL } from '@/lib/screen/solve/config'
import type { SolveReport } from '@/lib/screen/solve/report'
import { TIER_INFO, type RubricTier } from '@/lib/screen/rubrics/types'
import { DIMENSION_LABEL, type RubricDimension } from '@/lib/screen/taskbank/types'
import { PRODUCTS } from '@/config/site'
import { ConfidenceTag } from '@/components/interviews/report/report-visuals'
import { FLUENCY_DIMENSIONS, FLUENCY_LABEL } from '@/lib/screen/solve/ai-fluency-labels'

// ── Solve report (recruiter) — verdict first, then the evidence behind it ──

interface Data {
  id: string; status: string; canEdit: boolean
  candidate: { id: string; name: string; email: string; screen: { score: number | null; recommendation: string | null } | null }
  position: { id: string; title: string; company: string }
  task: { title: string; prompt: string; tests: { id: string; name: string; hidden: boolean }[]; lookFor: string[]; probeAngles: string[] } | null
  timing: { invitedAt: string; expiresAt: string; startedAt: string | null; deadlineAt: string | null; submittedAt: string | null; autoSubmitted: boolean }
  consent: { given: boolean; at: string | null; noticeVersion: string | null }
  work: { language: string; code: string | null; finalTests: { id: string; name: string; hidden: boolean; passed: boolean; status: string }[] | null; quality: string | null; purgedAt: string | null }
  defense: { status: string; inputMode: string | null; turns: { speaker: 'ai' | 'candidate'; text: string; mode: string | null }[] }
  ai: { exchanges: { id: string; t: number; prompt: string; includedCode: boolean; response: string; blocks: { id: string; code: string }[]; error: string | null }[] }
  report: SolveReport | null; reportStatus: string | null; reportError: string | null
}

const REC: Record<string, { label: string; tone: Tone }> = {
  strong_yes: { label: 'Strong yes', tone: 'success' }, yes: { label: 'Yes', tone: 'brand' }, maybe: { label: 'Maybe', tone: 'warning' }, no: { label: 'No', tone: 'danger' },
}
const RATING: Record<string, { label: string; tone: Tone }> = {
  met: { label: 'Met', tone: 'success' }, partial: { label: 'Partial', tone: 'warning' }, not_met: { label: 'Not met', tone: 'danger' }, not_assessed: { label: 'Not assessed', tone: 'neutral' },
  strong: { label: 'Strong', tone: 'success' }, weak: { label: 'Weak', tone: 'danger' }, not_evidenced: { label: 'Not evidenced', tone: 'neutral' },
  adequate: { label: 'Adequate', tone: 'brand' },
}
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—')
const h2: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--lv-text)', margin: '0 0 8px' }

export default function SolveReportPage() {
  const { id } = useParams<{ id: string }>()
  const [d, setD] = useState<Data | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  const load = useCallback(async () => {
    const r = await fetch(`/api/solve/submissions/${id}`, { cache: 'no-store' })
    const j = await r.json().catch(() => ({}))
    if (r.status === 401) { window.location.href = `/signin?next=${encodeURIComponent(`/solve/report/${id}`)}`; return }
    if (!r.ok) { setError(j.error ?? 'Couldn\'t load this report.'); return }
    setD(j as Data)
  }, [id])
  useEffect(() => { void load() }, [load])
  // Poll while a report is being generated.
  useEffect(() => {
    if (!d || d.report || !['generating', null].includes(d.reportStatus) || d.status !== 'submitted' || ['pending', 'in_progress'].includes(d.defense.status)) return
    const iv = setInterval(() => { void load() }, 8000)
    return () => clearInterval(iv)
  }, [d, load])

  const retry = async () => {
    setRetrying(true)
    try {
      const r = await fetch(`/api/solve/submissions/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'retry_report' }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) setError(j.error ?? 'Retry failed.'); else { setError(null); await load() }
    } finally { setRetrying(false) }
  }

  if (!d) return <Page>{error ? <Alert tone="danger">{error}</Alert> : <LoadingBlock label="Loading report…" />}</Page>
  const rep = d.report
  const v = rep?.verdict
  const rec = v?.recommendation ? REC[v.recommendation] : null

  return (
    <Page style={{ maxWidth: 980 }}>
      <Link href={`/positions/${d.position.id}?tab=solve`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--lv-text-muted)', textDecoration: 'none', marginBottom: 12 }}>
        <ArrowLeft size={14} aria-hidden="true" /> {d.position.title}
      </Link>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--lv-text)', margin: 0 }}>{d.candidate.name}</h1>
        <span style={{ fontSize: 13, color: 'var(--lv-text-muted)' }}>{PRODUCTS.takeHome.name} take-home · {d.task?.title}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--lv-text-muted)', marginBottom: 18 }}>
        {SOLVE_STATUS_LABEL[d.status] ?? d.status} · started {fmt(d.timing.startedAt)} · submitted {fmt(d.timing.submittedAt)}{d.timing.autoSubmitted ? ' (time ran out)' : ''}
        {d.candidate.screen && <> · {PRODUCTS.screen.name}: {d.candidate.screen.recommendation ? REC[d.candidate.screen.recommendation]?.label : '—'}{d.candidate.screen.score != null ? ` (${d.candidate.screen.score})` : ''}</>}
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
      {error && <Alert tone="danger">{error}</Alert>}

      {/* ── Verdict ── */}
      {!rep ? (
        <Card>
          {d.status === 'invited' || d.status === 'started'
            ? <p style={{ margin: 0, fontSize: 14, color: 'var(--lv-text-body)' }}>{d.status === 'invited' ? 'Not started yet.' : `In progress — due ${fmt(d.timing.deadlineAt)}.`}</p>
            : ['pending', 'in_progress'].includes(d.defense.status)
              ? <p style={{ margin: 0, fontSize: 14, color: 'var(--lv-text-body)' }}>Submitted. Waiting for the candidate&apos;s defense interview ({DEFENSE_STATUS_LABEL[d.defense.status]}). The report is generated when it&apos;s done or its window closes.</p>
              : d.reportStatus === 'failed'
                ? <Alert tone="danger" title="The report couldn't be generated" action={d.canEdit ? <Button size="sm" leftIcon={<RefreshCw size={14} />} loading={retrying} onClick={retry}>Retry</Button> : undefined}>{d.reportError ?? 'Unknown error.'}</Alert>
                : <LoadingBlock label="Generating the report…" />}
        </Card>
      ) : (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {v?.insufficientEvidence ? <Badge tone="neutral">Insufficient evidence</Badge> : rec && <Badge tone={rec.tone}>{rec.label}</Badge>}
            {v?.score != null && <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--lv-text)', fontVariantNumeric: 'tabular-nums' }}>{v.score}<span style={{ fontSize: 14, fontWeight: 500, color: 'var(--lv-text-muted)' }}>/100</span></span>}
            {rep.correctness && <span style={{ fontSize: 13, color: 'var(--lv-text-body)' }}>Tests {rep.correctness.passed}/{rep.correctness.total} · hidden {rep.correctness.hiddenPassed}/{rep.correctness.hiddenTotal}</span>}
            {v?.confidence && !v.insufficientEvidence && (v.confidence === 'high' ? <span style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>High confidence</span> : <ConfidenceTag level={v.confidence} />)}
            {rep.defense.required && <span style={{ fontSize: 13, color: 'var(--lv-text-body)' }}>Defense: {DEFENSE_STATUS_LABEL[rep.defense.status] ?? rep.defense.status}{rep.defense.inputMode === 'typed' ? ' (typed answers)' : rep.defense.inputMode === 'mixed' ? ' (partly typed)' : ''}</span>}
          </div>
          {v?.headline && <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--lv-text)', margin: '12px 0 0', lineHeight: 1.5 }}>{v.headline}</p>}
          {!!v?.reasons.length && <ul style={{ listStyle: 'disc', margin: '8px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--lv-text-body)', lineHeight: 1.6 }}>{v.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>}
          {rep.summary && <p style={{ fontSize: 13, color: 'var(--lv-text-body)', margin: '10px 0 0', lineHeight: 1.6 }}>{rep.summary}</p>}
          {(rep.strengths.length > 0 || rep.concerns.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginTop: 14 }}>
              {rep.strengths.length > 0 && <div><div style={h2}>Strengths</div><ul style={{ listStyle: 'disc', margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: 'var(--lv-text-body)' }}>{rep.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
              {rep.concerns.length > 0 && <div><div style={h2}>Concerns</div><ul style={{ listStyle: 'disc', margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: 'var(--lv-text-body)' }}>{rep.concerns.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
            </div>
          )}
          {d.canEdit && <div style={{ marginTop: 12 }}><Button size="sm" variant="tertiary" leftIcon={<RefreshCw size={13} />} loading={retrying} onClick={retry}>Regenerate</Button></div>}
        </Card>
      )}

      {/* ── Tiered rubric ── */}
      {rep?.rubric && rep.rubric.items.length > 0 && (
        <Card title="Position rubrics" subtitle="Must-haves gate the verdict; good-to-haves add to the score; add-ons are for information.">
          {(['must', 'good', 'addon'] as RubricTier[]).map((tier) => {
            const items = rep.rubric!.items.filter((i) => i.tier === tier)
            if (!items.length) return null
            return (
              <div key={tier} style={{ marginBottom: 12 }}>
                <div style={h2}>{TIER_INFO[tier].label}</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {items.map((i) => (
                    <div key={i.rubricId} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13 }}>
                      <Badge tone={RATING[i.rating]?.tone ?? 'neutral'}>{RATING[i.rating]?.label ?? i.rating}</Badge>
                      <div><strong style={{ color: 'var(--lv-text)' }}>{i.subSkill}</strong> <span style={{ color: 'var(--lv-text-muted)' }}>· {i.area}</span>{i.evidence && <div style={{ color: 'var(--lv-text-body)', marginTop: 2 }}>{i.evidence}</div>}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </Card>
      )}

      {/* ── Judgment axes ── */}
      {rep?.axes && (
        <Card title="How they worked" subtitle="Separate axes, each citing evidence: M# = a moment in the work timeline, D# = a line of the defense.">
          <div style={{ display: 'grid', gap: 14 }}>
            {([['approach', 'Approach'], ['criticalThinking', 'Critical thinking'], ['defense', 'Defense']] as const).map(([k, label]) => {
              const ax = rep.axes![k]
              return (
                <div key={k}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}><span style={h2}>{label}</span><span style={{ fontSize: 13, fontWeight: 600, color: ax.score !== null && ax.confidence === 'low' ? 'var(--lv-text-muted)' : 'var(--lv-text)' }}>{ax.score !== null && ax.confidence === 'low' ? '~' : ''}{ax.score ?? '—'}</span>{ax.score !== null && <ConfidenceTag level={ax.confidence} reason={ax.confidenceReason} />}</div>
                  {ax.score !== null && ax.confidence && ax.confidence !== 'high' && ax.confidenceReason && <p style={{ fontSize: 12, color: 'var(--lv-text-muted)', margin: '0 0 4px' }}>{ax.confidenceReason}</p>}
                  <p style={{ fontSize: 13, color: 'var(--lv-text-body)', margin: 0, lineHeight: 1.6 }}>{ax.rationale}</p>
                  {ax.evidence.length > 0 && <ul style={{ listStyle: 'disc', margin: '4px 0 0', paddingLeft: 18, fontSize: 12, color: 'var(--lv-text-muted)', lineHeight: 1.6 }}>{ax.evidence.map((e, i) => <li key={i}><strong>{e.ref}</strong> {e.note}</li>)}</ul>}
                </div>
              )
            })}
            {rep.criteria.length > 0 && (
              <div>
                <div style={h2}>Task rubric</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {rep.criteria.map((c) => (
                    <div key={c.id} style={{ display: 'flex', gap: 10, fontSize: 13, alignItems: 'flex-start' }}>
                      <Badge tone={RATING[c.verdict]?.tone ?? 'neutral'}>{RATING[c.verdict]?.label ?? c.verdict}</Badge>
                      <span><strong style={{ color: 'var(--lv-text)' }}>{DIMENSION_LABEL[c.dimension as RubricDimension] ?? c.dimension}</strong>{c.note && <span style={{ color: 'var(--lv-text-body)' }}> — {c.note}</span>}{c.ref && <span style={{ color: 'var(--lv-text-muted)' }}> ({c.ref})</span>}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── AI use (separate axis) ── */}
      {rep?.aiUse && (() => {
        const u = rep.aiUse!
        if (u.policy === 'not_allowed') {
          const flagged = rep.integrity?.flags.some((f) => f.kind === 'ai_generated_code')
          return (
            <Card title="AI use" subtitle="AI help was not allowed for this take-home.">
              <p style={{ fontSize: 13, color: 'var(--lv-text-body)', margin: 0 }}>
                {!u.provenanceChecked ? 'The AI-generated-code check is off for this position.' : flagged ? 'Possible AI-generated code. See Integrity below. Review it with the defense transcript before deciding.' : 'Checked the submitted code and how it was written: no signs of AI generation.'}
              </p>
            </Card>
          )
        }
        if (!u.used || !u.metrics) return <Card title="AI use" subtitle="The built-in AI assistant was available."><p style={{ fontSize: 13, color: 'var(--lv-text-body)', margin: 0 }}>The candidate didn&apos;t use the assistant. This isn&apos;t scored either way.</p></Card>
        const m = u.metrics, f = u.fluency
        return (
          <Card title="AI use" subtitle="How well they worked with the built-in AI assistant. Using AI isn't penalised; using it blindly is. A# = an assistant exchange.">
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={h2}>AI fluency</span><span style={{ fontSize: 13, fontWeight: 600, color: f?.confidence === 'low' ? 'var(--lv-text-muted)' : 'var(--lv-text)' }}>{f?.confidence === 'low' && f.score != null ? '~' : ''}{f?.score ?? '—'}</span>
                {f?.score != null && <ConfidenceTag level={f.confidence} reason={f.confidenceReason} />}
                <span style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>
                  {m.prompts} question{m.prompts === 1 ? '' : 's'} · {m.codeShared} with their code · {m.inserts} insert{m.inserts === 1 ? '' : 's'}/copies · {m.verifiedAfterInsert}/{m.inserts} followed by a run · ~{Math.round(m.aiShareOfFinal * 100)}% of final code from AI
                </span>
              </div>
              {f ? <>
                {f.summary && <p style={{ fontSize: 13, color: 'var(--lv-text-body)', margin: 0, lineHeight: 1.6 }}>{f.summary}</p>}
                <div style={{ display: 'grid', gap: 6 }}>
                  {FLUENCY_DIMENSIONS.map((dim) => (
                    <div key={dim} style={{ display: 'flex', gap: 10, fontSize: 13, alignItems: 'flex-start' }}>
                      <Badge tone={RATING[f.dimensions[dim].rating]?.tone ?? 'neutral'}>{RATING[f.dimensions[dim].rating]?.label ?? f.dimensions[dim].rating}</Badge>
                      <span><strong style={{ color: 'var(--lv-text)' }}>{FLUENCY_LABEL[dim]}</strong>{f.dimensions[dim].note && <span style={{ color: 'var(--lv-text-body)' }}> — {f.dimensions[dim].note}</span>}</span>
                    </div>
                  ))}
                </div>
                {f.caughtMistakes.length > 0 && <div><div style={h2}>AI mistakes they caught</div><ul style={{ listStyle: 'disc', margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--lv-text-body)', lineHeight: 1.6 }}>{f.caughtMistakes.map((c, i) => <li key={i}><strong>{c.ref}</strong> {c.note}</li>)}</ul></div>}
                {f.evidence.length > 0 && <ul style={{ listStyle: 'disc', margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--lv-text-muted)', lineHeight: 1.6 }}>{f.evidence.map((e, i) => <li key={i}><strong>{e.ref}</strong> {e.note}</li>)}</ul>}
              </> : <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', margin: 0 }}>The fluency assessment couldn&apos;t be generated; regenerate the report to retry. The measured usage above is complete.</p>}
              {m.blocks.length > 0 && (
                <div>
                  <div style={h2}>What happened to the AI&apos;s code</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {m.blocks.map((b) => <Badge key={b.id} tone={b.fate === 'edited' ? 'brand' : 'neutral'} title={`${Math.round(b.survival * 100)}% of its lines are in the final code`}>{b.id} {b.inserted ? 'inserted' : 'reused'} · {b.fate === 'kept' ? 'kept as-is' : b.fate}</Badge>)}
                  </div>
                  {m.aiLines.length > 0 && <div style={{ fontSize: 12, color: 'var(--lv-text-muted)', marginTop: 6 }}>Final-code lines from AI: {m.aiLines.map((r) => `${r.from === r.to ? r.from : `${r.from}–${r.to}`} (${r.ref})`).join(', ')}</div>}
                </div>
              )}
              {d.ai.exchanges.length > 0 && (
                <details>
                  <summary style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-text-muted)', cursor: 'pointer' }}>Assistant conversation ({d.ai.exchanges.length})</summary>
                  <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
                    {d.ai.exchanges.map((x) => (
                      <div key={x.id} style={{ borderLeft: '2px solid var(--lv-border)', paddingLeft: 10 }}>
                        <div style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}><strong>{x.id}</strong> at {Math.floor(x.t / 60000)}:{String(Math.floor((x.t % 60000) / 1000)).padStart(2, '0')}{x.includedCode ? ' · shared their code' : ''}</div>
                        <div style={{ fontSize: 13, color: 'var(--lv-text)', margin: '2px 0 4px', whiteSpace: 'pre-wrap' }}><strong>Asked:</strong> {x.prompt}</div>
                        <pre style={{ margin: 0, fontFamily: 'var(--lv-font-mono)', fontSize: 12, whiteSpace: 'pre-wrap', background: 'var(--lv-surface-muted)', padding: 8, borderRadius: 6, color: 'var(--lv-text-body)', maxHeight: 280, overflow: 'auto' }}>{x.error ?? x.response}</pre>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </Card>
        )
      })()}

      {/* ── Integrity ── */}
      {rep?.integrity && (
        <Card title="Integrity" subtitle="For review by a person. Never rejects a candidate on its own.">
          <div style={{ fontSize: 13, color: 'var(--lv-text-body)', lineHeight: 1.6 }}>
            Level {rep.integrity.level} · {rep.integrity.pastes} paste{rep.integrity.pastes === 1 ? '' : 's'} (largest {rep.integrity.largestPaste} chars) · left the tab {rep.integrity.tabSwitches} time{rep.integrity.tabSwitches === 1 ? '' : 's'} ({Math.round(rep.integrity.awayMs / 60000)} min)
          </div>
          {rep.integrity.flags.length
            ? <ul style={{ listStyle: 'disc', margin: '6px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--lv-text-body)', lineHeight: 1.6 }}>{rep.integrity.flags.map((f, i) => <li key={i}>{f.note}</li>)}</ul>
            : <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', margin: '6px 0 0' }}>No flags.</p>}
        </Card>
      )}

      {/* ── Defense transcript ── */}
      {d.defense.turns.length > 0 && (
        <Card title="Defense interview" subtitle={d.defense.inputMode === 'typed' ? 'Answers were typed (microphone unavailable or declined).' : undefined}>
          <div style={{ display: 'grid', gap: 8 }}>
            {d.defense.turns.map((t, i) => (
              <div key={i} style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--lv-text-body)' }}>
                <strong style={{ color: 'var(--lv-text)' }}>{t.speaker === 'ai' ? 'Interviewer' : d.candidate.name.split(' ')[0]}{t.mode === 'typed' ? ' (typed)' : ''}:</strong> {t.text}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Work ── */}
      <Card title="Submission" subtitle={d.work.purgedAt ? `Code and timeline deleted on ${fmt(d.work.purgedAt)} under the retention policy.` : `${d.work.language} · consent recorded ${fmt(d.consent.at)} (notice ${d.consent.noticeVersion ?? '—'})`}>
        {d.work.finalTests && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            {d.work.finalTests.map((t) => (
              <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--lv-text-body)' }}>
                {t.passed ? <CheckCircle2 size={13} color="var(--lv-success)" aria-hidden="true" /> : <XCircle size={13} color="var(--lv-danger)" aria-hidden="true" />}
                {t.name}{t.hidden && <EyeOff size={11} aria-label="hidden test" />}
              </span>
            ))}
          </div>
        )}
        {rep?.work.moments.length ? (
          <details style={{ marginBottom: 10 }} open>
            <summary style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-text-muted)', cursor: 'pointer' }}>Work timeline ({rep.work.activeMinutes} active min · {rep.work.runs} runs · {rep.work.testRuns} test runs)</summary>
            <ul style={{ listStyle: 'disc', margin: '6px 0 0', paddingLeft: 18, fontSize: 12, color: 'var(--lv-text-body)', lineHeight: 1.7 }}>{rep.work.moments.map((m) => <li key={m.id}><strong>{m.id}</strong> @{m.at} — {m.note}</li>)}</ul>
          </details>
        ) : null}
        {d.work.code != null && (
          <details>
            <summary style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-text-muted)', cursor: 'pointer' }}>Submitted code</summary>
            <pre style={{ margin: '8px 0 0', fontFamily: 'var(--lv-font-mono)', fontSize: 12, whiteSpace: 'pre-wrap', background: 'var(--lv-surface-muted)', padding: 12, borderRadius: 6, color: 'var(--lv-text-body)', maxHeight: 520, overflow: 'auto' }}>{d.work.code || '(empty)'}</pre>
          </details>
        )}
      </Card>
      </div>
    </Page>
  )
}
