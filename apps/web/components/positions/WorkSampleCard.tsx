'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { EyeOff, RefreshCw } from 'lucide-react'
import { Card, Button } from '@/components/screen/ui'
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

  const regenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/positions/${position.id}/work-sample`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Couldn\'t generate a task. Please try again.')
      onUpdated({ workSampleTask: data.task })
      toast.success(data.verified ? 'New task ready — tests verified' : `New task ready. ${data.note}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Couldn\'t generate a task. Please try again.')
    } finally { setGenerating(false) }
  }

  return (
    <Card title="Interview mode" subtitle="Technical and hybrid interviews include a hands-on task the candidate solves, runs and then defends.">
      <div style={{ opacity: saving ? 0.6 : 1, pointerEvents: saving ? 'none' : 'auto' }}>
        <InterviewModeField value={explicit} suggested={suggested} onChange={setMode} />
      </div>
      {hasWorkspace(mode) && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--lv-border)', paddingTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)' }}>Work-sample task</span>
            <span style={{ marginLeft: 'auto' }}>
              <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={14} />} loading={generating} onClick={regenerate}>{task ? 'Regenerate' : 'Generate from JD'}</Button>
            </span>
          </div>
          {!task ? (
            <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', margin: 0 }}>No task yet. Generate one from the job description; without a task the interview runs as Q&amp;A with a plain editor.</p>
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
        </div>
      )}
    </Card>
  )
}
