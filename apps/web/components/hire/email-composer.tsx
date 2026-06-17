'use client'
import { useEffect, useState } from 'react'

interface Template { id: string; name: string; subject: string; body: string }
interface Ctx { name: string; job: string | null; company: string | null; email: string | null; emailOptOut: boolean }

// Client mirror of lib/hire/campaigns.personalize so the preview matches what
// the server will actually send.
function fill(text: string, c: Ctx) {
  return text
    .replace(/\{\{name\}\}/g, c.name || 'there')
    .replace(/\{\{job\}\}/g, c.job || 'the role')
    .replace(/\{\{company\}\}/g, c.company || 'our client')
}

export function EmailComposer({ candidateId, onClose, onSent }: { candidateId: string; onClose: () => void; onSent: () => void }) {
  const [ctx, setCtx] = useState<Ctx | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateId, setTemplateId] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch(`/api/hire/candidates/${candidateId}/email`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d && !d.error) setCtx(d) }).catch(() => {})
    fetch('/api/hire/email-templates').then((r) => (r.ok ? r.json() : null)).then((d) => setTemplates(d?.templates ?? [])).catch(() => {})
  }, [candidateId])

  function applyTemplate(id: string) {
    setTemplateId(id)
    const t = templates.find((x) => x.id === id)
    if (t) { setSubject(t.subject); setBody(t.body) }
  }

  async function send() {
    if (!subject.trim() || !body.trim()) { setMsg('Add a subject and message.'); return }
    setSending(true); setMsg('')
    try {
      const res = await fetch(`/api/hire/candidates/${candidateId}/email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject, body, templateId: templateId || undefined }) })
      const d = await res.json().catch(() => ({}))
      if (res.ok) { onSent(); onClose() } else setMsg(d.error ?? 'Failed to send.')
    } finally { setSending(false) }
  }

  const optedOut = ctx?.emailOptOut === true
  const noEmail = ctx != null && !ctx.email

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 560, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 16, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: 0 }}>Send email</h2>
          <button onClick={onClose} style={{ marginLeft: 'auto', fontSize: 20, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ fontSize: 12.5, color: '#64748B', marginBottom: 14 }}>To {ctx ? <strong>{ctx.name}{ctx.email ? ` · ${ctx.email}` : ''}</strong> : '…'}</div>

        {optedOut && <div style={{ fontSize: 13, color: '#B45309', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>⚠ This candidate has opted out of emails — sending is blocked.</div>}
        {noEmail && <div style={{ fontSize: 13, color: '#B91C1C', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 10, padding: '10px 12px', marginBottom: 14 }}>This candidate has no email address on file.</div>}

        <Label>Template</Label>
        <select value={templateId} onChange={(e) => applyTemplate(e.target.value)} style={input}>
          <option value="">Freeform (no template)</option>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <Label>Subject</Label>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject — tokens like {{name}} allowed" style={input} />

        <Label>Message</Label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Hi {{name}}, regarding {{job}}…" style={{ ...input, minHeight: 130, fontFamily: 'inherit' }} />
        <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>Tokens: {'{{name}}'} · {'{{job}}'} · {'{{company}}'} — auto-filled from this candidate.</div>

        {ctx && (subject || body) && (
          <div style={{ marginTop: 14 }}>
            <Label>Preview</Label>
            <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ background: '#F8FAFC', padding: '8px 12px', fontSize: 12.5, fontWeight: 700, color: '#334155', borderBottom: '1px solid #F1F5F9' }}>{fill(subject, ctx) || '(no subject)'}</div>
              <div style={{ padding: '12px', fontSize: 13, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{fill(body, ctx) || '(empty)'}</div>
            </div>
          </div>
        )}

        {msg && <div style={{ fontSize: 12.5, color: '#DC2626', marginTop: 10 }}>{msg}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 11, borderRadius: 9, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}>Cancel</button>
          <button onClick={send} disabled={sending || optedOut || noEmail} style={{ flex: 1, padding: 11, borderRadius: 9, border: 'none', background: sending || optedOut || noEmail ? '#C4B5FD' : '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: sending || optedOut || noEmail ? 'default' : 'pointer' }}>{sending ? 'Sending…' : 'Send email'}</button>
        </div>
      </div>
    </div>
  )
}

const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13.5, marginBottom: 4 }
function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '12px 0 5px' }}>{children}</div>
}
