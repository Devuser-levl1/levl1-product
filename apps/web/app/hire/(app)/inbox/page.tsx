'use client'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { DraftPositionModal } from '@/components/hire/draft-position-modal'
import { threadKey } from '@/lib/hire/mailbox/thread'

interface Conn { email: string; status: string; lastSyncedAt: string | null }
interface Msg { id: string; fromAddr: string; fromName: string | null; subject: string; snippet: string; receivedAt: string; isJobSpec: boolean; jobSpecConfidence: number | null; isRead: boolean; status: string; createdPositionId: string | null }
interface ThreadMsg extends Msg { bodyText: string }
interface Thread { key: string; latest: Msg; messages: Msg[]; count: number; unread: boolean; jobSpec: boolean; jobSpecMsg: Msg | null; archived: boolean }

const fmtDate = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

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

  const loadConn = useCallback(() => { fetch('/api/hire/mailbox').then((r) => (r.ok ? r.json() : null)).then((d) => { setConn(d?.connection ?? null); setLoaded(true) }).catch(() => setLoaded(true)) }, [])
  const loadMsgs = useCallback(() => { fetch('/api/hire/mailbox/messages').then((r) => (r.ok ? r.json() : null)).then((d) => setMsgs(d?.messages ?? [])).catch(() => {}) }, [])
  useEffect(() => { loadConn(); loadMsgs() }, [loadConn, loadMsgs])

  // Group flat messages into conversation threads (normalized subject + sender).
  const threads = useMemo<Thread[]>(() => {
    const map = new Map<string, Msg[]>()
    for (const m of msgs) { const k = threadKey(m.subject, m.fromAddr); if (!map.has(k)) map.set(k, []); map.get(k)!.push(m) }
    const out: Thread[] = []
    map.forEach((list, key) => {
      const sorted = [...list].sort((a, b) => +new Date(a.receivedAt) - +new Date(b.receivedAt))
      const latest = sorted[sorted.length - 1]
      const jobSpecMsg = sorted.find((m) => m.isJobSpec && m.status !== 'drafted') ?? sorted.find((m) => m.isJobSpec) ?? null
      out.push({ key, latest, messages: sorted, count: sorted.length, unread: sorted.some((m) => !m.isRead && m.status !== 'archived'), jobSpec: sorted.some((m) => m.isJobSpec), jobSpecMsg, archived: sorted.every((m) => m.status === 'archived') })
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
    setSyncing(false); setNote(res.ok ? `Synced — ${d.newCount ?? 0} new.` : (d.error ?? 'Sync failed')); loadConn(); loadMsgs()
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
                {t.unread && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6D28D9', flexShrink: 0 }} />}
                <span style={{ fontSize: 13, fontWeight: t.unread ? 800 : 600, color: '#0F172A', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.latest.fromName || t.latest.fromAddr}</span>
                {t.count > 1 && <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', background: '#F1F5F9', borderRadius: 100, padding: '1px 7px' }}>{t.count}</span>}
                <span style={{ fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>{new Date(t.latest.receivedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: t.unread ? 700 : 500, color: '#334155', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.latest.subject}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                {t.jobSpec && <span style={{ fontSize: 9.5, fontWeight: 800, color: '#6D28D9', background: 'rgba(109,40,217,0.10)', borderRadius: 100, padding: '2px 7px' }}>📋 Job spec{t.jobSpecMsg?.jobSpecConfidence != null ? ` ${t.jobSpecMsg.jobSpecConfidence}%` : ''}</span>}
                {t.messages.some((m) => m.status === 'drafted') && <span style={{ fontSize: 9.5, fontWeight: 700, color: '#059669' }}>✓ position created</span>}
                <span style={{ fontSize: 11.5, color: '#94A3B8', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.latest.snippet}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Thread reader */}
        <div style={{ flex: 1, minWidth: 0, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, minHeight: 360 }}>
          {!selKey || !selectedThread ? <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13.5 }}>Select a conversation to read the full trail.</div>
            : !thread ? <div style={{ padding: 40, color: '#94A3B8' }}>Loading…</div>
              : <ThreadReader thread={thread} subject={selectedThread.latest.subject} jobSpecMsgId={selectedThread.jobSpecMsg && selectedThread.jobSpecMsg.status !== 'drafted' ? selectedThread.jobSpecMsg.id : null} replyToId={selectedThread.latest.id} onArchive={() => archiveThread(selectedThread)} onDraft={(id) => setDraftFor(id)} onReplied={loadMsgs} />}
        </div>
      </div>

      {draftFor && <DraftPositionModal messageId={draftFor} onClose={() => setDraftFor(null)} onDone={() => { setDraftFor(null); loadMsgs() }} />}
    </div>
  )
}

function ThreadReader({ thread, subject, jobSpecMsgId, replyToId, onArchive, onDraft, onReplied }: { thread: ThreadMsg[]; subject: string; jobSpecMsgId: string | null; replyToId: string; onArchive: () => void; onDraft: (id: string) => void; onReplied: () => void }) {
  const [reply, setReply] = useState('')
  const [showReply, setShowReply] = useState(false)
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState('')
  const createdJob = thread.find((m) => m.createdPositionId)?.createdPositionId ?? null

  async function send() {
    if (!reply.trim()) return
    setSending(true); setMsg('')
    const res = await fetch(`/api/hire/mailbox/messages/${replyToId}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: reply }) })
    setSending(false)
    if (res.ok) { setReply(''); setShowReply(false); setMsg('✓ Reply sent'); onReplied() } else setMsg((await res.json().catch(() => ({}))).error ?? 'Failed to send')
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: 0, flex: 1 }}>{subject}</h2>
        <span style={{ fontSize: 11.5, color: '#94A3B8', whiteSpace: 'nowrap' }}>{thread.length} message{thread.length > 1 ? 's' : ''}</span>
        <button onClick={onArchive} title="Archive conversation" style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap' }}>Archive</button>
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
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
        {!showReply ? (
          <button onClick={() => setShowReply(true)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #6D28D9', background: '#fff', color: '#6D28D9', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>↩ Reply</button>
        ) : (
          <div>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 6 }}>Replying to {thread[thread.length - 1].fromAddr} from your mailbox</div>
            <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write your reply…" style={{ width: '100%', boxSizing: 'border-box', minHeight: 120, padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.6 }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={send} disabled={sending || !reply.trim()} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: sending || !reply.trim() ? '#C4B5FD' : '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13, cursor: sending || !reply.trim() ? 'default' : 'pointer' }}>{sending ? 'Sending…' : 'Send reply'}</button>
              <button onClick={() => { setShowReply(false); setReply('') }} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}
        {msg && <div style={{ fontSize: 12.5, color: msg.startsWith('✓') ? '#059669' : '#DC2626', marginTop: 8 }}>{msg}</div>}
      </div>
    </div>
  )
}
