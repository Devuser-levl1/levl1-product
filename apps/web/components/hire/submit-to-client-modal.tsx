'use client'
import { useEffect, useMemo, useState } from 'react'
import { resolveColumns, columnLabel } from '@/lib/hire/submission-columns'
import { SubmissionColumnsEditor } from '@/components/hire/submission-columns-editor'

interface Contact { id: string; name: string; email: string | null; emailOptOut: boolean }
interface Client { id: string; name: string; submissionColumns: unknown; contacts: Contact[] }

const inp: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff', width: '100%', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }

export function SubmitToClientModal({ candidateIds, onClose, onSent }: { candidateIds: string[]; onClose: () => void; onSent?: () => void }) {
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState('')
  const [contactId, setContactId] = useState('')
  const [subject, setSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [override, setOverride] = useState<string[] | null>(null) // per-send column override
  const [editCols, setEditCols] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [result, setResult] = useState<{ count: number; sentTo: string } | null>(null)

  useEffect(() => {
    fetch('/api/hire/crm/clients').then((r) => (r.ok ? r.json() : null)).then((d) => {
      const list: Client[] = d?.clients ?? d ?? []
      setClients(list)
      if (list.length === 1) setClientId(list[0].id)
    }).catch(() => {})
  }, [])

  const client = useMemo(() => clients.find((c) => c.id === clientId) ?? null, [clients, clientId])
  const templateCols = useMemo(() => resolveColumns(client?.submissionColumns), [client])
  const cols = override ?? templateCols
  const contactsWithEmail = client?.contacts.filter((c) => c.email && !c.emailOptOut) ?? []

  // Default the contact + prefill the email once a client is chosen.
  useEffect(() => {
    if (!client) return
    setContactId(contactsWithEmail[0]?.id ?? '')
    setOverride(null); setEditCols(false)
    setSubject(`Candidate submission — ${candidateIds.length} profile${candidateIds.length === 1 ? '' : 's'}`)
    setEmailBody(`Hi,\n\nPlease find attached ${candidateIds.length} candidate profile${candidateIds.length === 1 ? '' : 's'} for your review, along with a summary sheet. Résumés are attached individually.\n\nHappy to set up conversations with any that look right.\n\nBest regards`)
  }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function send() {
    if (!clientId) { setErr('Choose a client.'); return }
    if (!contactId) { setErr('Choose a contact with an email.'); return }
    if (!subject.trim() || !emailBody.trim()) { setErr('Subject and message are required.'); return }
    setBusy(true); setErr('')
    try {
      const res = await fetch('/api/hire/candidates/submit-to-client', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateIds, clientId, contactId, subject, body: emailBody, ...(override ? { columns: override } : {}) }),
      })
      const d = await res.json()
      if (!res.ok) { setErr(d.error ?? 'Could not send.'); return }
      setResult({ count: d.count, sentTo: d.sentTo }); onSent?.()
    } catch { setErr('Something went wrong.') } finally { setBusy(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: 560, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto' }}>
        {result ? (
          <>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>Sent ✓</div>
            <div style={{ fontSize: 13.5, color: '#059669', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, padding: 12, marginBottom: 14 }}>
              Submitted {result.count} candidate{result.count === 1 ? '' : 's'} to {result.sentTo} — an Excel summary + {result.count} résumé{result.count === 1 ? '' : 's'} attached. Marked submitted &amp; logged on each timeline.
            </div>
            <button onClick={onClose} style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Done</button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Send {candidateIds.length} candidate{candidateIds.length === 1 ? '' : 's'} to client</div>
            <div style={{ fontSize: 12.5, color: '#64748B', marginBottom: 16 }}>Emails the contact an Excel summary (their column format) + each résumé, and marks the candidates submitted.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={lbl}>Client</label>
                <select style={inp} value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">— Choose a client —</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {client && (
                <>
                  <div>
                    <label style={lbl}>Send to contact</label>
                    {contactsWithEmail.length === 0
                      ? <div style={{ fontSize: 12.5, color: '#B45309', background: 'rgba(245,158,11,0.1)', borderRadius: 8, padding: '8px 10px' }}>This client has no contact with an email. Add one on the client page.</div>
                      : <select style={inp} value={contactId} onChange={(e) => setContactId(e.target.value)}>
                          {contactsWithEmail.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.email}</option>)}
                        </select>}
                  </div>

                  {/* Columns preview + per-send override */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                      <label style={{ ...lbl, marginBottom: 0 }}>Summary columns {override ? '(overridden for this send)' : '(from client template)'}</label>
                      <button type="button" onClick={() => { setEditCols((v) => !v); if (!override) setOverride([...templateCols]) }} style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: '#6D28D9', background: 'none', border: 'none', cursor: 'pointer' }}>{editCols ? 'Done' : 'Edit for this send'}</button>
                    </div>
                    {editCols
                      ? <SubmissionColumnsEditor value={override ?? templateCols} onChange={setOverride} />
                      : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {cols.map((k) => <span key={k} style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', background: '#F1F5F9', borderRadius: 100, padding: '3px 9px' }}>{columnLabel(k)}</span>)}
                        </div>}
                    {override && <button type="button" onClick={() => { setOverride(null); setEditCols(false) }} style={{ marginTop: 6, fontSize: 11.5, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Reset to client template</button>}
                  </div>

                  <div><label style={lbl}>Subject</label><input style={inp} value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
                  <div><label style={lbl}>Message</label><textarea style={{ ...inp, minHeight: 130 }} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} /></div>
                  <div style={{ fontSize: 11.5, color: '#94A3B8' }}>Attachments: 1 Excel summary + {candidateIds.length} résumé{candidateIds.length === 1 ? '' : 's'}.</div>
                </>
              )}

              {err && <div style={{ color: '#DC2626', fontSize: 13 }}>{err}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button onClick={send} disabled={busy || !client || contactsWithEmail.length === 0} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: busy || !client || contactsWithEmail.length === 0 ? '#C4B5FD' : '#6D28D9', color: '#fff', fontWeight: 700, cursor: busy ? 'default' : 'pointer' }}>{busy ? 'Sending…' : 'Send to client'}</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
