'use client'
import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { CANDIDATE_SOURCES } from '@/lib/hire/constants'

interface Campaign { id: string; name: string; subject: string; status: string; sentCount: number; openCount: number; recipientCount: number; audienceType: string; sentAt: string | null; createdAt: string }
interface Job { id: string; title: string }

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20 }
const inp: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff', width: '100%', boxSizing: 'border-box' }

export default function CampaignsPage() {
  const [list, setList] = useState<Campaign[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [editing, setEditing] = useState<boolean>(false)

  const load = useCallback(() => { fetch('/api/hire/campaigns').then((r) => (r.ok ? r.json() : [])).then((d) => Array.isArray(d) && setList(d)).catch(() => {}) }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { fetch('/api/hire/jobs').then((r) => (r.ok ? r.json() : [])).then((d) => Array.isArray(d) && setJobs(d)).catch(() => {}) }, [])

  const drafts = list.filter((c) => c.status !== 'SENT')
  const sent = list.filter((c) => c.status === 'SENT')

  if (editing) return <Editor jobs={jobs} onClose={() => setEditing(false)} onDone={() => { setEditing(false); load() }} />

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Campaigns</h1>
        <button onClick={() => setEditing(true)} style={{ marginLeft: 'auto', padding: '9px 14px', borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ New Campaign</button>
      </div>
      {list.length === 0 && <div style={{ ...card, textAlign: 'center', color: '#94A3B8', padding: 40 }}>No campaigns yet. Create one to reactivate your talent pool.</div>}
      {drafts.length > 0 && <Section title={`Draft (${drafts.length})`} items={drafts} reload={load} />}
      {sent.length > 0 && <Section title={`Sent (${sent.length})`} items={sent} reload={load} />}
    </div>
  )
}

function Section({ title, items, reload }: { title: string; items: Campaign[]; reload: () => void }) {
  async function del(id: string) { if (!confirm('Delete this campaign?')) return; await fetch(`/api/hire/campaigns/${id}`, { method: 'DELETE' }); reload() }
  async function send(id: string) {
    if (!confirm('Send this campaign now?')) return
    const r = await fetch(`/api/hire/campaigns/${id}/send`, { method: 'POST' })
    const d = await r.json()
    if (r.ok) { toast.success(`Sending to ${d.recipientCount} recipients`); reload() } else toast.error(d.error ?? 'Send failed')
  }
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((c) => (
          <div key={c.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{c.name}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{c.subject || '(no subject)'} · {c.audienceType}</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>
                {c.status === 'SENT' ? `Sent ${c.sentAt ? new Date(c.sentAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''} · ${c.sentCount} sent · Opened ${c.openCount} (${c.sentCount ? Math.round((c.openCount / c.sentCount) * 100) : 0}%)` : 'Draft'}
              </div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: c.status === 'SENT' ? '#10B981' : '#64748B', background: c.status === 'SENT' ? 'rgba(16,185,129,0.1)' : '#F1F5F9', borderRadius: 100, padding: '3px 10px' }}>{c.status}</span>
            {c.status !== 'SENT' && <button onClick={() => send(c.id)} style={{ ...inp, width: 'auto', fontWeight: 600, color: '#4F46E5', cursor: 'pointer' }}>Send</button>}
            {c.status !== 'SENT' && <button onClick={() => del(c.id)} style={{ ...inp, width: 'auto', color: '#DC2626', cursor: 'pointer' }}>Delete</button>}
          </div>
        ))}
      </div>
    </div>
  )
}

function Editor({ jobs, onClose, onDone }: { jobs: Job[]; onClose: () => void; onDone: () => void }) {
  const [id, setId] = useState<string | null>(null)
  const [f, setF] = useState({ name: '', audienceType: 'candidates', subject: 'Hi {{name}}, opportunities at {{company}}', body: 'Hi {{name}},\n\nWe have new roles that match your profile for {{job}}. Reply if you are interested.\n\nBest,\nThe team', jobId: '', stage: '', source: '' })
  const [preview, setPreview] = useState<{ count: number; sample: { name: string; email: string }[] } | null>(null)
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))

  async function ensureSaved(): Promise<string | null> {
    const payload = { name: f.name || 'Untitled campaign', subject: f.subject, body: f.body, audienceType: f.audienceType, audienceFilter: { jobId: f.jobId || undefined, stage: f.stage || undefined, source: f.source || undefined } }
    if (id) { await fetch(`/api/hire/campaigns/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); return id }
    const r = await fetch('/api/hire/campaigns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const d = await r.json(); if (r.ok) { setId(d.id); return d.id }
    toast.error(d.error ?? 'Save failed'); return null
  }
  async function doPreview() { const cid = await ensureSaved(); if (!cid) return; const r = await fetch(`/api/hire/campaigns/${cid}/preview-audience`, { method: 'POST' }); setPreview(await r.json()) }
  async function saveDraft() { if (await ensureSaved()) { toast.success('Draft saved'); onDone() } }
  async function sendTest() { const cid = await ensureSaved(); if (!cid) return; const r = await fetch(`/api/hire/campaigns/${cid}/test`, { method: 'POST' }); const d = await r.json(); r.ok ? toast.success(`Test sent to ${d.to}`) : toast.error(d.error ?? 'Test failed') }
  async function sendNow() { const cid = await ensureSaved(); if (!cid) return; if (!confirm('Send this campaign now?')) return; const r = await fetch(`/api/hire/campaigns/${cid}/send`, { method: 'POST' }); const d = await r.json(); if (r.ok) { toast.success(`Sending to ${d.recipientCount} recipients`); onDone() } else toast.error(d.error ?? 'Send failed') }

  return (
    <div style={{ maxWidth: 720 }}>
      <button onClick={onClose} style={{ fontSize: 13, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8 }}>← Campaigns</button>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 16px' }}>New Campaign</h1>
      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Name (internal)"><input style={inp} value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Audience">
          <div style={{ display: 'flex', gap: 16 }}>{['candidates', 'contacts'].map((a) => <label key={a} style={{ fontSize: 13, cursor: 'pointer' }}><input type="radio" checked={f.audienceType === a} onChange={() => set('audienceType', a)} /> {a}</label>)}</div>
        </Field>
        {f.audienceType === 'candidates' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <select style={inp} value={f.jobId} onChange={(e) => set('jobId', e.target.value)}><option value="">All jobs</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</select>
            <input style={inp} placeholder="Stage (optional)" value={f.stage} onChange={(e) => set('stage', e.target.value)} />
            <select style={inp} value={f.source} onChange={(e) => set('source', e.target.value)}><option value="">All sources</option>{CANDIDATE_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
          </div>
        )}
        <div>
          <button onClick={doPreview} style={{ ...inp, width: 'auto', fontWeight: 600, color: '#4F46E5', cursor: 'pointer' }}>Preview audience</button>
          {preview && <span style={{ marginLeft: 12, fontSize: 13, color: '#334155' }}>→ {preview.count} recipients{preview.sample.length ? ` (e.g. ${preview.sample.map((s) => s.name).join(', ')})` : ''}</span>}
        </div>
        <Field label="Subject"><input style={inp} value={f.subject} onChange={(e) => set('subject', e.target.value)} /></Field>
        <Field label="Body — tokens: {{name}} {{job}} {{company}} · unsubscribe auto-appended"><textarea style={{ ...inp, minHeight: 160 }} value={f.body} onChange={(e) => set('body', e.target.value)} /></Field>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={saveDraft} style={{ ...inp, width: 'auto', fontWeight: 600, cursor: 'pointer' }}>Save Draft</button>
          <button onClick={sendTest} style={{ ...inp, width: 'auto', fontWeight: 600, color: '#4F46E5', cursor: 'pointer' }}>Send test to me</button>
          <button onClick={sendNow} style={{ marginLeft: 'auto', padding: '10px 18px', borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Send now</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>{label}</div>{children}</div>
}
