'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2, ShieldCheck, Play, ArrowLeft, BookOpen } from 'lucide-react'
import { Page, PageHeader, Card, Button, Badge, Alert, EmptyState, LoadingBlock, Tabs, TabPanel, type Tone } from '@/components/screen/ui'
import {
  ROLE_KEYS, ROLE_LABEL, DIFFICULTIES, DIFFICULTY_BAND, RUBRIC_DIMENSIONS, DIMENSION_LABEL,
  type RoleKey, type RubricCriterion, type RubricProbe, type SkillNode,
} from '@/lib/screen/taskbank/types'
import { WORKSPACE_LANGUAGES, LANGUAGE_LABEL, type TaskTest } from '@/lib/screen/workspace/task'

// ── Task bank admin (Screen-scoped) ─────────────────────────────────────────
// Tasks (with per-task rubric + expected probe answers) and role skill maps.
// Human review is enforced: draft → reviewed (note required) → active
// (reference solution must pass in Judge0). Only ACTIVE tasks are used live.

interface ListRow {
  id: string; title: string; roles: string[]; skills: string[]; difficulty: string; experienceMin: number; experienceMax: number
  languages: string[]; minutes: number; status: string; isSample: boolean; reviewedBy: string | null; lastVerifiedAt: string | null
  testCount: number; probeCount: number; criteriaCount: number
}
interface FullTask {
  id: string; title: string; prompt: string; roles: string[]; skills: string[]; difficulty: string
  experienceMin: number; experienceMax: number; languages: string[]; starterCode: Record<string, string> | null
  tests: TaskTest[]; referenceSolution: string | null; referenceLanguage: string; minutes: number
  status: string; isSample: boolean; reviewNote: string | null; reviewedBy: string | null; reviewedAt: string | null; lastVerifiedAt: string | null
  rubric: { criteria: RubricCriterion[]; probes: RubricProbe[] } | null
  qaEvidence?: { independentSolutions: string[]; testsAgree: number; mutants: { name: string; caughtBy: string[] }[]; checkedOn: string } | null
}
interface SkillMapRow { id: string; role: string; title: string; skills: SkillNode[]; isSample: boolean }

const STATUS_TONE: Record<string, Tone> = { draft: 'neutral', reviewed: 'info', active: 'success', retired: 'warning' }
const input: React.CSSProperties = { width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid var(--lv-border)', background: 'var(--lv-surface)', color: 'var(--lv-text)', fontSize: 13, fontFamily: 'var(--lv-font-sans)' }
const mono: React.CSSProperties = { ...input, fontFamily: 'var(--lv-font-mono)', fontSize: 12 }
const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--lv-text)', marginBottom: 4 }
const hint: React.CSSProperties = { fontSize: 12, color: 'var(--lv-text-muted)', margin: '2px 0 0' }

const blankTask = (): Omit<FullTask, 'id' | 'status' | 'isSample' | 'reviewNote' | 'reviewedBy' | 'reviewedAt' | 'lastVerifiedAt'> => ({
  title: '', prompt: '', roles: ['backend'], skills: [], difficulty: 'mid', experienceMin: 2, experienceMax: 7, languages: ['python'],
  starterCode: { python: 'import sys\n\ndef main():\n    data = sys.stdin.read()\n\nmain()\n' }, tests: [], referenceSolution: '', referenceLanguage: 'python', minutes: 10,
  rubric: { criteria: [], probes: [] },
})

export function TaskBankPage() {
  const [tab, setTab] = useState<'tasks' | 'maps'>('tasks')
  const [rows, setRows] = useState<ListRow[] | null>(null)
  const [maps, setMaps] = useState<SkillMapRow[] | null>(null)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [loadingSamples, setLoadingSamples] = useState(false)

  const load = useCallback(async () => {
    const [t, m] = await Promise.all([fetch('/api/task-bank').then((r) => (r.ok ? r.json() : [])), fetch('/api/skill-maps').then((r) => (r.ok ? r.json() : []))])
    setRows(Array.isArray(t) ? t : []); setMaps(Array.isArray(m) ? m : [])
  }, [])
  useEffect(() => { void load() }, [load])

  const loadSamples = async () => {
    setLoadingSamples(true)
    try {
      const r = await fetch('/api/task-bank/samples', { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast.success(`Starter content loaded: ${d.created} new draft task${d.created === 1 ? '' : 's'}, ${d.updated} updated, ${d.skipped} reviewed task${d.skipped === 1 ? '' : 's'} left untouched; ${d.mapsCreated} skill map${d.mapsCreated === 1 ? '' : 's'} added, ${d.mapsUpdated} updated`)
      void load()
    } catch { toast.error('Couldn\'t load the starter content. Please try again.') } finally { setLoadingSamples(false) }
  }

  if (editing) return <TaskEditor id={editing} onClose={() => { setEditing(null); void load() }} />

  return (
    <Page>
      <PageHeader title="Task bank" description="Practical work-sample tasks, their rubrics, and the skill maps that steer what Ananya covers."
        actions={<>
          <Button variant="secondary" leftIcon={<BookOpen size={16} />} loading={loadingSamples} onClick={loadSamples}>Load Levl1 starter content</Button>
          <Button leftIcon={<Plus size={16} />} onClick={() => setEditing('new')}>New task</Button>
        </>} />
      <Alert tone="info" title="Human review is required before a task goes live" style={{ marginBottom: 16 }}>
        Technical tasks, test cases and rubrics must be reviewed by someone who hires for that role before they are marked active. Levl1 starter content is machine-checked (independent solution + deliberately wrong solutions) but that is not a substitute for a hiring engineer&apos;s judgement on realism and the expected probe answers. Only <strong>active</strong> tasks are ever selected for live interviews.
      </Alert>
      <Tabs label="Task bank sections" value={tab} onChange={setTab} idPrefix="tb"
        items={[{ key: 'tasks', label: 'Tasks', count: rows?.length }, { key: 'maps', label: 'Role skill maps', count: maps?.length }]} />
      <div style={{ marginTop: 16 }}>
        {tab === 'tasks' && (
          <TabPanel tabKey="tasks" idPrefix="tb">
            {!rows ? <LoadingBlock /> : rows.length === 0 ? (
              <EmptyState title="No tasks yet" description="Load the Levl1 starter content (11 draft tasks across 7 roles), or create your first task." action={<Button size="sm" onClick={() => setEditing('new')}>New task</Button>} />
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {rows.map((r) => (
                  <button key={r.id} type="button" onClick={() => setEditing(r.id)} className="lv-card--interactive"
                    style={{ textAlign: 'left', display: 'flex', gap: 12, alignItems: 'center', padding: '12px 14px', border: '1px solid var(--lv-border)', borderRadius: 8, background: 'var(--lv-surface)', cursor: 'pointer' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--lv-text)' }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--lv-text-muted)', marginTop: 2 }}>
                        {r.roles.map((x) => ROLE_LABEL[x as RoleKey] ?? x).join(', ')} · {r.difficulty} ({r.experienceMin}–{r.experienceMax} yrs) · {r.skills.join(', ') || 'no skills tagged'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--lv-text-muted)', marginTop: 2 }}>
                        {r.testCount} tests · {r.criteriaCount} criteria · {r.probeCount} probe answers{r.lastVerifiedAt ? ' · verified in Judge0' : ''}{r.reviewedBy ? ` · reviewed by ${r.reviewedBy}` : ''}
                      </div>
                    </div>
                    {r.isSample && <Badge tone="info">Levl1 content</Badge>}
                    <Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>{r.status}</Badge>
                  </button>
                ))}
              </div>
            )}
          </TabPanel>
        )}
        {tab === 'maps' && (
          <TabPanel tabKey="maps" idPrefix="tb">
            <SkillMaps maps={maps} onChanged={load} />
          </TabPanel>
        )}
      </div>
    </Page>
  )
}

/* ── Task editor ───────────────────────────────────────────────────────── */
function TaskEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const [task, setTask] = useState<FullTask | null>(null)
  const [draft, setDraft] = useState(blankTask())
  const [starterLang, setStarterLang] = useState('python')
  const [saving, setSaving] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verify, setVerify] = useState<{ allPass: boolean; results: { id: string; name: string; passed: boolean; status: string; actual: string; stderr: string }[] } | null>(null)
  const [reviewNote, setReviewNote] = useState('')

  useEffect(() => {
    if (id === 'new') return
    fetch(`/api/task-bank/${id}`).then((r) => r.json()).then((t: FullTask) => {
      setTask(t)
      setDraft({ title: t.title, prompt: t.prompt, roles: t.roles, skills: t.skills, difficulty: t.difficulty, experienceMin: t.experienceMin, experienceMax: t.experienceMax,
        languages: t.languages, starterCode: t.starterCode ?? {}, tests: Array.isArray(t.tests) ? t.tests : [], referenceSolution: t.referenceSolution ?? '', referenceLanguage: t.referenceLanguage,
        minutes: t.minutes, rubric: { criteria: t.rubric?.criteria ?? [], probes: t.rubric?.probes ?? [] } })
      setStarterLang(t.languages[0] ?? 'python')
    }).catch(() => toast.error('Couldn\'t load the task.'))
  }, [id])

  const set = <K extends keyof typeof draft>(k: K, v: (typeof draft)[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const rubric = draft.rubric ?? { criteria: [], probes: [] }
  const setRubric = (r: typeof rubric) => set('rubric', r)

  const save = async () => {
    setSaving(true)
    try {
      const r = await fetch(id === 'new' ? '/api/task-bank' : `/api/task-bank/${id}`, { method: id === 'new' ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Couldn\'t save the task.')
      toast.success(d.demoted ? 'Saved — content changed, so the task is back to draft for re-review' : 'Task saved')
      if (id === 'new') onClose(); else { setTask((t) => (t ? { ...t, ...d } : t)); setVerify(null) }
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Couldn\'t save the task.') } finally { setSaving(false) }
  }
  const runVerify = async () => {
    setVerifying(true)
    try {
      const r = await fetch(`/api/task-bank/${id}/verify`, { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setVerify(d); setTask((t) => (t ? { ...t, lastVerifiedAt: d.allPass ? new Date().toISOString() : null } : t))
      toast[d.allPass ? 'success' : 'error'](d.allPass ? 'Reference solution passes every test' : 'Some tests fail against the reference solution')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Couldn\'t verify.') } finally { setVerifying(false) }
  }
  const setStatus = async (status: string) => {
    try {
      const r = await fetch(`/api/task-bank/${id}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, note: reviewNote }) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setTask((t) => (t ? { ...t, ...d } : t)); setReviewNote('')
      toast.success(status === 'active' ? (d.unverified ? 'Active (not Judge0-verified — execution is not configured)' : 'Active — eligible for live interviews') : `Marked ${status}`)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Couldn\'t change the status.') }
  }
  const del = async () => {
    if (!confirm('Delete this task permanently?')) return
    const r = await fetch(`/api/task-bank/${id}`, { method: 'DELETE' })
    if (r.ok) { toast.success('Task deleted'); onClose() } else toast.error('Couldn\'t delete the task.')
  }

  if (id !== 'new' && !task) return <Page><LoadingBlock /></Page>
  const status = task?.status ?? 'draft'

  return (
    <Page>
      <div style={{ marginBottom: 12 }}><Button variant="tertiary" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={onClose}>Task bank</Button></div>
      <PageHeader title={id === 'new' ? 'New task' : draft.title || 'Task'} eyebrow={task ? <span style={{ display: 'inline-flex', gap: 6 }}><Badge tone={STATUS_TONE[status]}>{status}</Badge>{task.isSample && <Badge tone="info">Levl1 content — review before use</Badge>}</span> : undefined}
        actions={<>
          {id !== 'new' && <Button variant="ghost" iconOnly aria-label="Delete task" onClick={del}><Trash2 size={16} /></Button>}
          <Button loading={saving} onClick={save}>Save</Button>
        </>} />

      <div style={{ display: 'grid', gap: 16 }}>
        {/* Review workflow */}
        {id !== 'new' && (
          <Card title="Review" subtitle="Draft → reviewed (by someone who hires for this role) → active. Editing the content of a reviewed task returns it to draft.">
            <div style={{ display: 'grid', gap: 10 }}>
              {task?.reviewedBy && <div style={{ fontSize: 12, color: 'var(--lv-text-body)' }}>Reviewed by <strong>{task.reviewedBy}</strong>{task.reviewedAt ? ` on ${new Date(task.reviewedAt).toLocaleDateString()}` : ''}{task.reviewNote ? ` — “${task.reviewNote}”` : ''}</div>}
              {task?.qaEvidence && (
                <div style={{ fontSize: 12, color: 'var(--lv-text-body)', border: '1px solid var(--lv-border)', borderRadius: 6, padding: '8px 10px', background: 'var(--lv-surface-sunken)' }}>
                  <strong>Levl1 content QA</strong> (machine-checked on {task.qaEvidence.checkedOn} — not a human review): an independent {task.qaEvidence.independentSolutions.join(' + ')} solution agrees on all {task.qaEvidence.testsAgree} tests, and each deliberately wrong solution is caught:
                  <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                    {task.qaEvidence.mutants.map((m) => <li key={m.name}>{m.name} — caught by {m.caughtBy.length} test{m.caughtBy.length === 1 ? '' : 's'} ({m.caughtBy.join(', ')})</li>)}
                  </ul>
                  <div style={{ marginTop: 4, color: 'var(--lv-text-muted)' }}>Your reviewer checks what a machine can&apos;t: is the task realistic for this level, and are the expected probe answers what a strong hire would actually say?</div>
                </div>
              )}
              <div style={{ fontSize: 12, color: task?.lastVerifiedAt ? 'var(--lv-success)' : 'var(--lv-text-muted)' }}>{task?.lastVerifiedAt ? `Reference solution verified in Judge0 on ${new Date(task.lastVerifiedAt).toLocaleString()}` : 'Not yet verified in Judge0'}</div>
              {status === 'draft' && (
                <>
                  <textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} rows={2} placeholder="Review note — who reviewed it and what they checked (required)" style={input} />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button variant="secondary" size="sm" leftIcon={<Play size={14} />} loading={verifying} onClick={runVerify}>Verify in Judge0</Button>
                    <Button size="sm" leftIcon={<ShieldCheck size={14} />} disabled={!reviewNote.trim()} onClick={() => setStatus('reviewed')}>Mark reviewed</Button>
                  </div>
                </>
              )}
              {status === 'reviewed' && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button variant="secondary" size="sm" leftIcon={<Play size={14} />} loading={verifying} onClick={runVerify}>Verify in Judge0</Button>
                  <Button size="sm" onClick={() => setStatus('active')}>Activate for live use</Button>
                  <Button variant="tertiary" size="sm" onClick={() => setStatus('draft')}>Back to draft</Button>
                </div>
              )}
              {status === 'active' && <div style={{ display: 'flex', gap: 8 }}><Button variant="secondary" size="sm" onClick={() => setStatus('retired')}>Retire</Button><Button variant="tertiary" size="sm" onClick={() => setStatus('draft')}>Back to draft</Button></div>}
              {status === 'retired' && <div><Button variant="secondary" size="sm" onClick={() => setStatus('draft')}>Reopen as draft</Button></div>}
              {verify && (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--lv-text-body)' }}>
                  {verify.results.map((r) => <li key={r.id} style={{ color: r.passed ? 'var(--lv-success)' : 'var(--lv-danger)' }}>{r.name}: {r.passed ? 'pass' : `fail (${r.status})${r.actual ? ` — got: ${r.actual.slice(0, 120)}` : ''}${r.stderr ? ` — ${r.stderr.slice(0, 160)}` : ''}`}</li>)}
                </ul>
              )}
            </div>
          </Card>
        )}

        <Card title="Task">
          <div style={{ display: 'grid', gap: 12 }}>
            <label><span style={lbl}>Title</span><input value={draft.title} onChange={(e) => set('title', e.target.value)} style={input} /></label>
            <label><span style={lbl}>Problem statement</span><textarea value={draft.prompt} onChange={(e) => set('prompt', e.target.value)} rows={7} style={input} />
              <p style={hint}>Real-world framing. State the exact stdin input format and stdout output format, with one small worked example.</p></label>
            <div>
              <span style={lbl}>Roles</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ROLE_KEYS.map((r) => { const on = draft.roles.includes(r); return (
                  <button key={r} type="button" aria-pressed={on} onClick={() => set('roles', on ? draft.roles.filter((x) => x !== r) : [...draft.roles, r])}
                    style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${on ? 'var(--lv-brand)' : 'var(--lv-border)'}`, background: on ? 'var(--lv-brand-soft)' : 'var(--lv-surface)', color: on ? 'var(--lv-brand-text)' : 'var(--lv-text-body)' }}>{ROLE_LABEL[r]}</button>
                ) })}
              </div>
            </div>
            <label><span style={lbl}>Skill tags</span><input value={draft.skills.join(', ')} onChange={(e) => set('skills', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} style={input} placeholder="api-design, concurrency, sql" />
              <p style={hint}>Use the skill ids from the role skill map so selection and coverage can match them.</p></label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
              <label><span style={lbl}>Difficulty</span>
                <select value={draft.difficulty} onChange={(e) => { const d = e.target.value as keyof typeof DIFFICULTY_BAND; setDraft((x) => ({ ...x, difficulty: d, experienceMin: DIFFICULTY_BAND[d].min, experienceMax: DIFFICULTY_BAND[d].max })) }} style={input}>
                  {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select></label>
              <label><span style={lbl}>Experience min</span><input type="number" min={0} max={40} value={draft.experienceMin} onChange={(e) => set('experienceMin', Number(e.target.value))} style={input} /></label>
              <label><span style={lbl}>Experience max</span><input type="number" min={0} max={40} value={draft.experienceMax} onChange={(e) => set('experienceMax', Number(e.target.value))} style={input} /></label>
              <label><span style={lbl}>Minutes</span><input type="number" min={5} max={30} value={draft.minutes} onChange={(e) => set('minutes', Number(e.target.value))} style={input} /></label>
            </div>
            <div>
              <span style={lbl}>Languages candidates may use</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {WORKSPACE_LANGUAGES.map((l) => { const on = draft.languages.includes(l); return (
                  <button key={l} type="button" aria-pressed={on} onClick={() => set('languages', on ? draft.languages.filter((x) => x !== l) : [...draft.languages, l])}
                    style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${on ? 'var(--lv-brand)' : 'var(--lv-border)'}`, background: on ? 'var(--lv-brand-soft)' : 'var(--lv-surface)', color: on ? 'var(--lv-brand-text)' : 'var(--lv-text-body)' }}>{LANGUAGE_LABEL[l]}</button>
                ) })}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ ...lbl, marginBottom: 0 }}>Starter code</span>
                <select value={starterLang} onChange={(e) => setStarterLang(e.target.value)} style={{ ...input, width: 'auto', padding: '3px 8px' }}>
                  {draft.languages.map((l) => <option key={l} value={l}>{LANGUAGE_LABEL[l as keyof typeof LANGUAGE_LABEL] ?? l}</option>)}
                </select>
              </div>
              <textarea value={draft.starterCode?.[starterLang] ?? ''} onChange={(e) => set('starterCode', { ...(draft.starterCode ?? {}), [starterLang]: e.target.value })} rows={6} style={mono} />
              <p style={hint}>Reads stdin; no solution logic.</p>
            </div>
          </div>
        </Card>

        <Card title="Test cases" subtitle="stdin → expected stdout. Hidden tests run but their input and expected output are never shown to the candidate."
          actions={<Button variant="secondary" size="sm" leftIcon={<Plus size={14} />} onClick={() => set('tests', [...draft.tests, { id: `t${draft.tests.length + 1}`, name: `Test ${draft.tests.length + 1}`, input: '', expected: '', hidden: draft.tests.length > 0 }])}>Add test</Button>}>
          <div style={{ display: 'grid', gap: 10 }}>
            {draft.tests.length === 0 && <p style={hint}>No tests yet. Add at least two (one visible example, the rest hidden edge cases).</p>}
            {draft.tests.map((t, i) => (
              <div key={i} style={{ border: '1px solid var(--lv-border)', borderRadius: 8, padding: 10, display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input value={t.name} onChange={(e) => set('tests', draft.tests.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} style={{ ...input, flex: 1 }} aria-label="Test name" />
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--lv-text-body)' }}><input type="checkbox" checked={t.hidden} onChange={(e) => set('tests', draft.tests.map((x, j) => j === i ? { ...x, hidden: e.target.checked } : x))} /> Hidden</label>
                  <Button variant="ghost" size="sm" iconOnly aria-label="Remove test" onClick={() => set('tests', draft.tests.filter((_, j) => j !== i))}><Trash2 size={14} /></Button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <textarea value={t.input} onChange={(e) => set('tests', draft.tests.map((x, j) => j === i ? { ...x, input: e.target.value } : x))} rows={4} placeholder="stdin" style={mono} aria-label="Input" />
                  <textarea value={t.expected} onChange={(e) => set('tests', draft.tests.map((x, j) => j === i ? { ...x, expected: e.target.value } : x))} rows={4} placeholder="expected stdout" style={mono} aria-label="Expected output" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Reference solution" subtitle="Never shown to candidates. Used to verify every test in Judge0 before the task can go active.">
          <div style={{ display: 'grid', gap: 8 }}>
            <select value={draft.referenceLanguage} onChange={(e) => set('referenceLanguage', e.target.value)} style={{ ...input, width: 'auto' }}>
              {WORKSPACE_LANGUAGES.map((l) => <option key={l} value={l}>{LANGUAGE_LABEL[l]}</option>)}
            </select>
            <textarea value={draft.referenceSolution ?? ''} onChange={(e) => set('referenceSolution', e.target.value)} rows={10} style={mono} />
          </div>
        </Card>

        <Card title="Rubric — what strong and weak look like" subtitle="Scorable criteria. These feed the approach / critical-thinking scores and the per-criterion verdicts in the report."
          actions={<Button variant="secondary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setRubric({ ...rubric, criteria: [...rubric.criteria, { id: `c${rubric.criteria.length + 1}`, dimension: 'correctness', strong: '', weak: '', weight: 1 }] })}>Add criterion</Button>}>
          <div style={{ display: 'grid', gap: 10 }}>
            {rubric.criteria.map((c, i) => (
              <div key={i} style={{ border: '1px solid var(--lv-border)', borderRadius: 8, padding: 10, display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select value={c.dimension} onChange={(e) => setRubric({ ...rubric, criteria: rubric.criteria.map((x, j) => j === i ? { ...x, dimension: e.target.value as RubricCriterion['dimension'] } : x) })} style={{ ...input, width: 'auto' }}>
                    {RUBRIC_DIMENSIONS.map((d) => <option key={d} value={d}>{DIMENSION_LABEL[d]}</option>)}
                  </select>
                  <label style={{ fontSize: 12, color: 'var(--lv-text-body)' }}>Weight <select value={c.weight} onChange={(e) => setRubric({ ...rubric, criteria: rubric.criteria.map((x, j) => j === i ? { ...x, weight: Number(e.target.value) } : x) })} style={{ ...input, width: 'auto', padding: '3px 6px' }}>{[1, 2, 3].map((w) => <option key={w} value={w}>{w}</option>)}</select></label>
                  <span style={{ marginLeft: 'auto' }}><Button variant="ghost" size="sm" iconOnly aria-label="Remove criterion" onClick={() => setRubric({ ...rubric, criteria: rubric.criteria.filter((_, j) => j !== i) })}><Trash2 size={14} /></Button></span>
                </div>
                <textarea value={c.strong} onChange={(e) => setRubric({ ...rubric, criteria: rubric.criteria.map((x, j) => j === i ? { ...x, strong: e.target.value } : x) })} rows={2} placeholder="Strong solution…" style={input} aria-label="Strong" />
                <textarea value={c.weak} onChange={(e) => setRubric({ ...rubric, criteria: rubric.criteria.map((x, j) => j === i ? { ...x, weak: e.target.value } : x) })} rows={2} placeholder="Weak solution…" style={input} aria-label="Weak" />
              </div>
            ))}
          </div>
        </Card>

        <Card title="Expected answers to likely probes" subtitle="For each key decision: what a strong candidate says when asked “why X?”. This is what lets Ananya judge the defense, not just ask. Never shown to candidates."
          actions={<Button variant="secondary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setRubric({ ...rubric, probes: [...rubric.probes, { id: `p${rubric.probes.length + 1}`, decision: '', question: '', strongAnswer: '', weakSignals: '' }] })}>Add probe</Button>}>
          <div style={{ display: 'grid', gap: 10 }}>
            {rubric.probes.length === 0 && <p style={hint}>No probe answers yet — a task can&apos;t be marked reviewed without at least one.</p>}
            {rubric.probes.map((p, i) => (
              <div key={i} style={{ border: '1px solid var(--lv-border)', borderRadius: 8, padding: 10, display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={p.decision} onChange={(e) => setRubric({ ...rubric, probes: rubric.probes.map((x, j) => j === i ? { ...x, decision: e.target.value } : x) })} placeholder="Decision (e.g. data structure for history)" style={{ ...input, flex: 1 }} aria-label="Decision" />
                  <Button variant="ghost" size="sm" iconOnly aria-label="Remove probe" onClick={() => setRubric({ ...rubric, probes: rubric.probes.filter((_, j) => j !== i) })}><Trash2 size={14} /></Button>
                </div>
                <input value={p.question} onChange={(e) => setRubric({ ...rubric, probes: rubric.probes.map((x, j) => j === i ? { ...x, question: e.target.value } : x) })} placeholder="Probe question" style={input} aria-label="Probe question" />
                <textarea value={p.strongAnswer} onChange={(e) => setRubric({ ...rubric, probes: rubric.probes.map((x, j) => j === i ? { ...x, strongAnswer: e.target.value } : x) })} rows={2} placeholder="A strong candidate would say…" style={input} aria-label="Strong answer" />
                <textarea value={p.weakSignals} onChange={(e) => setRubric({ ...rubric, probes: rubric.probes.map((x, j) => j === i ? { ...x, weakSignals: e.target.value } : x) })} rows={2} placeholder="Weak signals…" style={input} aria-label="Weak signals" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Page>
  )
}

/* ── Role skill maps ───────────────────────────────────────────────────── */
function SkillMaps({ maps, onChanged }: { maps: SkillMapRow[] | null; onChanged: () => void }) {
  const [open, setOpen] = useState<string | null>(null)
  const [draft, setDraft] = useState<SkillNode[]>([])
  const [newRole, setNewRole] = useState<RoleKey>('backend')
  if (!maps) return <LoadingBlock />
  const startEdit = (m: SkillMapRow) => { setOpen(m.id); setDraft(m.skills) }
  const save = async (id: string) => {
    const r = await fetch(`/api/skill-maps/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skills: draft }) })
    if (r.ok) { toast.success('Skill map saved'); setOpen(null); onChanged() } else toast.error('Couldn\'t save the skill map.')
  }
  const create = async () => {
    const r = await fetch('/api/skill-maps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: newRole, title: ROLE_LABEL[newRole], skills: [] }) })
    const d = await r.json()
    if (r.ok) { onChanged(); toast.success('Skill map created') } else toast.error(d.error ?? 'Couldn\'t create the skill map.')
  }
  const csv = (a: string[]) => a.join(', ')
  const fromCsv = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <p style={{ ...hint, margin: 0 }}>A skill map lists the competencies for a role with priority (1 = core). Selection matches a position&apos;s JD skills and must-haves to these; during the interview, coverage steers Ananya to go deeper on strengths and reach unassessed must-haves in time.</p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select value={newRole} onChange={(e) => setNewRole(e.target.value as RoleKey)} style={{ ...input, width: 'auto' }}>{ROLE_KEYS.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select>
        <Button variant="secondary" size="sm" leftIcon={<Plus size={14} />} onClick={create}>New skill map</Button>
      </div>
      <UnmatchedSkills onChanged={onChanged} />
      {maps.length === 0 && <EmptyState title="No skill maps yet" description="Load the Levl1 starter content to add maps for all seven roles, or create one." />}
      {maps.map((m) => (
        <Card key={m.id} title={<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>{m.title}{m.isSample && <Badge tone="info">Levl1 content</Badge>}</span>}
          subtitle={`${ROLE_LABEL[m.role as RoleKey] ?? m.role} · ${m.skills.length} skills`}
          actions={open === m.id ? <><Button variant="tertiary" size="sm" onClick={() => setOpen(null)}>Cancel</Button><Button size="sm" onClick={() => save(m.id)}>Save</Button></> : <Button variant="secondary" size="sm" onClick={() => startEdit(m)}>Edit</Button>}>
          {open !== m.id ? (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {m.skills.map((s) => <Badge key={s.id} tone={s.priority === 1 ? 'brand' : 'neutral'} title={s.aliases.join(', ')}>{s.name}{s.priority === 1 ? ' · core' : ''}</Badge>)}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {draft.map((s, i) => (
                <div key={i} style={{ border: '1px solid var(--lv-border)', borderRadius: 8, padding: 10, display: 'grid', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={s.name} onChange={(e) => setDraft(draft.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} style={{ ...input, flex: 1 }} aria-label="Skill name" />
                    <select value={s.priority} onChange={(e) => setDraft(draft.map((x, j) => j === i ? { ...x, priority: Number(e.target.value) as 1 | 2 | 3 } : x))} style={{ ...input, width: 'auto' }} aria-label="Priority">
                      <option value={1}>Core</option><option value={2}>Important</option><option value={3}>Nice to have</option>
                    </select>
                    <Button variant="ghost" size="sm" iconOnly aria-label="Remove skill" onClick={() => setDraft(draft.filter((_, j) => j !== i))}><Trash2 size={14} /></Button>
                  </div>
                  <input value={csv(s.aliases)} onChange={(e) => setDraft(draft.map((x, j) => j === i ? { ...x, aliases: fromCsv(e.target.value) } : x))} placeholder="Aliases (JD words that mean this skill), comma-separated" style={input} aria-label="Aliases" />
                  <textarea value={s.deeperProbes.join('\n')} onChange={(e) => setDraft(draft.map((x, j) => j === i ? { ...x, deeperProbes: e.target.value.split('\n').map((l) => l.trim()).filter(Boolean) } : x))} rows={2} placeholder="Deeper probes when the candidate is strong (one per line)" style={input} aria-label="Deeper probes" />
                  <input value={csv(s.adjacent)} onChange={(e) => setDraft(draft.map((x, j) => j === i ? { ...x, adjacent: fromCsv(e.target.value) } : x))} placeholder="Adjacent skill ids to move to when covered / stuck" style={input} aria-label="Adjacent skills" />
                </div>
              ))}
              <div><Button variant="secondary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setDraft([...draft, { id: '', name: 'New skill', aliases: [], priority: 2, dependsOn: [], deeperProbes: [], adjacent: [] }])}>Add skill</Button></div>
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}

/* ── Unrecognised JD skills → grow aliases from real JDs ─────────────────── */
interface UnmatchedRole { role: string; mapId: string | null; skills: { id: string; name: string }[]; terms: { term: string; positions: number; examples: string[] }[] }
function UnmatchedSkills({ onChanged }: { onChanged: () => void }) {
  const [data, setData] = useState<{ roles: UnmatchedRole[]; positionsWithoutRole: { id: string; title: string }[] } | null>(null)
  const [pick, setPick] = useState<Record<string, string>>({})
  const load = useCallback(() => { fetch('/api/skill-maps/unmatched').then((r) => (r.ok ? r.json() : null)).then(setData).catch(() => setData(null)) }, [])
  useEffect(() => { load() }, [load])
  const apply = async (role: UnmatchedRole, term: string, mode: 'alias' | 'skill') => {
    if (!role.mapId) return
    const full = await fetch('/api/skill-maps').then((r) => r.json()) as SkillMapRow[]
    const map = full.find((m) => m.id === role.mapId)
    if (!map) return
    const target = pick[`${role.role}:${term}`] ?? role.skills[0]?.id
    const skills = mode === 'skill'
      ? [...map.skills, { id: '', name: term, aliases: [term.toLowerCase()], priority: 2, dependsOn: [], deeperProbes: [], adjacent: [] }]
      : map.skills.map((s) => (s.id === target ? { ...s, aliases: Array.from(new Set([...s.aliases, term.toLowerCase()])) } : s))
    const r = await fetch(`/api/skill-maps/${role.mapId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skills }) })
    if (r.ok) { toast.success(mode === 'skill' ? `Added "${term}" as a new skill` : `"${term}" now matches ${role.skills.find((x) => x.id === target)?.name ?? target}`); load(); onChanged() }
    else toast.error('Couldn\'t update the skill map.')
  }
  if (!data) return null
  const total = data.roles.reduce((n, r) => n + r.terms.length, 0)
  return (
    <Card title="Unrecognised JD skills" subtitle={total ? `${total} skill term${total === 1 ? '' : 's'} from your positions' JDs and must-haves don't match any skill yet. Map them so selection and coverage understand your JDs.` : 'Every skill in your positions\' JDs and must-haves matches a skill map entry.'}>
      <div style={{ display: 'grid', gap: 14 }}>
        {data.roles.map((role) => (
          <div key={role.role}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{ROLE_LABEL[role.role as RoleKey] ?? role.role}{!role.mapId && ' — no skill map yet (create one below)'}</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {role.terms.map((t) => (
                <div key={t.term} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', border: '1px solid var(--lv-border)', borderRadius: 6, padding: '6px 10px' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)' }}>{t.term}</span>
                  <span style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>{t.positions} position{t.positions === 1 ? '' : 's'} · e.g. {t.examples.join(', ')}</span>
                  {role.mapId && (
                    <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                      <select aria-label={`Skill to map "${t.term}" to`} value={pick[`${role.role}:${t.term}`] ?? role.skills[0]?.id ?? ''} onChange={(e) => setPick((p) => ({ ...p, [`${role.role}:${t.term}`]: e.target.value }))} style={{ ...input, width: 'auto', padding: '3px 6px' }}>
                        {role.skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <Button size="sm" variant="secondary" onClick={() => apply(role, t.term, 'alias')}>Add as alias</Button>
                      <Button size="sm" variant="tertiary" onClick={() => apply(role, t.term, 'skill')}>New skill</Button>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {data.positionsWithoutRole.length > 0 && (
          <p style={{ ...hint, margin: 0 }}>No technical role could be inferred for: {data.positionsWithoutRole.map((p) => p.title).join(', ')}. That&apos;s expected for non-technical roles; for technical ones, a clearer title (e.g. &quot;Backend Engineer&quot;) helps.</p>
        )}
      </div>
    </Card>
  )
}
