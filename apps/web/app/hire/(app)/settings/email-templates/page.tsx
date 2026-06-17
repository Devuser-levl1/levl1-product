'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Template { id: string; name: string; subject: string; body: string; updatedAt: string }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20 }
const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13.5 }
const TOKENS = ['{{name}}', '{{job}}', '{{company}}']

export default function EmailTemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [editing, setEditing] = useState<Template | null>(null) // null = no form; {id:''} = new
  const [form, setForm] = useState({ name: '', subject: '', body: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    fetch('/api/hire/email-templates').then((r) => (r.ok ? r.json() : null)).then((d) => setTemplates(d?.templates ?? [])).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  function startNew() { setEditing({ id: '', name: '', subject: '', body: '', updatedAt: '' }); setForm({ name: '', subject: '', body: '' }) }
  function startEdit(t: Template) { setEditing(t); setForm({ name: t.name, subject: t.subject, body: t.body }) }

  async function save() {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) return
    setSaving(true)
    const isNew = !editing?.id
    const res = await fetch(isNew ? '/api/hire/email-templates' : `/api/hire/email-templates/${editing!.id}`, {
      method: isNew ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) { setEditing(null); load() }
  }
  async function del(id: string) {
    if (!confirm('Delete this template?')) return
    await fetch(`/api/hire/email-templates/${id}`, { method: 'DELETE' }); load()
  }
  function insertToken(tok: string) { setForm((f) => ({ ...f, body: f.body + tok })) }

  return (
    <div style={{ maxWidth: 760 }}>
      <button onClick={() => router.push('/hire/settings')} style={{ fontSize: 13, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8 }}>← Settings</button>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Email Templates</h1>
        {!editing && <button onClick={startNew} style={{ marginLeft: 'auto', padding: '9px 14px', borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ New template</button>}
      </div>
      <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 18px' }}>Reusable emails for 1:1 candidate outreach. Use tokens {TOKENS.join(' · ')} — they auto-fill from the candidate and job when you send.</p>

      {editing && (
        <div style={{ ...card, marginBottom: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>{editing.id ? 'Edit template' : 'New template'}</div>
          <Field label="Name (internal)"><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. First outreach" style={input} /></Field>
          <Field label="Subject"><input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Opportunity: {{job}}" style={input} /></Field>
          <Field label="Body">
            <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="Hi {{name}}, we're hiring for {{job}}…" style={{ ...input, minHeight: 130, fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {TOKENS.map((t) => <button key={t} onClick={() => insertToken(t)} style={{ fontSize: 11.5, fontWeight: 600, color: '#6D28D9', background: 'rgba(109,40,217,0.07)', border: '1px solid rgba(109,40,217,0.18)', borderRadius: 100, padding: '4px 10px', cursor: 'pointer' }}>+ {t}</button>)}
            </div>
          </Field>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={() => setEditing(null)} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            <button onClick={save} disabled={saving || !form.name.trim() || !form.subject.trim() || !form.body.trim()} style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>{saving ? 'Saving…' : 'Save template'}</button>
          </div>
        </div>
      )}

      {templates.length === 0 && !editing ? (
        <div style={{ ...card, textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✉️</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#475569' }}>No templates yet</div>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>Create a reusable template to speed up candidate outreach.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {templates.map((t) => (
            <div key={t.id} style={{ ...card, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{t.name}</div>
                <div style={{ fontSize: 12.5, color: '#475569', marginTop: 2 }}>{t.subject}</div>
                <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.body}</div>
              </div>
              <button onClick={() => startEdit(t)} style={{ fontSize: 12.5, fontWeight: 600, color: '#6D28D9', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
              <button onClick={() => del(t.id)} style={{ fontSize: 12.5, fontWeight: 600, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 12 }}><div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>{label}</div>{children}</div>
}
