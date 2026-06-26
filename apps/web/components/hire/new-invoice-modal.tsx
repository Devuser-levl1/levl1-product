'use client'
import { useEffect, useState } from 'react'
import { ClientPicker } from '@/components/hire/client-picker'

interface Deal { id: string; title: string; value: number; clientId: string }

const inp: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff', width: '100%', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }

const todayStr = () => new Date().toISOString().slice(0, 10)

// Raise an invoice against a client (optionally tied to a deal, which prefills
// the amount). Nothing is created until "Create invoice" is pressed.
export function NewInvoiceModal({
  presetClientId, presetDealId, defaultDueCycle = 30, defaultReminderInterval = 7, onClose, onDone,
}: {
  presetClientId?: string; presetDealId?: string; defaultDueCycle?: number; defaultReminderInterval?: number
  onClose: () => void; onDone: () => void
}) {
  const [clientId, setClientId] = useState(presetClientId ?? '')
  const [deals, setDeals] = useState<Deal[]>([])
  const [dealId, setDealId] = useState(presetDealId ?? '')
  const [number, setNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR')
  const [sentDate, setSentDate] = useState(todayStr())
  const [dueCycleDays, setDueCycleDays] = useState(String(defaultDueCycle))
  const [reminderIntervalDays, setReminderIntervalDays] = useState(String(defaultReminderInterval))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // Load deals for the selected client (prefill amount from a chosen deal).
  useEffect(() => {
    if (!clientId) { setDeals([]); return }
    fetch('/api/hire/crm/deals').then((r) => (r.ok ? r.json() : null)).then((d) => {
      const all: Deal[] = (d?.deals ?? []).map((x: { id: string; title: string; value: number; clientId: string }) => ({ id: x.id, title: x.title, value: x.value, clientId: x.clientId }))
      setDeals(all.filter((x) => x.clientId === clientId))
    }).catch(() => {})
  }, [clientId])

  function pickDeal(id: string) {
    setDealId(id)
    const d = deals.find((x) => x.id === id)
    if (d && d.value > 0 && !amount) setAmount(String(Math.round(d.value)))
  }

  const dueDatePreview = (() => {
    const days = Number(dueCycleDays) || 0
    const base = sentDate ? new Date(sentDate) : new Date()
    return new Date(base.getTime() + days * 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  })()

  async function create() {
    setErr('')
    if (!clientId) { setErr('Select a client'); return }
    if (!(Number(amount) > 0)) { setErr('Enter a positive amount'); return }
    setSaving(true)
    const res = await fetch('/api/hire/crm/invoices', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, dealId: dealId || null, number: number || null, amount: Number(amount), currency, sentDate, dueCycleDays: Number(dueCycleDays) || undefined, reminderIntervalDays: Number(reminderIntervalDays) || undefined, notes: notes || null }),
    })
    const d = await res.json()
    setSaving(false)
    if (!res.ok) { setErr(d.error ?? 'Could not create invoice'); return }
    onDone()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: 520, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>New invoice</div>
        <div style={{ fontSize: 12.5, color: '#64748B', marginBottom: 16 }}>Raise an invoice against a client. Reminders start automatically once it&apos;s overdue.</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label style={lbl}>Client</label><ClientPicker value={clientId} onChange={(id) => { setClientId(id); setDealId('') }} /></div>

          <div>
            <label style={lbl}>Deal (optional — prefills amount)</label>
            <select style={inp} value={dealId} onChange={(e) => pickDeal(e.target.value)} disabled={!clientId}>
              <option value="">{clientId ? (deals.length ? 'No deal' : 'No deals for this client') : 'Select a client first'}</option>
              {deals.map((d) => <option key={d.id} value={d.id}>{d.title} — ₹{Math.round(d.value).toLocaleString('en-IN')}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 10 }}>
            <div><label style={lbl}>Amount</label><input style={inp} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 250000" /></div>
            <div><label style={lbl}>Currency</label>
              <select style={inp} value={currency} onChange={(e) => setCurrency(e.target.value as 'INR' | 'USD')}><option value="INR">INR ₹</option><option value="USD">USD $</option></select>
            </div>
          </div>

          <div><label style={lbl}>Invoice number / ref (optional)</label><input style={inp} value={number} onChange={(e) => setNumber(e.target.value)} placeholder="e.g. INV-2026-014" /></div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lbl}>Invoice sent</label><input style={inp} type="date" value={sentDate} onChange={(e) => setSentDate(e.target.value)} /></div>
            <div><label style={lbl}>Due cycle (days)</label><input style={inp} type="number" value={dueCycleDays} onChange={(e) => setDueCycleDays(e.target.value)} /></div>
          </div>
          <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: -4 }}>Due on <strong style={{ color: '#475569' }}>{dueDatePreview}</strong> · reminders every
            <input style={{ ...inp, width: 52, display: 'inline-block', padding: '2px 6px', margin: '0 5px', fontSize: 12 }} type="number" value={reminderIntervalDays} onChange={(e) => setReminderIntervalDays(e.target.value)} />days after due.</div>

          <div><label style={lbl}>Notes (optional)</label><textarea style={{ ...inp, minHeight: 56, resize: 'vertical' }} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

          {err && <div style={{ color: '#DC2626', fontSize: 13 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>Cancel</button>
            <button onClick={create} disabled={saving} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, cursor: saving ? 'default' : 'pointer' }}>{saving ? 'Creating…' : 'Create invoice'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
