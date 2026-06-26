'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { NewInvoiceModal } from '@/components/hire/new-invoice-modal'
import { can } from '@/lib/hire/permissions'

interface Invoice {
  id: string; number: string | null; amount: number; amountPaid: number; currency: string
  sentDate: string; dueDate: string; status: string; lastReminderAt: string | null; remindersOn: boolean
  client: { id: string; name: string }; deal: { id: string; title: string } | null; _count: { reminders: number }
}
interface ClientAR { clientId: string; clientName: string; totalOwed: number; overdue: number; invoiceCount: number }
interface Summary {
  totalOwed: number; totalOverdue: number; openInvoiceCount: number
  buckets: { current: number; '0-30': number; '31-60': number; '60+': number }
  byClient: ClientAR[]
}

const DAY = 86400000
const money = (n: number, cur = 'INR') => (cur === 'USD' ? '$' : '₹') + Math.round(n).toLocaleString('en-IN')
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })

function daysOverdue(inv: Invoice): number {
  if (inv.status === 'paid') return 0
  const d = Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / DAY)
  return d > 0 ? d : 0
}

const STATUS_STYLE: Record<string, { c: string; bg: string; label: string }> = {
  paid: { c: '#059669', bg: 'rgba(16,185,129,0.12)', label: 'Paid' },
  partial: { c: '#0369A1', bg: 'rgba(2,132,199,0.12)', label: 'Partial' },
  pending: { c: '#B45309', bg: 'rgba(245,158,11,0.12)', label: 'Pending' },
}

export default function ARPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [tab, setTab] = useState<'open' | 'overdue' | 'paid'>('open')
  const [busy, setBusy] = useState<string | null>(null)
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => { fetch('/api/hire/auth/me').then((r) => (r.ok ? r.json() : null)).then((d) => setAllowed(can(d?.user?.role, 'ar'))).catch(() => setAllowed(false)) }, [])

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/hire/crm/invoices').then((r) => (r.ok ? r.json() : { invoices: [] })),
      fetch('/api/hire/crm/ar/summary').then((r) => (r.ok ? r.json() : null)),
    ]).then(([inv, sum]) => { setInvoices(inv.invoices ?? []); setSummary(sum); setLoaded(true) }).catch(() => setLoaded(true))
  }, [])
  useEffect(() => { load() }, [load])

  const view = useMemo(() => {
    if (tab === 'paid') return invoices.filter((i) => i.status === 'paid')
    if (tab === 'overdue') return invoices.filter((i) => i.status !== 'paid' && daysOverdue(i) > 0)
    return invoices.filter((i) => i.status !== 'paid')
  }, [invoices, tab])

  async function markPaid(id: string) {
    setBusy(id)
    await fetch(`/api/hire/crm/invoices/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markPaid: true }) }).catch(() => {})
    setBusy(null); load()
  }
  async function toggleReminders(id: string, on: boolean) {
    setBusy(id)
    await fetch(`/api/hire/crm/invoices/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ remindersOn: on }) }).catch(() => {})
    setBusy(null); load()
  }

  if (allowed === false) return (
    <div style={{ maxWidth: 520, padding: '32px 0' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Access restricted</div>
      <div style={{ fontSize: 13.5, color: '#64748B', marginTop: 6 }}>Accounts Receivable is available to admins.</div>
    </div>
  )
  if (!loaded || allowed === null) return <div style={{ color: '#475569' }}>Loading…</div>

  return (
    <div style={{ maxWidth: 1080 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Accounts Receivable</h1>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>Track what clients owe, ageing, and automatic payment reminders.</div>
        </div>
        <button onClick={() => setShowNew(true)} style={{ marginLeft: 'auto', padding: '10px 16px', borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>+ New Invoice</button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }}>
        <Card label="Total outstanding" value={money(summary?.totalOwed ?? 0)} sub={`${summary?.openInvoiceCount ?? 0} open invoice${(summary?.openInvoiceCount ?? 0) === 1 ? '' : 's'}`} />
        <Card label="Overdue" value={money(summary?.totalOverdue ?? 0)} sub="past due date" accent="#DC2626" />
        <Card label="Current (not yet due)" value={money(summary?.buckets.current ?? 0)} sub="within terms" accent="#059669" />
      </div>

      {/* Ageing buckets */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 18, marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>Ageing</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <Bucket label="Current" amount={summary?.buckets.current ?? 0} color="#059669" />
          <Bucket label="0–30 days" amount={summary?.buckets['0-30'] ?? 0} color="#D97706" />
          <Bucket label="31–60 days" amount={summary?.buckets['31-60'] ?? 0} color="#EA580C" />
          <Bucket label="60+ days" amount={summary?.buckets['60+'] ?? 0} color="#DC2626" />
        </div>
      </div>

      {/* Per-client owed */}
      {(summary?.byClient.length ?? 0) > 0 && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 18, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>Owed by client</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {summary!.byClient.map((c) => (
              <div key={c.clientId} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                <span style={{ fontWeight: 600, color: '#0F172A', minWidth: 160 }}>{c.clientName}</span>
                <span style={{ color: '#64748B' }}>{c.invoiceCount} open</span>
                {c.overdue > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', background: 'rgba(220,38,38,0.10)', borderRadius: 100, padding: '2px 8px' }}>{money(c.overdue)} overdue</span>}
                <span style={{ marginLeft: 'auto', fontWeight: 800, color: '#0F172A' }}>{money(c.totalOwed)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoice list */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['open', 'overdue', 'paid'] as const).map((s) => (
          <button key={s} onClick={() => setTab(s)} style={{ fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 100, border: '1px solid ' + (tab === s ? '#6D28D9' : '#E2E8F0'), background: tab === s ? 'rgba(109,40,217,0.08)' : '#fff', color: tab === s ? '#6D28D9' : '#64748B', cursor: 'pointer' }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
        {view.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#475569' }}>No invoices here yet.</div>}
        {view.map((inv, idx) => {
          const od = daysOverdue(inv)
          const bal = Math.max(0, inv.amount - inv.amountPaid)
          const st = STATUS_STYLE[inv.status] ?? STATUS_STYLE.pending
          return (
            <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: idx < view.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>{inv.client.name}</span>
                  {inv.number && <span style={{ fontSize: 12, color: '#94A3B8' }}>{inv.number}</span>}
                  <span style={{ fontSize: 11, fontWeight: 700, color: st.c, background: st.bg, padding: '2px 8px', borderRadius: 100 }}>{st.label}</span>
                  {od > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', background: 'rgba(220,38,38,0.10)', padding: '2px 8px', borderRadius: 100 }}>{od}d overdue</span>}
                </div>
                <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 3 }}>
                  {inv.deal ? `${inv.deal.title} · ` : ''}Sent {fmtDate(inv.sentDate)} · Due {fmtDate(inv.dueDate)}
                  {inv.lastReminderAt ? ` · Last reminder ${fmtDate(inv.lastReminderAt)} (${inv._count.reminders})` : inv.status !== 'paid' ? ' · No reminder sent' : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{money(bal, inv.currency)}</div>
                {inv.amountPaid > 0 && inv.status !== 'paid' && <div style={{ fontSize: 11.5, color: '#64748B' }}>of {money(inv.amount, inv.currency)}</div>}
              </div>
              {inv.status !== 'paid' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => toggleReminders(inv.id, !inv.remindersOn)} disabled={busy === inv.id} title={inv.remindersOn ? 'Pause reminders' : 'Resume reminders'} style={ghost}>{inv.remindersOn ? '🔔' : '🔕'}</button>
                  <button onClick={() => markPaid(inv.id)} disabled={busy === inv.id} style={{ ...ghost, color: '#059669', borderColor: 'rgba(5,150,105,0.3)', fontWeight: 700 }}>Mark paid</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showNew && (
        <NewInvoiceModal
          onClose={() => setShowNew(false)}
          onDone={() => { setShowNew(false); load() }}
        />
      )}
    </div>
  )
}

const ghost: React.CSSProperties = { fontSize: 13, fontWeight: 600, padding: '6px 11px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', cursor: 'pointer' }

function Card({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 18 }}>
      <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: accent ?? '#0F172A', marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{sub}</div>
    </div>
  )
}

function Bucket({ label, amount, color }: { label: string; amount: number; color: string }) {
  return (
    <div style={{ borderLeft: `3px solid ${color}`, paddingLeft: 12 }}>
      <div style={{ fontSize: 12, color: '#64748B' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>{money(amount)}</div>
    </div>
  )
}
