'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Play, ListChecks, CheckCircle2, XCircle, EyeOff, Clock, Send } from 'lucide-react'
import { Button, Badge, Alert, useConfirm } from '@/components/screen/ui'
import { LANGUAGE_LABEL, type PublicTask, type WorkspaceLanguage } from '@/lib/screen/workspace/task'
import type { TimelineEvent } from '@/lib/screen/workspace/timeline'

// ── Solve workspace (candidate, async) ─────────────────────────────────────
// The same editor + execution model as the Screen room's work sample: Monaco,
// Judge0 run / tests via the server (hidden tests: pass/fail only), the
// Observe & Defend work timeline, continuous serialized autosave with a local
// mirror and retry after a network drop. Async-specific: a deadline clock that
// auto-submits, and tab-away counters (integrity, reviewed by a person).

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--lv-text-muted)', fontSize: 13 }}>Loading editor…</div>,
})

interface RunOutput { status: string; statusText: string; stdout: string; stderr: string; compileOutput: string; timeSec: number | null }
interface TestResults { passed: number; total: number; results: { id: string; name: string; hidden: boolean; passed: boolean; status: string; actual?: string; expected?: string; input?: string; stderr?: string }[] }

export interface SolveWorkspaceProps {
  token: string
  task: PublicTask
  saved: { code: string; language: string; savedAt: string } | null
  resumeMs: number
  deadlineAt: string | null
  executionAvailable: boolean
  executionsLeft: number
  onSubmitted: (view: unknown) => void
}

const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(s / 3600)
  return h ? `${h}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
const meaningful = (s: string) => s.replace(/\s+/g, '')

export function SolveWorkspace({ token, task, saved, resumeMs, deadlineAt, executionAvailable, executionsLeft: initialLeft, onSubmitted }: SolveWorkspaceProps) {
  const localKey = `lv_solve_${token.slice(0, 16)}`
  const [language, setLanguage] = useState<WorkspaceLanguage>(() => (saved?.language && task.languages.includes(saved.language as WorkspaceLanguage) ? saved.language as WorkspaceLanguage : task.language))
  const [code, setCode] = useState<string>(() => {
    let c = saved?.code || task.starterCode
    try {
      const local = JSON.parse(localStorage.getItem(localKey) ?? 'null') as { code?: string; savedAt?: number } | null
      const serverAt = saved?.savedAt ? Date.parse(saved.savedAt) : 0
      if (local?.code && (local.savedAt ?? 0) > serverAt) c = local.code
    } catch { /* storage blocked */ }
    return c
  })
  const [tab, setTab] = useState<'task' | 'tests' | 'output'>('task')
  const [runBusy, setRunBusy] = useState<'run' | 'tests' | null>(null)
  const [runOutput, setRunOutput] = useState<RunOutput | null>(null)
  const [testResults, setTestResults] = useState<TestResults | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [left, setLeft] = useState(initialLeft)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'offline'>('saved')
  const [submitting, setSubmitting] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [confirm, confirmEl] = useConfirm()

  // Timeline + autosave refs (same model as the room).
  const startRef = useRef<number>(Date.now() - resumeMs)
  const pendingRef = useRef<TimelineEvent[]>([])
  const editWinRef = useRef<{ start: number; n: number; d: number } | null>(null)
  const lastSnapRef = useRef<{ t: number; len: number }>({ t: 0, len: code.length })
  const codeRef = useRef(code); const langRef = useRef(language)
  const dirtyRef = useRef(false); const inflightRef = useRef(false)
  const countersRef = useRef({ tabSwitches: 0, awayMs: 0, awaySince: 0 })
  const submittedRef = useRef(false)
  const editorRef = useRef<{ getValue: () => string } | null>(null)

  const t = () => Date.now() - startRef.current
  const push = (e: TimelineEvent) => { pendingRef.current.push(e) }
  const flushEdit = () => { const w = editWinRef.current; if (w && (w.n || w.d)) push({ t: w.start, k: 'edit', n: w.n, d: w.d }); editWinRef.current = null }
  const snapshot = (force = false) => {
    const c = codeRef.current; const at = t(); const last = lastSnapRef.current
    if (force || Math.abs(c.length - last.len) > 80 || (at - last.t > 45_000 && c.length !== last.len)) { push({ t: at, k: 'snapshot', code: c.slice(0, 12_000) }); lastSnapRef.current = { t: at, len: c.length } }
  }

  useEffect(() => { push({ t: t(), k: 'open', lang: langRef.current }) // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = useCallback(async (force = false) => {
    if (inflightRef.current || submittedRef.current) return
    const w = editWinRef.current
    if (w && t() - w.start > 4000) flushEdit()
    snapshot()
    const events = pendingRef.current.splice(0)
    if (!dirtyRef.current && !events.length && !force) return
    try { localStorage.setItem(localKey, JSON.stringify({ code: codeRef.current, savedAt: Date.now() })) } catch { /* ignore */ }
    inflightRef.current = true; dirtyRef.current = false; setSaveState('saving')
    try {
      const c = countersRef.current
      const r = await fetch(`/api/solve/t/${token}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', code: codeRef.current, language: langRef.current, events, counters: { tabSwitches: c.tabSwitches, awayMs: c.awayMs } }),
      })
      if (!r.ok && r.status !== 409) throw new Error(String(r.status))
      setSaveState('saved')
    } catch {
      pendingRef.current.unshift(...events); dirtyRef.current = true; setSaveState('offline')
    } finally { inflightRef.current = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, localKey])

  useEffect(() => {
    const iv = setInterval(() => { void save() }, 5000)
    const onVis = () => {
      const c = countersRef.current
      if (document.visibilityState === 'hidden') { c.tabSwitches += 1; c.awaySince = Date.now(); void save(true) }
      else if (c.awaySince) { c.awayMs += Date.now() - c.awaySince; c.awaySince = 0 }
    }
    const onOnline = () => { void save(true) }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('online', onOnline)
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('online', onOnline) }
  }, [save])

  const onChange = (v: string | undefined) => {
    const next = v ?? ''
    const delta = next.length - codeRef.current.length
    const w = editWinRef.current ?? (editWinRef.current = { start: t(), n: 0, d: 0 })
    if (delta >= 0) w.n += delta; else w.d += -delta
    codeRef.current = next; setCode(next); dirtyRef.current = true
    snapshot()
  }

  const onMount = useCallback((editor: unknown) => {
    const ed = editor as { onDidPaste: (cb: (e: { range: unknown }) => void) => void; getModel: () => { getValueInRange: (r: unknown) => string } | null; getValue: () => string }
    editorRef.current = ed
    try {
      // Paste SIZE only — the clipboard text is never sent anywhere.
      ed.onDidPaste((e) => { const size = ed.getModel()?.getValueInRange(e.range).length ?? 0; push({ t: t(), k: 'paste', n: size }) })
    } catch { /* editor API shape differs — non-critical */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const run = async (kind: 'run' | 'tests') => {
    if (runBusy) return
    setRunBusy(kind); setNote(null); flushEdit(); snapshot(true)
    const at = t()
    try {
      const r = await fetch(`/api/solve/t/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'run', kind, code: codeRef.current, language: langRef.current }) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setNote(d.message ?? 'Couldn\'t run your code. Please try again.'); push({ t: at, k: kind, ok: false }); return }
      if (kind === 'run') { setRunOutput(d as RunOutput); setTab('output'); push({ t: at, k: 'run', ok: d.status === 'ok' }) }
      else { setTestResults(d as TestResults); setTab('tests'); push({ t: at, k: 'tests', ok: true, passed: d.passed, total: d.total }) }
      if (typeof d.executionsLeft === 'number') setLeft(d.executionsLeft)
    } catch { setNote('Couldn\'t reach the code runner. Check your connection and try again.') } finally { setRunBusy(null) }
  }

  const doSubmit = useCallback(async (auto: boolean) => {
    if (submittedRef.current) return
    submittedRef.current = true; setSubmitting(true)
    flushEdit(); snapshot(true); push({ t: t(), k: 'submit' })
    const events = pendingRef.current.splice(0)
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const r = await fetch(`/api/solve/t/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'submit', code: codeRef.current, language: langRef.current, events, auto }) })
        if (r.ok) { try { localStorage.removeItem(localKey) } catch { /* ignore */ } onSubmitted(await r.json()); return }
      } catch { /* retry */ }
      await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)))
    }
    submittedRef.current = false; setSubmitting(false)
    setNote('We couldn\'t submit just now. Your work is saved. Check your connection and press Submit again.')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, localKey, onSubmitted])

  // Deadline clock → auto-submit at zero (the server also enforces it).
  const deadline = deadlineAt ? Date.parse(deadlineAt) : null
  const remaining = deadline ? deadline - now : null
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv) }, [])
  useEffect(() => { if (remaining !== null && remaining <= 0 && !submittedRef.current) void doSubmit(true) }, [remaining, doSubmit])

  const submit = async () => {
    const unchanged = meaningful(codeRef.current) === meaningful(task.starterCode) || !meaningful(codeRef.current)
    const ok = await confirm(unchanged
      ? { title: 'Submit without changes?', description: 'Your code looks the same as the starter code. A submission with no real work can\'t be evaluated. Submit anyway?', confirmLabel: 'Submit anyway', destructive: true }
      : { title: 'Submit your solution?', description: 'You can\'t edit it after submitting. All tests, including hidden ones, run on the code you submit.', confirmLabel: 'Submit' })
    if (ok) void doSubmit(false)
  }

  const lowTime = remaining !== null && remaining < 5 * 60_000
  return (
    <div className="solve-ws" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--lv-bg)' }}>
      {confirmEl}
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--lv-border)', background: 'var(--lv-surface)', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--lv-text)', minWidth: 0, flex: '1 1 200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
        <span role="status" aria-live="polite" style={{ fontSize: 12, color: saveState === 'offline' ? 'var(--lv-warning)' : 'var(--lv-text-muted)' }}>
          {saveState === 'saving' ? 'Saving…' : saveState === 'offline' ? 'Offline — will save when you reconnect' : 'All changes saved'}
        </span>
        {remaining !== null && (
          <span aria-label="Time remaining" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--lv-font-mono)', fontSize: 14, fontWeight: 600, color: lowTime ? 'var(--lv-danger)' : 'var(--lv-text)' }}>
            <Clock size={14} aria-hidden="true" />{mmss(remaining)}
          </span>
        )}
        <Button size="sm" leftIcon={<Send size={14} />} loading={submitting} onClick={submit}>Submit</Button>
      </header>
      {note && <div style={{ padding: '8px 16px 0' }}><Alert tone="warning">{note}</Alert></div>}
      <div className="solve-cols" style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <section aria-label="Task" className="solve-left" style={{ width: '40%', minWidth: 280, borderRight: '1px solid var(--lv-border)', display: 'flex', flexDirection: 'column', background: 'var(--lv-surface)' }}>
          <div role="tablist" aria-label="Task panels" style={{ display: 'flex', gap: 4, padding: '8px 12px', borderBottom: '1px solid var(--lv-border)' }}>
            {(['task', 'tests', 'output'] as const).map((k) => (
              <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} className={`lv-btn lv-btn--sm ${tab === k ? 'lv-btn--secondary' : 'lv-btn--ghost'}`}>
                {k === 'task' ? 'Task' : k === 'tests' ? `Tests${testResults ? ` ${testResults.passed}/${testResults.total}` : ''}` : 'Output'}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
            {tab === 'task' && (
              <div style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--lv-text-body)' }}>
                <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{task.prompt}</p>
                <div style={{ marginTop: 14, fontSize: 12, color: 'var(--lv-text-muted)' }}>
                  Programs read from standard input and print to standard output. {task.tests.length} example test{task.tests.length === 1 ? '' : 's'} visible{task.hiddenCount ? `, ${task.hiddenCount} hidden` : ''}. Hidden tests run when you submit.
                </div>
                {task.tests.map((x) => (
                  <div key={x.id} style={{ marginTop: 10, border: '1px solid var(--lv-border)', borderRadius: 6, padding: '8px 10px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-text)' }}>{x.name}</div>
                    <pre style={{ margin: '4px 0 0', fontFamily: 'var(--lv-font-mono)', fontSize: 12, whiteSpace: 'pre-wrap', color: 'var(--lv-text-body)' }}>{`Input:\n${x.input || '(empty)'}\n\nExpected output:\n${x.expected}`}</pre>
                  </div>
                ))}
              </div>
            )}
            {tab === 'tests' && (!testResults ? <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', margin: 0 }}>Run the tests to see results here.</p> : (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)' }}>{testResults.passed} of {testResults.total} passing</div>
                {testResults.results.map((r) => (
                  <div key={r.id} style={{ border: '1px solid var(--lv-border)', borderRadius: 6, padding: '8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--lv-text)' }}>
                      {r.passed ? <CheckCircle2 size={14} color="var(--lv-success)" aria-hidden="true" /> : <XCircle size={14} color="var(--lv-danger)" aria-hidden="true" />}
                      {r.name}{r.hidden && <><EyeOff size={12} aria-hidden="true" /><span style={{ fontWeight: 400, color: 'var(--lv-text-muted)' }}>hidden</span></>}
                      <span className="lv-sr-only">{r.passed ? 'passed' : 'failed'}</span>
                    </div>
                    {!r.hidden && !r.passed && (
                      <pre style={{ margin: '6px 0 0', fontFamily: 'var(--lv-font-mono)', fontSize: 12, whiteSpace: 'pre-wrap', color: 'var(--lv-text-body)' }}>{`Expected:\n${r.expected ?? ''}\n\nGot:\n${r.actual ?? ''}${r.stderr ? `\n\n${r.stderr}` : ''}`}</pre>
                    )}
                  </div>
                ))}
              </div>
            ))}
            {tab === 'output' && (!runOutput ? <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', margin: 0 }}>Run your code to see its output. It runs with the first example&apos;s input.</p> : (
              <div style={{ display: 'grid', gap: 8 }}>
                <Badge tone={runOutput.status === 'ok' ? 'success' : 'danger'}>{runOutput.statusText}{runOutput.timeSec != null ? ` · ${runOutput.timeSec}s` : ''}</Badge>
                <pre style={{ margin: 0, fontFamily: 'var(--lv-font-mono)', fontSize: 12, whiteSpace: 'pre-wrap', color: 'var(--lv-text-body)', background: 'var(--lv-surface-muted)', padding: 10, borderRadius: 6 }}>{runOutput.compileOutput || runOutput.stderr || runOutput.stdout || '(no output)'}</pre>
              </div>
            ))}
          </div>
        </section>
        <section aria-label="Code editor" className="solve-editor" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--lv-border)', background: 'var(--lv-surface)', flexWrap: 'wrap' }}>
            <label htmlFor="solve-lang" className="lv-sr-only">Language</label>
            <select id="solve-lang" className="lv-select" value={language} style={{ width: 'auto', height: 32, fontSize: 13 }}
              onChange={(e) => { const l = e.target.value as WorkspaceLanguage; setLanguage(l); langRef.current = l; push({ t: t(), k: 'lang', lang: l }); dirtyRef.current = true }}>
              {task.languages.map((l) => <option key={l} value={l}>{LANGUAGE_LABEL[l]}</option>)}
            </select>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
              {executionAvailable && <span style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>{left} runs left</span>}
              <Button size="sm" variant="secondary" leftIcon={<Play size={14} />} loading={runBusy === 'run'} disabled={!executionAvailable || !!runBusy} onClick={() => run('run')}>Run</Button>
              <Button size="sm" variant="secondary" leftIcon={<ListChecks size={14} />} loading={runBusy === 'tests'} disabled={!executionAvailable || !!runBusy} onClick={() => run('tests')}>Run tests</Button>
            </span>
          </div>
          {!executionAvailable && <div style={{ padding: '8px 12px' }}><Alert tone="info">Running code isn&apos;t available right now. Write your solution and submit; it will be tested when execution is back.</Alert></div>}
          <div style={{ flex: 1, minHeight: 320 }}>
            <MonacoEditor height="100%" language={language} value={code} onChange={onChange} onMount={onMount}
              options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, automaticLayout: true, tabSize: 4 }} />
          </div>
        </section>
      </div>
      <style>{`
        @media (max-width: 860px) {
          .solve-ws { height: auto !important; min-height: 100vh; }
          .solve-cols { flex-direction: column !important; }
          .solve-left { width: 100% !important; max-height: 50vh; border-right: none !important; border-bottom: 1px solid var(--lv-border); }
          .solve-editor { height: 70vh; }
        }
      `}</style>
    </div>
  )
}
