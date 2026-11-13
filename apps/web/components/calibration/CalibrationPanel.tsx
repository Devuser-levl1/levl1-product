'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Loader2, Plus, RefreshCw, Sparkles, Trash2, XCircle } from 'lucide-react'
import { Alert, Badge, Button, Field, Input, Select, Textarea, useConfirm } from '@/components/screen/ui'
import { RUBRIC_TIERS, TIER_INFO, proficiencyStatement, type RubricProbe, type RubricTier } from '@/lib/screen/rubrics/types'
import { MIN_NOTE_CHARS } from '@/lib/screen/calibration/types'

// ── AI draft → moderator calibration (Screen-scoped) ────────────────────────
// The AI drafts rubrics (tiered) and a work-sample task from the position; the
// moderator calibrates each item. Designed for a REAL review, not a rubber
// stamp: reasoning + confidence + flags are shown, Approve stays disabled until
// the item has been opened, flagged items need a calibration note, and there is
// deliberately no "approve all". Approval rules are also enforced server-side.

interface RubricContentUI { area: string; subSkill: string; proficientIn: string; ableTo: string; practices: string; strong: string; weak: string; keywords: string[]; probes: RubricProbe[] }
interface TestUI { id?: string; name: string; input: string; expected: string; hidden: boolean }
interface TaskProbeUI { id?: string; decision: string; question: string; strongAnswer: string; weakSignals: string }
interface TaskUI { id: string; title: string; prompt: string; languages: string[]; tests: TestUI[]; referenceSolution: string; minutes: number; difficulty: string; status: string; verified: boolean; rubric: { criteria: unknown[]; probes: TaskProbeUI[] } }
interface Item {
  id: string; kind: 'rubric' | 'task'; refId: string; reuse: boolean; tier: RubricTier | null; proposedTier: RubricTier | null
  reasoning: string; tierReason: string; confidence: number; uncertainty: string; flags: string[]
  decision: 'pending' | 'approved' | 'rejected'; note: string | null; decidedBy: string | null; lowConfidence: boolean; missing: boolean
  rubric?: (RubricContentUI & { status: string; source: string }) | null
  task?: TaskUI | null
}
interface Data {
  state: { status: 'idle' | 'generating' | 'ready' | 'failed'; error: string | null; model: string | null; generatedAt: string | null; jdThin: boolean }
  items: Item[]; workSampleMode: boolean; judge0: boolean; canEdit: boolean
}

const conf = (c: number) => (c >= 0.8 ? { label: 'High confidence', tone: 'success' as const } : c >= 0.6 ? { label: 'Medium confidence', tone: 'info' as const } : { label: 'Low confidence', tone: 'warning' as const })
const sec: React.CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--lv-text-muted)', margin: '14px 0 6px' }

export function CalibrationPanel({ positionId, onApplied }: { positionId: string; onApplied?: () => void }) {
  const [data, setData] = useState<Data | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirm, confirmDialog] = useConfirm()

  const load = useCallback(async () => {
    const r = await fetch(`/api/positions/${positionId}/calibration`, { cache: 'no-store' })
    if (r.ok) setData(await r.json())
  }, [positionId])
  useEffect(() => { void load() }, [load])
  // Poll while the AI is drafting.
  useEffect(() => {
    if (data?.state.status !== 'generating') return
    const t = setInterval(() => { void load() }, 4000)
    return () => clearInterval(t)
  }, [data?.state.status, load])

  const act = useCallback(async (key: string, body: Record<string, unknown>, ok?: string) => {
    setBusy(key)
    try {
      const r = await fetch(`/api/positions/${positionId}/calibration`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error ?? 'Something went wrong.')
      setData(d as Data)
      if (ok) toast.success(ok)
      if (body.action === 'approve' || body.action === 'reject' || body.action === 'retier') onApplied?.()
      return d as Record<string, unknown>
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Something went wrong.'); return null } finally { setBusy(null) }
  }, [positionId, onApplied])

  if (!data) return <div style={{ padding: 20, color: 'var(--lv-text-muted)', fontSize: 13 }}>Loading the AI draft…</div>
  const { state, items, canEdit } = data
  const live = items.filter((i) => i.decision !== 'rejected')
  const approved = items.filter((i) => i.decision === 'approved').length
  const pending = items.filter((i) => i.decision === 'pending')
  const attention = pending.filter((i) => i.lowConfidence).length
  const rubrics = items.filter((i) => i.kind === 'rubric')
  const tasks = items.filter((i) => i.kind === 'task')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {confirmDialog}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px', minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--lv-text)' }}>AI draft &amp; calibration</div>
          <div style={{ fontSize: 13, color: 'var(--lv-text-muted)' }}>
            The AI drafts what to assess from this position. You calibrate it: read each item, fix anything off, and approve it. Nothing is used in interviews until you approve it.
          </div>
        </div>
        {canEdit && state.status !== 'generating' && (
          <Button variant={items.length ? 'secondary' : 'primary'} leftIcon={<Sparkles size={14} />} loading={busy === 'generate'}
            onClick={async () => {
              if (items.length && !(await confirm({ title: 'Regenerate the draft?', description: 'Items you already approved are kept. Everything else is replaced with a fresh AI draft.', confirmLabel: 'Regenerate' }))) return
              void act('generate', { action: 'generate' })
            }}>
            {items.length ? 'Regenerate draft' : 'Generate AI draft'}
          </Button>
        )}
      </div>

      {state.status === 'generating' && (
        <Alert tone="info" title="Drafting from this position…">
          <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" /> Rubrics, tiers{data.workSampleMode ? ', and a work-sample task verified in Judge0' : ''}. This usually takes 1–3 minutes; you can leave this page.</span>
        </Alert>
      )}
      {state.status === 'failed' && <Alert tone="danger" title="The draft couldn't be generated">{state.error ?? 'Unknown error.'} {canEdit ? 'Try "Generate AI draft" again.' : ''}</Alert>}
      {state.jdThin && items.length > 0 && <Alert tone="warning" title="The JD is thin">The AI had little to go on, so every item is flagged for a closer look. Adding detail to the JD and regenerating will give a better draft.</Alert>}

      {items.length > 0 && (
        <div role="status" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 13, color: 'var(--lv-text-body)' }}>
          <Badge tone="neutral">{live.length} items</Badge>
          <Badge tone="success">{approved} approved</Badge>
          <Badge tone={pending.length ? 'info' : 'neutral'}>{pending.length} to review</Badge>
          {attention > 0 && <Badge tone="warning">{attention} need attention</Badge>}
          {pending.length === 0 && live.length > 0 && <span style={{ color: 'var(--lv-text-muted)' }}>Calibration complete — approved rubrics are in Role rubrics; an approved task is this position&apos;s work sample.</span>}
        </div>
      )}

      {rubrics.length > 0 && <div style={sec}>Rubrics</div>}
      {RUBRIC_TIERS.flatMap((tier) => rubrics.filter((i) => (i.tier ?? 'good') === tier && i.decision !== 'rejected')).map((i) => (
        <ItemCard key={i.id} item={i} canEdit={canEdit} busy={busy} act={act} judge0={data.judge0} />
      ))}
      {tasks.filter((i) => i.decision !== 'rejected').length > 0 && <div style={sec}>Work-sample task</div>}
      {tasks.filter((i) => i.decision !== 'rejected').map((i) => <ItemCard key={i.id} item={i} canEdit={canEdit} busy={busy} act={act} judge0={data.judge0} />)}

      {items.some((i) => i.decision === 'rejected') && (
        <details>
          <summary style={{ fontSize: 12, color: 'var(--lv-text-muted)', cursor: 'pointer' }}>{items.filter((i) => i.decision === 'rejected').length} rejected</summary>
          <ul style={{ fontSize: 12, color: 'var(--lv-text-muted)', margin: '6px 0 0', paddingLeft: 18 }}>
            {items.filter((i) => i.decision === 'rejected').map((i) => <li key={i.id}>{i.rubric?.subSkill ?? i.task?.title ?? 'Item'}{i.note ? ` — ${i.note}` : ''}</li>)}
          </ul>
        </details>
      )}

      {canEdit && state.status !== 'generating' && <AddItem workSampleMode={data.workSampleMode} busy={busy} act={act} />}
    </div>
  )
}

/* ── one item ─────────────────────────────────────────────────────────────── */

function ItemCard({ item, canEdit, busy, act, judge0 }: { item: Item; canEdit: boolean; busy: string | null; judge0: boolean; act: (k: string, b: Record<string, unknown>, ok?: string) => Promise<Record<string, unknown> | null> }) {
  const [open, setOpen] = useState(false)
  const viewed = useRef(false)
  const [note, setNote] = useState('')
  const [instruction, setInstruction] = useState('')
  const [dirty, setDirty] = useState(false)
  const title = item.kind === 'rubric' ? item.rubric?.subSkill ?? '(missing rubric)' : item.task?.title ?? '(missing task)'
  const c = conf(item.confidence)
  const needNote = item.lowConfidence && note.trim().length < MIN_NOTE_CHARS
  const approved = item.decision === 'approved'
  const k = (a: string) => `${a}:${item.id}`

  return (
    <div className="lv-card" style={{ border: `1px solid ${item.lowConfidence && !approved ? 'var(--lv-warning-border, var(--lv-border))' : 'var(--lv-border)'}`, borderRadius: 8, background: 'var(--lv-surface)' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', flexWrap: 'wrap' }}>
        <button type="button" aria-expanded={open} onClick={() => { setOpen((o) => !o); viewed.current = true }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 240px', minWidth: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
          {open ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--lv-text)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
          {item.kind === 'rubric' && item.rubric && <span style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>· {item.rubric.area}</span>}
        </button>
        {item.reuse && <Badge tone="neutral">Reused from library</Badge>}
        <Badge tone={c.tone} title={`The AI rated its own confidence ${Math.round(item.confidence * 100)}%`}>{c.label}</Badge>
        {item.lowConfidence && !approved && <Badge tone="warning"><AlertTriangle size={11} aria-hidden="true" /> Needs attention</Badge>}
        {approved ? <Badge tone="success"><CheckCircle2 size={11} aria-hidden="true" /> Approved</Badge> : <Badge tone="info">To review</Badge>}
        {item.kind === 'rubric' && (
          <Select aria-label={`Tier for ${title}`} value={item.tier ?? 'good'} disabled={!canEdit || busy === k('retier')} style={{ width: 'auto', height: 30, fontSize: 12 }}
            onChange={(e) => void act(k('retier'), { action: 'retier', itemId: item.id, tier: e.target.value }, 'Tier updated')}>
            {RUBRIC_TIERS.map((t) => <option key={t} value={t}>{TIER_INFO[t].label}</option>)}
          </Select>
        )}
      </div>

      {open && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--lv-border)' }}>
          {/* Why — shown FIRST so the moderator judges the reasoning, not just the text */}
          <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 6, background: 'var(--lv-surface-sunken)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--lv-text-muted)' }}>WHY THE AI PROPOSED THIS</div>
            {item.reasoning && <div style={{ fontSize: 13, color: 'var(--lv-text-body)' }}>{item.reasoning}</div>}
            {item.kind === 'rubric' && item.proposedTier && (
              <div style={{ fontSize: 13, color: 'var(--lv-text-body)' }}>
                <strong>Proposed tier: {TIER_INFO[item.proposedTier].label}.</strong> {item.tierReason}
                {item.tier && item.tier !== item.proposedTier && <span style={{ color: 'var(--lv-text-muted)' }}> (you changed it to {TIER_INFO[item.tier].label})</span>}
              </div>
            )}
            {item.uncertainty && <div style={{ fontSize: 13, color: 'var(--lv-text-body)' }}><strong>The AI was unsure about:</strong> {item.uncertainty}</div>}
            {item.flags.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--lv-text-body)' }}>
                {item.flags.map((f) => <li key={f}><span style={{ color: 'var(--lv-warning)' }}>Check:</span> {f}</li>)}
              </ul>
            )}
          </div>

          {item.kind === 'rubric' && item.rubric && (
            <RubricForm key={`${item.refId}:${item.decision}`} initial={item.rubric} readOnly={!canEdit} reuse={item.reuse} saving={busy === k('edit')} onDirty={setDirty}
              onSave={async (rubric) => { const ok = await act(k('edit'), { action: 'edit_rubric', itemId: item.id, rubric }, item.reuse ? 'Saved as your own draft copy — approve it when ready' : 'Edits saved'); if (ok) setDirty(false) }} />
          )}
          {item.kind === 'task' && item.task && (
            <TaskForm key={`${item.refId}:${item.decision}`} initial={item.task} readOnly={!canEdit || item.reuse} saving={busy === k('edit')} onDirty={setDirty} judge0={judge0}
              verifying={busy === k('verify')} onVerify={() => void act(k('verify'), { action: 'verify_task', itemId: item.id }).then((d) => d && toast(String((d as { note?: string }).note ?? '')))}
              onSave={async (task) => { const ok = await act(k('edit'), { action: 'edit_task', itemId: item.id, task }, 'Edits saved — verify the tests again'); if (ok) setDirty(false) }} />
          )}
          {item.missing && <Alert tone="danger">The underlying content was deleted. Reject this item.</Alert>}

          {canEdit && (
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--lv-border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <Input aria-label="Instruction for regenerating" placeholder="Optional: how should the AI redo it? e.g. more senior, focus on EF Core performance" value={instruction} onChange={(e) => setInstruction(e.target.value)} style={{ flex: '1 1 260px', minWidth: 0 }} />
                <Button size="sm" variant="secondary" leftIcon={<RefreshCw size={13} />} loading={busy === k('regen')}
                  onClick={() => void act(k('regen'), { action: 'regenerate', itemId: item.id, instruction: instruction.trim() || undefined }, 'Regenerated — review the new draft').then((d) => { if (d) { setInstruction(''); setDirty(false) } })}>
                  Regenerate this item
                </Button>
              </div>
              {!approved && (
                <>
                  <Field label={item.lowConfidence ? 'Calibration note (required for flagged items)' : 'Calibration note (optional)'}
                    hint={item.lowConfidence ? `What did you check or change? At least ${MIN_NOTE_CHARS} characters.` : 'Recorded with the approval.'}>
                    <Textarea value={note} onChange={(e) => setNote(e.target.value)} style={{ minHeight: 56 }} placeholder="e.g. Checked the probe answers against our EF Core 8 stack; replaced a deprecated API reference." />
                  </Field>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Button size="sm" leftIcon={<CheckCircle2 size={14} />} loading={busy === k('approve')} disabled={needNote || dirty || item.missing}
                      title={dirty ? 'Save or discard your edits first' : needNote ? 'Add a calibration note first' : undefined}
                      onClick={() => void act(k('approve'), { action: 'approve', itemId: item.id, note: note.trim(), viewed: viewed.current }, item.kind === 'task' ? 'Task approved — it is now this position\'s work sample' : 'Rubric approved and added to Role rubrics')}>
                      Approve
                    </Button>
                    <Button size="sm" variant="tertiary" leftIcon={<XCircle size={14} />} loading={busy === k('reject')}
                      onClick={() => void act(k('reject'), { action: 'reject', itemId: item.id, note: note.trim() }, 'Rejected')}>
                      Reject
                    </Button>
                    {dirty && <span style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>Unsaved edits</span>}
                  </div>
                </>
              )}
              {approved && <div style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>Approved by {item.decidedBy}{item.note ? ` — "${item.note}"` : ''}. Editing or regenerating sends it back for review.</div>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── editors ──────────────────────────────────────────────────────────────── */

function RubricForm({ initial, readOnly, reuse, saving, onSave, onDirty }: { initial: RubricContentUI; readOnly: boolean; reuse: boolean; saving: boolean; onSave: (r: RubricContentUI) => void; onDirty: (d: boolean) => void }) {
  const [d, setD] = useState<RubricContentUI>(initial)
  const [kw, setKw] = useState(initial.keywords.join(', '))
  const set = <K extends keyof RubricContentUI>(key: K, v: RubricContentUI[K]) => { setD((x) => ({ ...x, [key]: v })); onDirty(true) }
  const setProbe = (i: number, patch: Partial<RubricProbe>) => set('probes', d.probes.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const statement = useMemo(() => (d.proficientIn && d.ableTo && d.practices ? proficiencyStatement(d) : ''), [d])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
      {reuse && <Alert tone="info">A reviewed library rubric. Approving uses it as-is; editing makes your own draft copy for this position.</Alert>}
      {statement && <div style={{ fontSize: 13, color: 'var(--lv-text)', lineHeight: 1.55 }}>{statement}</div>}
      <fieldset disabled={readOnly} style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 10 }}>
          <Field label="Area"><Input value={d.area} onChange={(e) => set('area', e.target.value)} /></Field>
          <Field label="Sub-skill"><Input value={d.subSkill} onChange={(e) => set('subSkill', e.target.value)} /></Field>
        </div>
        <Field label="Proficient in (X)"><Textarea value={d.proficientIn} onChange={(e) => set('proficientIn', e.target.value)} style={{ minHeight: 48 }} /></Field>
        <Field label="Able to (Y)"><Textarea value={d.ableTo} onChange={(e) => set('ableTo', e.target.value)} style={{ minHeight: 48 }} /></Field>
        <Field label="By following (Z)"><Textarea value={d.practices} onChange={(e) => set('practices', e.target.value)} style={{ minHeight: 48 }} /></Field>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 10 }}>
          <Field label="Strong answer shows"><Textarea value={d.strong} onChange={(e) => set('strong', e.target.value)} style={{ minHeight: 56 }} /></Field>
          <Field label="Weak answer looks like"><Textarea value={d.weak} onChange={(e) => set('weak', e.target.value)} style={{ minHeight: 56 }} /></Field>
        </div>
        <Field label="Keywords" hint="Comma-separated — JD matching and live coverage"><Input value={kw} onChange={(e) => { setKw(e.target.value); onDirty(true) }} /></Field>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)' }}>Probes and expected answers</div>
        {d.probes.map((p, i) => (
          <div key={i} style={{ border: '1px solid var(--lv-border)', borderRadius: 6, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <Input aria-label={`Probe ${i + 1}`} value={p.question} onChange={(e) => setProbe(i, { question: e.target.value })} />
              {!readOnly && <Button variant="ghost" size="sm" iconOnly aria-label={`Remove probe ${i + 1}`} onClick={() => set('probes', d.probes.filter((_, j) => j !== i))}><Trash2 size={13} /></Button>}
            </div>
            <Input aria-label={`Probe ${i + 1} expected strong answer`} value={p.strongAnswer} onChange={(e) => setProbe(i, { strongAnswer: e.target.value })} placeholder="Expected strong answer" />
            <Input aria-label={`Probe ${i + 1} weak signals`} value={p.weakSignals} onChange={(e) => setProbe(i, { weakSignals: e.target.value })} placeholder="Weak signals" />
          </div>
        ))}
        {!readOnly && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button size="sm" variant="tertiary" leftIcon={<Plus size={13} />} disabled={d.probes.length >= 6} onClick={() => set('probes', [...d.probes, { question: '', strongAnswer: '', weakSignals: '' }])}>Add probe</Button>
            <Button size="sm" variant="secondary" loading={saving} onClick={() => onSave({ ...d, keywords: kw.split(',').map((x) => x.trim()).filter(Boolean) })}>Save edits</Button>
          </div>
        )}
      </fieldset>
    </div>
  )
}

function TaskForm({ initial, readOnly, saving, onSave, onDirty, judge0, verifying, onVerify }: { initial: TaskUI; readOnly: boolean; saving: boolean; onSave: (t: Record<string, unknown>) => void; onDirty: (d: boolean) => void; judge0: boolean; verifying: boolean; onVerify: () => void }) {
  const [d, setD] = useState(initial)
  const set = <K extends keyof TaskUI>(key: K, v: TaskUI[K]) => { setD((x) => ({ ...x, [key]: v })); onDirty(true) }
  const setTest = (i: number, patch: Partial<TestUI>) => set('tests', d.tests.map((t, j) => (j === i ? { ...t, ...patch } : t)))
  const setProbe = (i: number, patch: Partial<TaskProbeUI>) => set('rubric', { ...d.rubric, probes: d.rubric.probes.map((p, j) => (j === i ? { ...p, ...patch } : p)) })
  const mono: React.CSSProperties = { fontFamily: 'var(--lv-font-mono)', fontSize: 12 }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 13 }}>
        <Badge tone={d.verified ? 'success' : 'warning'}>{d.verified ? 'Tests verified in Judge0' : 'Tests not verified'}</Badge>
        <span style={{ color: 'var(--lv-text-muted)' }}>{d.languages.join(', ')} · {d.difficulty} · ~{d.minutes} min</span>
        {!readOnly && judge0 && <Button size="sm" variant="tertiary" loading={verifying} onClick={onVerify}>Verify in Judge0</Button>}
      </div>
      <fieldset disabled={readOnly} style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Field label="Title"><Input value={d.title} onChange={(e) => set('title', e.target.value)} /></Field>
        <Field label="Problem statement (shown to the candidate)"><Textarea value={d.prompt} onChange={(e) => set('prompt', e.target.value)} style={{ minHeight: 120 }} /></Field>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)' }}>Test cases ({d.tests.filter((t) => t.hidden).length} hidden)</div>
        {d.tests.map((t, i) => (
          <div key={i} style={{ border: '1px solid var(--lv-border)', borderRadius: 6, padding: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 6 }}>
            <Input aria-label={`Test ${i + 1} name`} value={t.name} onChange={(e) => setTest(i, { name: e.target.value })} />
            <label style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}><input type="checkbox" checked={t.hidden} onChange={(e) => setTest(i, { hidden: e.target.checked })} /> Hidden</label>
            <Textarea aria-label={`Test ${i + 1} input`} value={t.input} onChange={(e) => setTest(i, { input: e.target.value })} style={{ ...mono, minHeight: 48 }} placeholder="stdin" />
            <Textarea aria-label={`Test ${i + 1} expected output`} value={t.expected} onChange={(e) => setTest(i, { expected: e.target.value })} style={{ ...mono, minHeight: 48 }} placeholder="expected stdout" />
          </div>
        ))}
        <Field label="Reference solution (Python, never shown to candidates)"><Textarea value={d.referenceSolution} onChange={(e) => set('referenceSolution', e.target.value)} style={{ ...mono, minHeight: 120 }} /></Field>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)' }}>Defense probes and expected answers</div>
        {d.rubric.probes.map((p, i) => (
          <div key={i} style={{ border: '1px solid var(--lv-border)', borderRadius: 6, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Input aria-label={`Probe ${i + 1} decision`} value={p.decision} onChange={(e) => setProbe(i, { decision: e.target.value })} placeholder="Decision point" />
            <Input aria-label={`Probe ${i + 1} question`} value={p.question} onChange={(e) => setProbe(i, { question: e.target.value })} placeholder="Question" />
            <Input aria-label={`Probe ${i + 1} expected strong answer`} value={p.strongAnswer} onChange={(e) => setProbe(i, { strongAnswer: e.target.value })} placeholder="Expected strong answer" />
            <Input aria-label={`Probe ${i + 1} weak signals`} value={p.weakSignals} onChange={(e) => setProbe(i, { weakSignals: e.target.value })} placeholder="Weak signals" />
          </div>
        ))}
        {!readOnly && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button size="sm" variant="tertiary" leftIcon={<Plus size={13} />} onClick={() => set('tests', [...d.tests, { name: `Test ${d.tests.length + 1}`, input: '', expected: '', hidden: true }])}>Add test</Button>
            <Button size="sm" variant="secondary" loading={saving} onClick={() => onSave({ title: d.title, prompt: d.prompt, tests: d.tests, referenceSolution: d.referenceSolution, minutes: d.minutes, rubric: d.rubric })}>Save edits</Button>
          </div>
        )}
      </fieldset>
    </div>
  )
}

/* ── add items ────────────────────────────────────────────────────────────── */

function AddItem({ workSampleMode, busy, act }: { workSampleMode: boolean; busy: string | null; act: (k: string, b: Record<string, unknown>, ok?: string) => Promise<Record<string, unknown> | null> }) {
  const [competency, setCompetency] = useState('')
  const [tier, setTier] = useState<RubricTier>('good')
  const [lib, setLib] = useState<{ id: string; area: string; subSkill: string }[] | null>(null)
  const [pickId, setPickId] = useState('')
  useEffect(() => {
    fetch('/api/rubric-library?status=selectable', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : { items: [] })).then((d) => setLib(d.items ?? [])).catch(() => setLib([]))
  }, [])
  return (
    <div style={{ border: '1px dashed var(--lv-border)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)' }}>Add an item</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Input aria-label="Competency to draft" placeholder="Competency, e.g. Kafka consumer groups" value={competency} onChange={(e) => setCompetency(e.target.value)} style={{ flex: '1 1 240px', minWidth: 0 }} />
        <Select aria-label="Tier" value={tier} onChange={(e) => setTier(e.target.value as RubricTier)} style={{ width: 'auto' }}>{RUBRIC_TIERS.map((t) => <option key={t} value={t}>{TIER_INFO[t].label}</option>)}</Select>
        <Button size="sm" leftIcon={<Sparkles size={13} />} loading={busy === 'add:ai'} disabled={!competency.trim()}
          onClick={() => void act('add:ai', { action: 'add', type: 'rubric_ai', competency: competency.trim(), tier }, 'Drafted — review it below').then((d) => d && setCompetency(''))}>Draft rubric with AI</Button>
      </div>
      {lib && lib.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Select aria-label="Rubric from library" value={pickId} onChange={(e) => setPickId(e.target.value)} style={{ flex: '1 1 240px', minWidth: 0 }}>
            <option value="">Add a reviewed rubric from the library…</option>
            {lib.map((r) => <option key={r.id} value={r.id}>{r.area} → {r.subSkill}</option>)}
          </Select>
          <Button size="sm" variant="secondary" loading={busy === 'add:lib'} disabled={!pickId}
            onClick={() => void act('add:lib', { action: 'add', type: 'rubric_existing', rubricId: pickId, tier }, 'Added').then((d) => d && setPickId(''))}>Add</Button>
        </div>
      )}
      {workSampleMode && (
        <div><Button size="sm" variant="tertiary" leftIcon={<Sparkles size={13} />} loading={busy === 'add:task'}
          onClick={() => void act('add:task', { action: 'add', type: 'task_ai' }, 'Task drafted — review it below')}>Draft another task with AI</Button></div>
      )}
      <div style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>To write a rubric entirely by hand, use the Rubric library, then add it here.</div>
    </div>
  )
}
