'use client'

import Link from 'next/link'

export function Shell({ children, onSignOut }: { children: React.ReactNode; onSignOut?: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0B1120', color: '#E2E8F0', fontFamily: 'var(--font-sans)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/admin" style={{ fontSize: 18, fontWeight: 800, color: '#fff', textDecoration: 'none' }}>Levl1 Admin</Link>
            <Link href="/admin/interviews" style={{ fontSize: 13, color: '#94A3B8', textDecoration: 'none' }}>Interviews</Link>
          </div>
          {onSignOut && (
            <button onClick={onSignOut} style={{ fontSize: 13, color: '#94A3B8', background: 'none', border: '1px solid #1F2937', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>Sign out</button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginTop: 6 }}>{value}</div>
    </div>
  )
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 14, fontWeight: 700, color: '#CBD5E1', margin: '24px 0 12px' }}>{children}</div>
}

export function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 12, overflow: 'hidden' }}>{children}</div>
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr>{head.map((h, i) => <th key={i} style={{ textAlign: 'left', padding: '11px 14px', color: '#64748B', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>)}</tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}

export function Td({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) {
  return <td colSpan={colSpan} style={{ padding: '11px 14px', color: '#CBD5E1' }}>{children}</td>
}

export function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, string> = { trial: '#F59E0B', starter: '#4F46E5', professional: '#10B981', enterprise: '#A855F7', expired: '#EF4444' }
  const c = map[plan] ?? '#64748B'
  return <span style={{ fontSize: 11, fontWeight: 700, color: c, background: `${c}1A`, padding: '2px 9px', borderRadius: 100, textTransform: 'capitalize' }}>{plan}</span>
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { completed: '#10B981', scheduled: '#4F46E5', interviewing: '#F59E0B', invited: '#64748B', pending: '#64748B' }
  const c = map[status] ?? '#64748B'
  return <span style={{ fontSize: 11, fontWeight: 700, color: c, background: `${c}1A`, padding: '2px 9px', borderRadius: 100, textTransform: 'capitalize' }}>{status}</span>
}

export const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`
export const ago = (iso: string | null) => {
  if (!iso) return '—'
  const d = Date.now() - new Date(iso).getTime()
  const days = Math.floor(d / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
