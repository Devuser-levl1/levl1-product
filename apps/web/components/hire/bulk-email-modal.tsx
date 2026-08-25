'use client'
import { useEffect, useState } from 'react'

interface Template { id: string; name: string; subject: string; body: string }
interface PreviewData {
  recipientCount: number; skippedOptOut: number; skippedNoEmail: number; deduped: number; notFound: number
  sample: { name: string; email: string; subject: string; body: string } | null
}
interface SendResult {
  sent: number; failed: number; skippedOptOut: number; skippedNoEmail: number; deduped: number
  recipientCount: number; failures: { name: string; email: string; error: string }[]
}

const inp: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff', width: '100%', boxSizing: 'border-box' }

/**
 * Bulk email composer — pick a template (or write freeform), preview tokens
 * filled for one recipient + a recipient count, then confirm to send.
 * Reuses POST /api/hire/candidates/bulk-email (the multi-recipient send path).
 */
export function BulkEmailModal({ candidateIds, onClose, onSent }: { candidateIds: string[]; onClose: () => void; onSent?: () => void }) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateId, setTemplateId] = useState('')
  const [subject, setSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [step, setStep] = useState<'compose' | 'preview' | 'result'>('compose')
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [result, setResult] = useState<SendResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetch('/api/hire/email-templates').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.templates) setTemplates(d.templates) }).catch(() => {})
  }, [])

  function pickTemplate(id: string) {
    setTemplateId(id)
    const t = templates.find((x) => x.id === id)
    if (t) { setSubject(t.subject); setEmailBody(t.body) }
  }

  async function doPreview() {
    if (!subject.trim() || !emailBody.trim()) { setErr('A subject and body (or template) are required.'); return }
    setErr(''); setBusy(true)
    try {
      const res = await fetch('/api/hire/candidates/bulk-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateIds, subject, body: emailBody, preview: true }),
      })
      const d = await res.json()
      if (!res.ok) { setErr(d.error ?? 'Could not build preview.'); return }
      setPreview(d); setStep('preview')
    } catch { setErr('Something went wrong.') } finally { setBusy(false) }
  }

  async function doSend() {
    setErr(''); setBusy(true)
    try {
      const res = await fetch('/api/hire/candidates/bulk-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateIds, subject, body: emailBody }),
      })
      const d = await res.json()
      if (!res.ok) { setErr(d.error ?? 'Send failed.'); setBusy(false); return }
      setResult(d); setStep('result'); onSent?.()
    } catch { setErr('Something went wrong.') } finally { setBusy(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: 520, maxHeight: '90vh', overflowY: 'auto' }}>

        {step === 'compose' && (
          <>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Email {candidateIds.length} candidate{candidateIds.length !== 1 ? 's' : ''}</div>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>Pick a template or write your own. Tokens <code>{'{{name}}'}</code> <code>{'{{job}}'}</code> <code>{'{{company}}'}</code> fill per recipient.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 5 }}>Template</label>
                <select style={inp} value={templateId} onChange={(e) => pickTemplate(e.target.value)}>
                  <option value="">— Choose a template (optional) —</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 5 }}>Subject</label>
                <input style={inp} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. An opportunity for {{name}}" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 5 }}>Body</label>
                <textarea style={{ ...inp, minHeight: 150 }} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder={'Hi {{name}},\n\nWe think you\'d be a great fit for {{job}} at {{company}}…'} />
              </div>
              {err && <div style={{ color: '#DC2626', fontSize: 13 }}>{err}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button onClick={doPreview} disabled={busy} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, cursor: busy ? 'default' : 'pointer' }}>{busy ? 'Loading…' : 'Preview →'}</button>
              </div>
            </div>
          </>
        )}

        {step === 'preview' && preview && (
          <>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>Review &amp; confirm</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <Stat label="Will send" value={preview.recipientCount} tone="go" />
              {preview.skippedOptOut > 0 && <Stat label="Opted out (skipped)" value={preview.skippedOptOut} tone="warn" />}
              {preview.skippedNoEmail > 0 && <Stat label="No email (skipped)" value={preview.skippedNoEmail} tone="warn" />}
              {preview.deduped > 0 && <Stat label="Duplicates removed" value={preview.deduped} tone="muted" />}
            </div>

            {preview.sample ? (
              <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ background: '#F8FAFC', padding: '8px 12px', fontSize: 11.5, fontWeight: 700, color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>PREVIEW · as {preview.sample.name} &lt;{preview.sample.email}&gt;</div>
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>{preview.sample.subject}</div>
                  <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{preview.sample.body}</div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#B45309', background: 'rgba(245,158,11,0.1)', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>No eligible recipients — everyone selected is opted out or missing an email.</div>
            )}

            {err && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 10 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setStep('compose'); setErr('') }} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>← Back</button>
              <button onClick={doSend} disabled={busy || preview.recipientCount === 0} style={{ flex: 2, padding: 10, borderRadius: 8, border: 'none', background: preview.recipientCount === 0 ? '#94A3B8' : '#6D28D9', color: '#fff', fontWeight: 700, cursor: busy || preview.recipientCount === 0 ? 'default' : 'pointer' }}>{busy ? 'Sending…' : `Send to ${preview.recipientCount} candidate${preview.recipientCount !== 1 ? 's' : ''}`}</button>
            </div>
          </>
        )}

        {step === 'result' && result && (
          <>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>Done</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <Stat label="Sent" value={result.sent} tone="go" />
              {result.failed > 0 && <Stat label="Failed" value={result.failed} tone="bad" />}
              {result.skippedOptOut > 0 && <Stat label="Opted out" value={result.skippedOptOut} tone="warn" />}
              {result.skippedNoEmail > 0 && <Stat label="No email" value={result.skippedNoEmail} tone="warn" />}
              {result.deduped > 0 && <Stat label="Duplicates removed" value={result.deduped} tone="muted" />}
            </div>
            {result.failures.length > 0 && (
              <ul style={{ fontSize: 12, color: '#475569', maxHeight: 120, overflowY: 'auto', paddingLeft: 18, marginBottom: 12 }}>
                {result.failures.map((f, i) => <li key={i}>{f.name} &lt;{f.email}&gt; — {f.error}</li>)}
              </ul>
            )}
            <button onClick={onClose} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Close</button>
          </>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'go' | 'warn' | 'bad' | 'muted' }) {
  const colors = {
    go: { bg: 'rgba(16,185,129,0.1)', fg: '#047857' },
    warn: { bg: 'rgba(245,158,11,0.12)', fg: '#B45309' },
    bad: { bg: 'rgba(239,68,68,0.1)', fg: '#DC2626' },
    muted: { bg: '#F1F5F9', fg: '#64748B' },
  }[tone]
  return (
    <div style={{ background: colors.bg, borderRadius: 9, padding: '8px 12px', minWidth: 70 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: colors.fg, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: colors.fg, marginTop: 3 }}>{label}</div>
    </div>
  )
}
