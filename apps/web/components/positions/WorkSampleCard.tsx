'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { EyeOff, RefreshCw, Sparkles, Library, ShieldCheck } from 'lucide-react'
import { Card, Button, Badge, Alert } from '@/components/screen/ui'
import { InterviewModeField } from './InterviewModeField'
import { hasWorkspace, isInterviewMode, resolveMode, suggestMode, type InterviewMode } from '@/lib/screen/workspace/modes'
import { LANGUAGE_LABEL, sanitizeTask } from '@/lib/screen/workspace/task'

// Position page: interview mode + the Observe & Defend work-sample task.
// Mode saves immediately; the task can be (re)generated from the JD — its
// tests are verified in Judge0 when execution is configured.

export interface WorkSamplePosition {
  id: string; title: string; jdText?: string | null; techStack?: string[] | null; roleType?: string | null
  interviewMode?: string | null; workSampleTask?: unknown
}

export function WorkSampleCard({ position, onUpdated }: { position: WorkSamplePosition; onUpdated: (patch: { interviewMode?: string | null; workSampleTask?: unknown }) => void }) {
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const explicit = isInterviewMode(position.interviewMode) ? position.interviewMode : null
  const suggested = suggestMode(position)
  const mode = resolveMode(position)
  const task = sanitizeTask(position.workSampleTask)

  const setMode = async (m: InterviewMode | null) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/positions/${position.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ interviewMode: m }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Couldn\'t save the interview mode. Please try again.')
      onUpdated({ interviewMode: data.interviewMode ?? null })
      if (m && hasWorkspace(m) && !task) toast.success('Mode saved. A work-sample task is being drafted from the JD — refresh in a minute.')
      else toast.success('Interview mode saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Couldn\'t save the interview mode. Please try again.')
    } finally { setSaving(false) }
  }

  // Task bank matches for this position (active = selectable; others shown as pending review).
  const [candidates, setCandidates] = useState<{ id: string; title: string; status: string; difficulty: string; score: number; reasons: string[]; selectable: boolean }[] | null>(null)
  const loadCandidates = useCallback(() => {
    fetch(`/api/positions/${position.id}/task-candidates?all=1`).then((r) => (r.ok ? r.json() : null)).then((d) => setCandidates(d?.candidates ?? [])).catch(() => setCandidates([]))
  }, [position.id])
  useEffect(() => { if (hasWorkspace(mode)) loadCandidates() }, [mode, loadCandidates])

  const post = async (body: Record<string, unknown>, okMsg: (d: { note?: string; verified?: boolean }) => string) => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/positions/${position.id}/work-sample`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Couldn\'t update the task. Please try again.')
      onUpdated({ workSampleTask: data.task })
      toast.success(okMsg(data))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Couldn\'t update the task. Please try again.')
    } finally { setGenerating(false) }
  }
  const regenerate = () => post({ source: 'auto' }, (d) => d.note ?? 'Task updated')
  const generateDraft = () => post({ source: 'generate' }, (d) => d.note ?? 'Draft generated')
  const pickBank = (taskId: string) => post({ source: 'bank', taskId }, (d) => d.note ?? 'Task selected')
  const approve = () => post({ approve: true }, () => 'Approved for live interviews')

  return (
    <Card title="Interview mode" subtitle="Technical and hybrid interviews include a hands-on task the candidate solves, runs and then defends.">
      <div style={{ opacity: saving ? 0.6 : 1, pointerEvents: saving ? 'none' : 'auto' }}>
        <InterviewModeField value={explicit} suggested={suggested} onChange={setMode} />
      </div>
      {hasWorkspace(mode) && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--lv-border)', paddingTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)' }}>Work-sample task</span>
            {task && <Badge tone={task.approved ? 'success' : 'warning'}>{task.approved ? (task.source === 'bank' ? 'From task bank · reviewed' : 'Approved') : 'Draft · not used live'}</Badge>}
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={14} />} loading={generating} onClick={regenerate}>Auto-select</Button>
              <Button variant="tertiary" size="sm" leftIcon={<Sparkles size={14} />} disabled={generating} onClick={generateDraft}>Generate draft from JD</Button>
            </span>
          </div>
          {task && !task.approved && (
            <Alert tone="warning" style={{ marginBottom: 10 }} action={<Button size="sm" leftIcon={<ShieldCheck size={14} />} disabled={generating} onClick={approve}>Approve for live use</Button>}>
              This task was generated by AI and has not been reviewed. Interviews run as Q&amp;A (no work sample) until someone who hires for this role checks the task and test cases and approves it — or pick a reviewed task from the bank below.
            </Alert>
          )}
          {!task ? (
            <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', margin: 0 }}>No task yet. Auto-select picks the best reviewed task from your task bank (or drafts one from the JD for you to approve). Without an approved task the interview runs as Q&amp;A.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--lv-text)' }}>{task.title}</div>
              <div style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>{LANGUAGE_LABEL[task.language]} starter · about {task.minutes} min · {task.tests.filter((t) => !t.hidden).length} visible + {task.tests.filter((t) => t.hidden).length} hidden tests (candidates can use any supported language)</div>
              <p style={{ fontSize: 13, color: 'var(--lv-text-body)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{task.prompt}</p>
              {task.lookFor.length > 0 && <div style={{ fontSize: 12, color: 'var(--lv-text-body)' }}><strong>Strong approach:</strong> {task.lookFor.join(' · ')}</div>}
              {task.probeAngles.length > 0 && <div style={{ fontSize: 12, color: 'var(--lv-text-body)' }}><strong>Decisions to defend:</strong> {task.probeAngles.join(' · ')}</div>}
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
          {/* Task bank matches */}
          <div style={{ marginTop: 14, borderTop: '1px solid var(--lv-border)', paddingTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--lv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}><Library size={12} aria-hidden="true" /> Task bank matches</div>
            {!candidates ? <p style={{ fontSize: 12, color: 'var(--lv-text-muted)', margin: 0 }}>Loading…</p>
              : candidates.length === 0 ? <p style={{ fontSize: 12, color: 'var(--lv-text-muted)', margin: 0 }}>No tasks in your bank yet. Add or review tasks in the Task bank section.</p>
              : (
                <div style={{ display: 'grid', gap: 6 }}>
                  {candidates.slice(0, 5).map((c) => (
                    <div key={c.id} style={{ border: '1px solid var(--lv-border)', borderRadius: 6, padding: '8px 10px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)' }}>{c.title} <span style={{ fontWeight: 400, color: 'var(--lv-text-muted)' }}>· {c.difficulty} · match {c.score}</span></div>
                        <div style={{ fontSize: 12, color: 'var(--lv-text-muted)', marginTop: 2 }}>{c.reasons.join(' · ')}</div>
                      </div>
                      {c.selectable
                        ? <Button size="sm" variant="secondary" disabled={generating || (task?.bankTaskId === c.id)} onClick={() => pickBank(c.id)}>{task?.bankTaskId === c.id ? 'In use' : 'Use this task'}</Button>
                        : <Badge tone="neutral">{c.status} · needs review</Badge>}
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      )}
    </Card>
  )
}
