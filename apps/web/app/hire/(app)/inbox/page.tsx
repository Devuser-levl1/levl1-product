'use client'
import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { DraftPositionModal } from '@/components/hire/draft-position-modal'
import { threadKey } from '@/lib/hire/mailbox/thread'

type Channel = 'email' | 'whatsapp'
interface Att { id: string; filename: string; mimeType: string; sizeBytes: number; isResume: boolean }
interface Conn { email: string; status: string; lastSyncedAt: string | null }
interface Msg { id: string; fromAddr: string; fromName: string | null; subject: string; snippet: string; receivedAt: string; isJobSpec: boolean; jobSpecConfidence: number | null; isRead: boolean; status: string; createdPositionId: string | null; channel: Channel; attachments: Att[]; attachmentCount: number }
interface ThreadMsg extends Msg { bodyText: string }
interface Thread { key: string; latest: Msg; messages: Msg[]; count: number; unread: boolean; jobSpec: boolean; jobSpecMsg: Msg | null; archived: boolean; channel: Channel }

const fmtDate = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const fmtSize = (b: number) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`)

function ChannelBadge({ channel }: { channel: Channel }) {
  if (channel === 'whatsapp') return <span style={{ fontSize: 9.5, fontWeight: 800, color: '#059669', background: 'rgba(16,185,129,0.12)', borderRadius: 100, padding: '2px 7px' }}>WhatsApp</span>
  return <span style={{ fontSize: 9.5, fontWeight: 700, color: '#64748B', background: '#F1F5F9', borderRadius: 100, padding: '2px 7px' }}>Email</span>
}

export default function InboxPage() {
  const [conn, setConn] = useState<Conn | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [tab, setTab] = useState<'inbox' | 'jobspec' | 'archived'>('inbox')
  const [selKey, setSelKey] = useState<string | null>(null)
  const [thread, setThread] = useState<ThreadMsg[] | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [note, setNote] = useState('')
  const [draftFor, setDraftFor] = useState<string | null>(null)
  const [newCount, setNewCount] = useState(0)
  const knownIds = useRef<Set<string>>(new Set())

  const loadConn = useCallback(() => { fetch('/api/hire/mailbox').then((r) => (r.ok ? r.json() : null)).then((d) => { setConn(d?.connection ?? null); setLoaded(true) }).catch(() => setLoaded(true)) }, [])
  const loadMsgs = useCallback(async (markKnown = true) => {
    const d = await fetch('/api/hire/mailbox/messages').then((r) => (r.ok ? r.json() : null)).catch(() => null)
    const list: Msg[] = d?.messages ?? []
    if (markKnown) knownIds.current = new Set(list.map((m) => m.id))
    setMsgs(list)
    return list
  }, [])
  useEffect(() => { loadConn(); loadMsgs() }, [loadConn, loadMsgs])

  // ── Auto-refresh: poll every 45s and on window focus. Uses the existing
  //    lastSeenUid cursor server-side (only new mail is pulled). New arrivals
  //    since what the user has seen surface as a subtle indicator. ──
  const silentSync = useCallback(async () => {
    try {
      await fetch('/api/hire/mailbox/sync', { method: 'POST' }).catch(() => {})
      const list = await loadMsgs(false)
      const fresh = list.filter((m) => !knownIds.current.has(m.id))
      if (fresh.length) setNewCount((n) => n + fresh.length)
    } catch { /* ignore */ }
  }, [loadMsgs])

  useEffect(() => {
    if (!conn || conn.status !== 'connected') return
    const id = setInterval(silentSync, 45000)
    const onFocus = () => silentSync()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(id); window.removeEventListener('focus', onFocus) }
  }, [conn, silentSync])

  const showNew = () => { knownIds.current = new Set(msgs.map((m) => m.id)); setNewCount(0) }

  // Group flat messages into conversation threads (normalized subject + sender).
  const threads = useMemo<Thread[]>(() => {
    const map = new Map<string, Msg[]>()
    for (const m of msgs) { const k = `${m.channel}:${threadKey(m.subject, m.fromAddr)}`; if (!map.has(k)) map.set(k, []); map.get(k)!.push(m) }
    const out: Thread[] = []
    map.forEach((list, key) => {
      const sorted = [...list].sort((a, b) => +new Date(a.receivedAt) - +new Date(b.receivedAt))
      const latest = sorted[sorted.length - 1]
      const jobSpecMsg = sorted.find((m) => m.isJobSpec && m.status !== 'drafted') ?? sorted.find((m) => m.isJobSpec) ?? null
      out.push({ key, latest, messages: sorted, count: sorted.length, unread: sorted.some((m) => !m.isRead && m.status !== 'archived'), jobSpec: sorted.some((m) => m.isJobSpec), jobSpecMsg, archived: sorted.every((m) => m.status === 'archived'), channel: latest.channel })
    })
    return out
  }, [msgs])

  const view = useMemo(() => {
    let out = threads
    if (tab === 'archived') out = threads.filter((t) => t.archived)
    else if (tab === 'jobspec') out = threads.filter((t) => t.jobSpec && !t.archived)
    else out = threads.filter((t) => !t.archived)
    return out.sort((a, b) => (tab === 'jobspec' ? (b.jobSpecMsg?.jobSpecConfidence ?? 0) - (a.jobSpecMsg?.jobSpecConfidence ?? 0) : +new Date(b.latest.receivedAt) - +new Date(a.latest.receivedAt)))
  }, [threads, tab])

  const unreadCount = useMemo(() => threads.filter((t) => t.unread).length, [threads])
  const selectedThread = useMemo(() => threads.find((t) => t.key === selKey) ?? null, [threads, selKey])

  const openThread = useCallback(async (t: Thread) => {
    setSelKey(t.key); setThread(null)
    const d = await fetch(`/api/hire/mailbox/messages/${t.latest.id}/thread`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    setThread(d?.messages ?? [])
    const unread = t.messages.filter((m) => !m.isRead)
    if (unread.length) {
      await Promise.all(unread.map((m) => fetch(`/api/hire/mailbox/messages/${m.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isRead: true }) }).catch(() => {})))
      setMsgs((prev) => prev.map((x) => (unread.some((u) => u.id === x.id) ? { ...x, isRead: true } : x)))
    }
  }, [])

  async function refresh() {
    setSyncing(true); setNote('')
    const res = await fetch('/api/hire/mailbox/sync', { method: 'POST' })
    const d = await res.json().catch(() => ({}))
    setSyncing(false); setNote(res.ok ? `Synced — ${d.newCount ?? 0} new.` : (d.error ?? 'Sync failed')); loadConn(); loadMsgs(); setNewCount(0)
  }
  async function archiveThread(t: Thread) {
    await Promise.all(t.messages.map((m) => fetch(`/api/hire/mailbox/messages/${m.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'archived' }) }).catch(() => {})))
    setMsgs((prev) => prev.map((x) => (t.messages.some((m) => m.id === x.id) ? { ...x, status: 'archived' } : x)))
    setSelKey(null); setThread(null)
  }

  if (!loaded) return <div style={{ color: '#475569' }}>Loading…</div>
  if (!conn || conn.status !== 'connected') return (
    <div style={{ maxWidth: 520, padding: '32px 0' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>Inbox</h1>
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>No mailbox connected</div>
        <div style={{ fontSize: 13.5, color: '#64748B', marginTop: 6, lineHeight: 1.6 }}>Connect your business mailbox to pull inbound mail, reply from your own address, and turn job-spec emails into positions.</div>
        <a href="/hire/settings/mailbox" style={{ display: 'inline-block', marginTop: 16, padding: '9px 16px', borderRadius: 9, background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Connect a mailbox →</a>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth: 1180 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Inbox</h1>
        <span style={{ fontSize: 13, color: '#64748B' }}>{conn.email}{unreadCount > 0 ? ` · ${unreadCount} unread` : ''}</span>
        {newCount > 0 && (
          <button onClick={showNew} style={{ fontSize: 12, fontWeight: 700, color: '#6D28D9', background: 'rgba(109,40,217,0.10)', border: '1px solid rgba(109,40,217,0.25)', borderRadius: 100, padding: '3px 11px', cursor: 'pointer' }}>
            ● {newCount} new message{newCount !== 1 ? 's' : ''}
          </button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {note && <span style={{ fontSize: 12, color: '#94A3B8' }}>{note}</span>}
          <button onClick={refresh} disabled={syncing} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{syncing ? 'Syncing…' : '↻ Refresh'}</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #E2E8F0', marginBottom: 14 }}>
        {([['inbox', 'Inbox'], ['jobspec', 'Job specs'], ['archived', 'Archived']] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} style={{ padding: '9px 14px', fontSize: 13.5, fontWeight: 600, background: 'none', border: 'none', borderBottom: '2px solid ' + (tab === k ? '#6D28D9' : 'transparent'), color: tab === k ? '#6D28D9' : '#64748B', cursor: 'pointer' }}>{l}</button>)}
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Thread list */}
        <div style={{ width: 420, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {view.length === 0 && <div style={{ fontSize: 13, color: '#94A3B8', padding: '20px 0' }}>No {tab === 'archived' ? 'archived' : tab === 'jobspec' ? 'job-spec' : ''} conversations. Hit Refresh to pull your inbox.</div>}
          {view.map((t) => (
            <div key={t.key} onClick={() => openThread(t)} style={{ cursor: 'pointer', background: selKey === t.key ? '#F5F3FF' : '#fff', border: `1px solid ${selKey === t.key ? '#DDD6FE' : '#E2E8F0'}`, borderRadius: 10, padding: '11px 13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {t.unread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: t.channel === 'whatsapp' ? '#10B981' : '#6D28D9', flexShrink: 0 }} />}
                <span style={{ fontSize: 13, fontWeight: t.unread ? 800 : 600, color: '#0F172A', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.latest.fromName || t.latest.fromAddr}</span>
                <ChannelBadge channel={t.channel} />
                {t.count > 1 && <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', background: '#F1F5F9', borderRadius: 100, padding: '1px 7px' }}>{t.count}</span>}
                <span style={{ fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>{new Date(t.latest.receivedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: t.unread ? 700 : 500, color: '#334155', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.latest.subject}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                {t.jobSpec && <span style={{ fontSize: 9.5, fontWeight: 800, color: '#6D28D9', background: 'rgba(109,40,217,0.10)', borderRadius: 100, padding: '2px 7px' }}>📋 Job spec{t.jobSpecMsg?.jobSpecConfidence != null ? ` ${t.jobSpecMsg.jobSpecConfidence}%` : ''}</span>}
                {t.messages.some((m) => m.attachmentCount > 0) && <span style={{ fontSize: 9.5, fontWeight: 700, color: '#475569' }}>📎 {t.messages.reduce((s, m) => s + m.attachmentCount, 0)}</span>}
                {t.messages.some((m) => m.status === 'drafted') && <span style={{ fontSize: 9.5, fontWeight: 700, color: '#059669' }}>✓ handled</span>}
                <span style={{ fontSize: 11.5, color: '#94A3B8', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.latest.snippet}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Thread reader */}
        <div style={{ flex: 1, minWidth: 0, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, minHeight: 360 }}>
          {!selKey || !selectedThread ? <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13.5 }}>Select a conversation to read the full trail.</div>
            : !thread ? <div style={{ padding: 40, color: '#94A3B8' }}>Loading…</div>
              : <ThreadReader thread={thread} channel={selectedThread.channel} subject={selectedThread.latest.subject} jobSpecMsgId={selectedThread.jobSpecMsg && selectedThread.jobSpecMsg.status !== 'drafted' ? selectedThread.jobSpecMsg.id : null} replyToId={selectedThread.latest.id} onArchive={() => archiveThread(selectedThread)} onDraft={(id) => setDraftFor(id)} onReplied={() => loadMsgs()} onAdded={() => loadMsgs()} />}
        </div>
      </div>

      {draftFor && <DraftPositionModal messageId={draftFor} onClose={() => setDraftFor(null)} onDone={() => { setDraftFor(null); loadMsgs() }} />}
    </div>
  )
}

function ThreadReader({ thread, channel, subject, jobSpecMsgId, replyToId, onArchive, onDraft, onReplied, onAdded }: { thread: ThreadMsg[]; channel: Channel; subject: string; jobSpecMsgId: string | null; replyToId: string; onArchive: () => void; onDraft: (id: string) => void; onReplied: () => void; onAdded: () => void }) {
  const [reply, setReply] = useState('')
  const [showReply, setShowReply] = useState(false)
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState('')
  const [addFor, setAddFor] = useState<{ msgId: string; att: Att } | null>(null)
  const createdJob = thread.find((m) => m.createdPositionId)?.createdPositionId ?? null
  const isWa = channel === 'whatsapp'

  async function send() {
    if (!reply.trim()) return
    setSending(true); setMsg('')
    const url = isWa ? `/api/hire/whatsapp/${replyToId}/reply` : `/api/hire/mailbox/messages/${replyToId}/reply`
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: reply }) })
    setSending(false)
    if (res.ok) { setReply(''); setShowReply(false); setMsg('✓ Reply sent'); onReplied() } else setMsg((await res.json().catch(() => ({}))).error ?? 'Failed to send')
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: 0, flex: 1 }}>{subject}</h2>
        <ChannelBadge channel={channel} />
        <span style={{ fontSize: 11.5, color: '#94A3B8', whiteSpace: 'nowrap' }}>{thread.length} message{thread.length > 1 ? 's' : ''}</span>
        {!isWa && <button onClick={onArchive} title="Archive conversation" style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap' }}>Archive</button>}
      </div>

      {jobSpecMsgId && <button onClick={() => onDraft(jobSpecMsgId)} style={{ marginTop: 14, padding: '9px 16px', borderRadius: 9, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>✨ Create position from this email</button>}
      {createdJob && <a href={`/hire/jobs/${createdJob}`} style={{ display: 'inline-block', marginTop: 14, marginLeft: jobSpecMsgId ? 10 : 0, fontSize: 13, color: '#6D28D9', fontWeight: 700, textDecoration: 'none' }}>Open created job →</a>}

      {/* The trail, oldest → newest */}
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {thread.map((m, i) => (
          <div key={m.id} style={{ border: '1px solid #F1F5F9', borderRadius: 10, padding: '12px 14px', background: i === thread.length - 1 ? '#fff' : '#FCFCFE' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }}>{m.fromName || m.fromAddr}</span>
              {m.isJobSpec && <span style={{ fontSize: 9.5, fontWeight: 800, color: '#6D28D9', background: 'rgba(109,40,217,0.10)', borderRadius: 100, padding: '2px 7px' }}>📋 Job spec{m.jobSpecConfidence != null ? ` ${m.jobSpecConfidence}%` : ''}</span>}
              <span style={{ marginLeft: 'auto', fontSize: 11.5, color: '#94A3B8' }}>{fmtDate(m.receivedAt)}</span>
            </div>
            <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 1 }}>{m.fromAddr}</div>
            <div style={{ marginTop: 8, fontSize: 13.5, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.bodyText || '(no text content)'}</div>

            {/* Attachments */}
            {m.attachments && m.attachments.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {m.attachments.map((a) => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #E2E8F0', borderRadius: 8, padding: '7px 10px', background: '#F8FAFC' }}>
                    <span style={{ fontSize: 14 }}>{a.isResume ? '📄' : '📎'}</span>
                    <a href={`/api/hire/mailbox/messages/${m.id}/attachments/${a.id}`} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', textDecoration: 'none', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.filename}>{a.filename}</a>
                    <span style={{ fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>{fmtSize(a.sizeBytes)}</span>
                    {a.isResume && <button onClick={() => setAddFor({ msgId: m.id, att: a })} style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: '#6D28D9', border: 'none', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Add to job</button>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
        {!showReply ? (
          <button onClick={() => setShowReply(true)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #6D28D9', background: '#fff', color: '#6D28D9', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>↩ Reply{isWa ? ' on WhatsApp' : ''}</button>
        ) : (
          <div>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>Replying to {thread[thread.length - 1].fromAddr} {isWa ? 'on WhatsApp' : 'from your mailbox'}</div>
            <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder={isWa ? 'Write your WhatsApp reply…' : 'Write your reply…'} style={{ width: '100%', boxSizing: 'border-box', minHeight: 120, padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.6 }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={send} disabled={sending || !reply.trim()} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: sending || !reply.trim() ? '#C4B5FD' : '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13, cursor: sending || !reply.trim() ? 'default' : 'pointer' }}>{sending ? 'Sending…' : 'Send reply'}</button>
              <button onClick={() => { setShowReply(false); setReply('') }} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}
        {msg && <div style={{ fontSize: 12.5, color: msg.startsWith('✓') ? '#059669' : '#DC2626', marginTop: 8 }}>{msg}</div>}
      </div>

      {addFor && <AddToJobModal msgId={addFor.msgId} att={addFor.att} onClose={() => setAddFor(null)} onDone={() => { setAddFor(null); onAdded() }} />}
    </div>
  )
}

function AddToJobModal({ msgId, att, onClose, onDone }: { msgId: string; att: Att; onClose: () => void; onDone: () => void }) {
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([])
  const [jobId, setJobId] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => { fetch('/api/hire/jobs').then((r) => (r.ok ? r.json() : [])).then((d) => Array.isArray(d) && setJobs(d.map((j: { id: string; title: string }) => ({ id: j.id, title: j.title })))).catch(() => {}) }, [])

  async function add() {
    setBusy(true); setErr('')
    const res = await fetch(`/api/hire/mailbox/messages/${msgId}/attachments/${att.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(jobId ? { jobId } : {}) })
    const d = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setErr(d.error ?? 'Could not add résumé.'); return }
    setResult(d.summary ?? 'Added.')
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: 460, maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#0F172A' }}>Add résumé to a job</div>
          <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 3 }}>{att.filename} — parsed, scored and added as a candidate.</div>
        </div>
        {result ? (
          <>
            <div style={{ fontSize: 13.5, color: '#059669', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, padding: 12 }}>✓ {result}</div>
            <button onClick={onDone} style={{ padding: 10, borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Done</button>
          </>
        ) : (
          <>
            <div>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>Job</label>
              <select value={jobId} onChange={(e) => setJobId(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff' }}>
                <option value="">Talent pool (no job — no scoring)</option>
                {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
            </div>
            {err && <div style={{ fontSize: 13, color: '#DC2626' }}>{err}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={add} disabled={busy} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, cursor: busy ? 'default' : 'pointer' }}>{busy ? 'Parsing…' : jobId ? 'Add & score' : 'Add to pool'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
