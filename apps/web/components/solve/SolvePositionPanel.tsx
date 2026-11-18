'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Send, RefreshCw, Sparkles, ShieldCheck, Library, Copy, FileText, ChevronRight, EyeOff } from 'lucide-react'
import { Card, Button, ButtonLink, Badge, Alert, Field, Input, Select, Checkbox, Table, EmptyState, LoadingBlock, type Column, type Tone } from '@/components/screen/ui'
import { LANGUAGE_LABEL, sanitizeTask, type WorkSampleTask, type WorkspaceLanguage } from '@/lib/screen/workspace/task'
import { INTEGRITY_INFO, LIMITS, SOLVE_STATUS_LABEL, DEFENSE_STATUS_LABEL, type SolveConfig } from '@/lib/screen/solve/config'
import { PRODUCTS } from '@/config/site'

// ── Position → Solve tab (recruiter) ───────────────────────────────────────
// Stage 2 of the funnel for this position: turn it on, pick + approve the
// task (same task bank / AI-generate pipeline as the Screen work sample),
// configure the window and the defense, and send it to candidates — usually
// the ones who passed Screen.

interface SolveRow {
  id: string; status: string; invitedAt: string; expiresAt: string; startedAt: string | null; submittedAt: string | null; autoSubmitted: boolean
  submissionQuality: string | null; defenseStatus: string; defenseDeadlineAt: string | null; score: number | null; recommendation: string | null; reportStatus: string | null
}
interface CandidateRow { id: string; name: string; email: string; screen: { status: string; score: number | null; recommendation: string | null }; solve: SolveRow | null }
interface Data { assignment: { enabled: boolean; config: SolveConfig; task: unknown; updatedAt: string | null }; screenTask: WorkSampleTask | null; canEdit: boolean; candidates: CandidateRow[] }

const REC: Record<string, { label: string; tone: Tone }> = {
  strong_yes: { label: 'Strong yes', tone: 'success' }, yes: { label: 'Yes', tone: 'brand' }, maybe: { label: 'Maybe', tone: 'warning' }, no: { label: 'No', tone: 'danger' },
}
const passedScreen = (c: CandidateRow) => c.screen.recommendation === 'yes' || c.screen.recommendation === 'strong_yes'

export function SolvePositionPanel({ positionId }: { positionId: string }) {
  const [data, setData] = useState<Data | null>(null)
  const [cfg, setCfg] = useState<SolveConfig | null>(null)
  const [savingCfg, setSavingCfg] = useState(false)
  const [taskBusy, setTaskBusy] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [links, setLinks] = useState<Record<string, string>>({})
  const [bank, setBank] = useState<{ id: string; title: string; status: string; difficulty: string; score: number; reasons: string[]; selectable: boolean }[] | null>(null)

  const load = useCallback(async () => {
    const r = await fetch(`/api/positions/${positionId}/solve`, { cache: 'no-store' })
    const d = await r.json().catch(() => null)
    if (!r.ok || !d) { toast.error(d?.error ?? 'Couldn\'t load the take-home settings.'); return }
    setData(d); setCfg(d.assignment.config)
  }, [positionId])
  useEffect(() => { void load() }, [load])
  useEffect(() => {
    fetch(`/api/positions/${positionId}/task-candidates?all=1`).then((r) => (r.ok ? r.json() : null)).then((d) => setBank(d?.candidates ?? [])).catch(() => setBank([]))
  }, [positionId])

  const task = useMemo(() => sanitizeTask(data?.assignment.task), [data])
  const canEdit = !!data?.canEdit

  const put = async (body: Record<string, unknown>, ok: string) => {
    setSavingCfg(true)
    try {
      const r = await fetch(`/api/positions/${positionId}/solve`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Couldn\'t save.')
      setData((p) => (p ? { ...p, assignment: d.assignment } : p)); setCfg(d.assignment.config); toast.success(ok)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Couldn\'t save.') } finally { setSavingCfg(false) }
  }

  const taskAction = async (body: Record<string, unknown>) => {
    setTaskBusy(true)
    try {
      const r = await fetch(`/api/positions/${positionId}/solve/task`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Couldn\'t update the task.')
      setData((p) => (p ? { ...p, assignment: { ...p.assignment, task: d.task } } : p)); toast.success(d.note ?? 'Task updated')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Couldn\'t update the task.') } finally { setTaskBusy(false) }
  }

  const send = async (ids: string[]) => {
    if (!ids.length) return
    setSending(true)
    try {
      const r = await fetch(`/api/positions/${positionId}/solve/invite`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidateIds: ids }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Couldn\'t send the take-home.')
      const sent = d.sent as { candidateId: string; url: string; emailed: boolean }[]
      setLinks((l) => ({ ...l, ...Object.fromEntries(sent.map((s) => [s.candidateId, s.url])) }))
      const skipped = d.skipped as { name: string; reason: string }[]
      toast.success(`Sent to ${sent.length} candidate${sent.length === 1 ? '' : 's'}${sent.some((s) => !s.emailed) ? ' — some emails failed, copy their links' : ''}`)
      if (skipped.length) toast(`${skipped.length} skipped: ${skipped[0].reason}`)
      setSelected(new Set()); await load()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Couldn\'t send.') } finally { setSending(false) }
  }

  if (!data || !cfg) return <LoadingBlock label="Loading take-home…" />
  const a = data.assignment
  const sendable = (c: CandidateRow) => !c.solve || c.solve.status === 'invited' || c.solve.status === 'expired'
  const ready = a.enabled && !!task?.approved
  const set = <K extends keyof SolveConfig>(k: K, v: SolveConfig[K]) => setCfg((c) => (c ? { ...c, [k]: v } : c))

  const columns: Column<CandidateRow>[] = [
    { key: 'sel', header: <span className="lv-sr-only">Select</span>, width: 36, render: (c) => (
      <input type="checkbox" aria-label={`Select ${c.name}`} disabled={!canEdit || !ready || !sendable(c)} checked={selected.has(c.id)}
        onChange={(e) => setSelected((s) => { const n = new Set(s); if (e.target.checked) n.add(c.id); else n.delete(c.id); return n })} />
    ) },
    { key: 'name', header: 'Candidate', render: (c) => <div><div style={{ fontWeight: 600, color: 'var(--lv-text)' }}>{c.name}</div><div style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>{c.email}</div></div> },
    { key: 'screen', header: PRODUCTS.screen.name, render: (c) => c.screen.recommendation && REC[c.screen.recommendation]
      ? <Badge tone={REC[c.screen.recommendation].tone}>{REC[c.screen.recommendation].label}{c.screen.score != null ? ` · ${c.screen.score}` : ''}</Badge>
      : <span style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>{c.screen.status === 'completed' ? 'Completed' : 'Not yet'}</span> },
    { key: 'solve', header: PRODUCTS.takeHome.name, render: (c) => {
      const s = c.solve
      if (!s) return <span style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>Not sent</span>
      const tone: Tone = s.status === 'completed' ? 'success' : s.status === 'expired' ? 'danger' : s.status === 'invited' ? 'neutral' : 'brand'
      return (
        <div style={{ display: 'grid', gap: 3 }}>
          <Badge tone={tone}>{SOLVE_STATUS_LABEL[s.status] ?? s.status}{s.autoSubmitted ? ' (time ran out)' : ''}</Badge>
          {s.defenseStatus !== 'not_required' && s.status !== 'invited' && <span style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>{DEFENSE_STATUS_LABEL[s.defenseStatus]}</span>}
          {s.submissionQuality && s.submissionQuality !== 'ok' && <span style={{ fontSize: 12, color: 'var(--lv-warning)' }}>No meaningful work submitted</span>}
          {s.reportStatus === 'failed' && <span style={{ fontSize: 12, color: 'var(--lv-danger)' }}>Report failed — retry from the report</span>}
        </div>
      )
    } },
    { key: 'result', header: 'Result', render: (c) => {
      const s = c.solve
      if (!s || s.status !== 'completed') return <span style={{ color: 'var(--lv-text-muted)' }}>—</span>
      if (!s.recommendation) return <Badge tone="neutral">Insufficient evidence</Badge>
      return <Badge tone={REC[s.recommendation]?.tone ?? 'neutral'}>{REC[s.recommendation]?.label ?? s.recommendation}{s.score != null ? ` · ${s.score}` : ''}</Badge>
    } },
    { key: 'actions', header: <span className="lv-sr-only">Actions</span>, render: (c) => (
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {links[c.id] && <Button size="sm" variant="tertiary" leftIcon={<Copy size={13} />} onClick={() => { void navigator.clipboard.writeText(links[c.id]).then(() => toast.success('Link copied')) }}>Copy link</Button>}
        {c.solve && c.solve.status !== 'invited' && c.solve.status !== 'expired'
          ? <ButtonLink size="sm" variant="secondary" href={`/solve/report/${c.solve.id}`} leftIcon={<FileText size={13} />}>{c.solve.status === 'completed' ? 'Report' : 'View'}</ButtonLink>
          : canEdit && ready && <Button size="sm" variant="secondary" leftIcon={<Send size={13} />} disabled={sending} onClick={() => send([c.id])}>{c.solve ? 'Resend' : 'Send'}</Button>}
      </div>
    ) },
  ]

  const passed = data.candidates.filter((c) => passedScreen(c) && sendable(c) && !c.solve)
  const taskLangs: WorkspaceLanguage[] = task?.languages ?? []

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Funnel position */}
      <div aria-label="Hiring funnel" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13 }}>
        {[PRODUCTS.screen, PRODUCTS.takeHome, PRODUCTS.liveInterview].map((p, i) => (
          <span key={p.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {i > 0 && <ChevronRight size={14} aria-hidden="true" color="var(--lv-text-muted)" />}
            <span style={{ fontWeight: p === PRODUCTS.takeHome ? 600 : 400, color: p === PRODUCTS.takeHome ? 'var(--lv-text)' : 'var(--lv-text-muted)' }}>
              Stage {p.stage} · {p.name}{p.status === 'soon' && p !== PRODUCTS.takeHome ? ' (coming soon)' : ''}
            </span>
          </span>
        ))}
      </div>

      <Card title={`${PRODUCTS.takeHome.name}: take-home assessment`} subtitle="A real-world task candidates solve on their own time, auto-evaluated, then defended in a short AI conversation so it can't be faked."
        actions={canEdit ? <Checkbox checked={a.enabled} disabled={savingCfg} onChange={(v) => put({ enabled: v }, v ? 'Take-home turned on for this position' : 'Take-home turned off')}>Use for this position</Checkbox> : <Badge tone={a.enabled ? 'success' : 'neutral'}>{a.enabled ? 'On' : 'Off'}</Badge>}>
        {!a.enabled ? (
          <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', margin: 0 }}>Off. Turn it on to choose a task and send it to candidates, typically the ones who passed {PRODUCTS.screen.name}.</p>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <Field label="Window to start" hint={`${LIMITS.windowDays.min}–${LIMITS.windowDays.max} days after the invite`}>
                <Input type="number" min={LIMITS.windowDays.min} max={LIMITS.windowDays.max} value={cfg.windowDays} disabled={!canEdit} onChange={(e) => set('windowDays', Number(e.target.value))} />
              </Field>
              <Field label="Time allowed once started" hint={`${LIMITS.durationMinutes.min}–${LIMITS.durationMinutes.max} minutes`}>
                <Input type="number" min={LIMITS.durationMinutes.min} max={LIMITS.durationMinutes.max} value={cfg.durationMinutes} disabled={!canEdit} onChange={(e) => set('durationMinutes', Number(e.target.value))} />
              </Field>
              <Field label="Outside AI help" hint="The defense applies either way.">
                <Select value={cfg.aiPolicy} disabled={!canEdit} onChange={(e) => set('aiPolicy', e.target.value as SolveConfig['aiPolicy'])}>
                  <option value="not_allowed">Not allowed</option><option value="allowed">Allowed — must be able to explain it</option>
                </Select>
              </Field>
              <Field label="Integrity level" hint={INTEGRITY_INFO[cfg.integrityLevel]}>
                <Select value={cfg.integrityLevel} disabled={!canEdit} onChange={(e) => set('integrityLevel', e.target.value as SolveConfig['integrityLevel'])}>
                  <option value="light">Light</option><option value="standard">Standard</option><option value="strict">Strict</option>
                </Select>
              </Field>
            </div>
            <div style={{ borderTop: '1px solid var(--lv-border)', paddingTop: 12, display: 'grid', gap: 10 }}>
              <Checkbox checked={cfg.defenseRequired || cfg.integrityLevel === 'strict'} disabled={!canEdit || cfg.integrityLevel === 'strict'} onChange={(v) => set('defenseRequired', v)}
                description="A short spoken AI interview where the candidate explains and defends their own code. Someone who didn't do the work can't defend it.">
                Require the defend-your-submission interview{cfg.integrityLevel === 'strict' ? ' (always on with strict integrity)' : ''}
              </Checkbox>
              {(cfg.defenseRequired || cfg.integrityLevel === 'strict') && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <Field label="When">
                    <Select value={cfg.defenseTiming} disabled={!canEdit} onChange={(e) => set('defenseTiming', e.target.value as SolveConfig['defenseTiming'])}>
                      <option value="flexible">Right after, or later within a window</option><option value="immediate">Right after submitting</option>
                    </Select>
                  </Field>
                  {cfg.defenseTiming === 'flexible' && (
                    <Field label="Window (hours)" hint={`${LIMITS.defenseWindowHours.min}–${LIMITS.defenseWindowHours.max}`}>
                      <Input type="number" min={LIMITS.defenseWindowHours.min} max={LIMITS.defenseWindowHours.max} value={cfg.defenseWindowHours} disabled={!canEdit} onChange={(e) => set('defenseWindowHours', Number(e.target.value))} />
                    </Field>
                  )}
                  <Field label="Follow-up questions" hint="After “walk me through it”; it may stop earlier.">
                    <Input type="number" min={LIMITS.defenseQuestions.min} max={LIMITS.defenseQuestions.max} value={cfg.defenseQuestions} disabled={!canEdit} onChange={(e) => set('defenseQuestions', Number(e.target.value))} />
                  </Field>
                </div>
              )}
            </div>
            {taskLangs.length > 1 && (
              <div style={{ borderTop: '1px solid var(--lv-border)', paddingTop: 12 }}>
                <div className="lv-label" style={{ marginBottom: 6 }}>Languages candidates may use</div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  {taskLangs.map((l) => (
                    <Checkbox key={l} disabled={!canEdit} checked={!cfg.languages.length || cfg.languages.includes(l)}
                      onChange={(v) => { const cur = cfg.languages.length ? cfg.languages : taskLangs; const next = v ? Array.from(new Set([...cur, l])) : cur.filter((x) => x !== l); set('languages', next.length === taskLangs.length ? [] : next) }}>
                      {LANGUAGE_LABEL[l]}
                    </Checkbox>
                  ))}
                </div>
              </div>
            )}
            {canEdit && <div><Button size="sm" loading={savingCfg} onClick={() => put({ config: cfg }, 'Take-home settings saved')}>Save settings</Button> <span style={{ fontSize: 12, color: 'var(--lv-text-muted)', marginLeft: 8 }}>Changes apply to new invites; sent take-homes keep their settings.</span></div>}
          </div>
        )}
      </Card>

      {a.enabled && (
        <Card title="Task" subtitle="From your reviewed task bank or generated from the JD (tests verified in Judge0). Hidden tests and the rubric never reach the candidate.">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {canEdit && <>
              {data.screenTask && <Button size="sm" variant="secondary" disabled={taskBusy} onClick={() => taskAction({ source: 'screen' })}>Use the {PRODUCTS.screen.name} work-sample task</Button>}
              <Button size="sm" variant="secondary" leftIcon={<RefreshCw size={14} />} loading={taskBusy} onClick={() => taskAction({ source: 'auto' })}>Auto-select</Button>
              <Button size="sm" variant="tertiary" leftIcon={<Sparkles size={14} />} disabled={taskBusy} onClick={() => taskAction({ source: 'generate' })}>Generate draft from JD</Button>
            </>}
          </div>
          {!task ? <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', margin: 0 }}>No task yet.</p> : (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--lv-text)' }}>{task.title}</span>
                <Badge tone={task.approved ? 'success' : 'warning'}>{task.approved ? (task.source === 'bank' ? 'From task bank · reviewed' : 'Approved') : 'Draft · can\'t be sent'}</Badge>
              </div>
              {!task.approved && (
                <Alert tone="warning" action={canEdit ? <Button size="sm" leftIcon={<ShieldCheck size={14} />} disabled={taskBusy} onClick={() => taskAction({ approve: true })}>Approve</Button> : undefined}>
                  AI-generated and not reviewed. Someone who hires for this role should check the task and its tests before it goes to candidates.
                </Alert>
              )}
              <div style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>{task.tests.filter((t) => !t.hidden).length} visible + {task.tests.filter((t) => t.hidden).length} hidden tests · {task.languages.map((l) => LANGUAGE_LABEL[l]).join(', ')}</div>
              <p style={{ fontSize: 13, color: 'var(--lv-text-body)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{task.prompt}</p>
              {task.probeAngles.length > 0 && <div style={{ fontSize: 12, color: 'var(--lv-text-body)' }}><strong>Decisions the defense probes:</strong> {task.probeAngles.join(' · ')}</div>}
              <details>
                <summary style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-text-muted)', cursor: 'pointer' }}>Test cases</summary>
                <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                  {task.tests.map((t) => (
                    <div key={t.id} style={{ border: '1px solid var(--lv-border)', borderRadius: 6, padding: '6px 10px', fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--lv-text)' }}>{t.name}{t.hidden && <><EyeOff size={11} aria-hidden="true" /><span style={{ fontWeight: 400, color: 'var(--lv-text-muted)' }}>hidden from candidate</span></>}</div>
                      <pre style={{ margin: '4px 0 0', fontFamily: 'var(--lv-font-mono)', fontSize: 11, whiteSpace: 'pre-wrap', color: 'var(--lv-text-body)' }}>{`in:  ${t.input.slice(0, 300) || '(empty)'}\nout: ${t.expected.slice(0, 300)}`}</pre>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
          {canEdit && bank && bank.length > 0 && (
            <div style={{ marginTop: 14, borderTop: '1px solid var(--lv-border)', paddingTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--lv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}><Library size={12} aria-hidden="true" /> Task bank matches</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {bank.slice(0, 5).map((c) => (
                  <div key={c.id} style={{ border: '1px solid var(--lv-border)', borderRadius: 6, padding: '8px 10px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)' }}>{c.title} <span style={{ fontWeight: 400, color: 'var(--lv-text-muted)' }}>· {c.difficulty} · match {c.score}</span></div>
                      <div style={{ fontSize: 12, color: 'var(--lv-text-muted)', marginTop: 2 }}>{c.reasons.join(' · ')}</div>
                    </div>
                    {c.selectable
                      ? <Button size="sm" variant="secondary" disabled={taskBusy || task?.bankTaskId === c.id} onClick={() => taskAction({ source: 'bank', taskId: c.id })}>{task?.bankTaskId === c.id ? 'In use' : 'Use this task'}</Button>
                      : <Badge tone="neutral">{c.status} · needs review</Badge>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      <Card title="Candidates" subtitle={ready ? `Send the take-home to candidates of this position. ${passed.length ? `${passed.length} passed ${PRODUCTS.screen.name} and haven't been sent it yet.` : ''}` : 'Turn the take-home on and approve a task to send it.'}
        actions={canEdit && ready ? (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {passed.length > 0 && <Button size="sm" variant="secondary" disabled={sending} onClick={() => setSelected(new Set(passed.map((c) => c.id)))}>Select everyone who passed {PRODUCTS.screen.name}</Button>}
            <Button size="sm" leftIcon={<Send size={14} />} loading={sending} disabled={!selected.size} onClick={() => send(Array.from(selected))}>Send to {selected.size || ''} selected</Button>
          </div>
        ) : undefined}>
        {data.candidates.length === 0
          ? <EmptyState plain title="No candidates yet" description="Add candidates to this position first." />
          : <Table<CandidateRow> caption="Take-home status by candidate" columns={columns} rows={data.candidates} rowKey={(c) => c.id} />}
      </Card>
    </div>
  )
}
