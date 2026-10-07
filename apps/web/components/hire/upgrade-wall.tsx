'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { HIRE_PLANS } from '@/lib/hire/plans'

// Shared Cashfree checkout for a Hire plan upgrade.
export async function startHireUpgrade(planId: string, onSuccess?: () => void) {
  const res = await fetch('/api/hire/billing/create-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId }) })
  const data = await res.json()
  if (!res.ok) { toast.error(data.error ?? 'Could not start checkout'); return }
  const cf = (window as unknown as Record<string, unknown>).Cashfree
  if (typeof cf !== 'function') { toast.error('Payment SDK not ready — refresh and retry'); return }
  const cashfree = (cf as (o: unknown) => { checkout: (o: unknown) => Promise<{ error?: unknown }> })({ mode: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox' })
  const result = await cashfree.checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: '_modal' })
  if (result?.error) { toast.error('Payment was cancelled or failed.'); return }
  // Verify, then refresh
  const v = await fetch(`/api/hire/billing/verify/${data.orderId}?plan=${planId}`).then((r) => r.json()).catch(() => null)
  if (v?.paid) { toast.success(`Upgraded to ${HIRE_PLANS[planId as keyof typeof HIRE_PLANS]?.name ?? planId}!`); onSuccess?.() }
  else toast.error('Payment not confirmed yet. If charged, contact hello@levl1.io')
}

export function HireUpgradeWall({ message, onClose }: { message: string; onClose: () => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  async function up(planId: string) {
    setBusy(planId)
    await startHireUpgrade(planId, () => { onClose(); setTimeout(() => window.location.reload(), 600) })
    setBusy(null)
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 28, width: 420, maxWidth: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Upgrade to continue</div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#475569' }}>×</button>
        </div>
        <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: '10px 0 20px' }}>{message}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => up('GROWTH')} disabled={!!busy} style={{ padding: '13px', borderRadius: 10, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{busy === 'GROWTH' ? '…' : 'Growth — Rs 11,999/mo'} <span style={{ fontSize: 11, opacity: 0.85 }}>· recommended</span></button>
          <button onClick={() => up('STARTER')} disabled={!!busy} style={{ padding: '13px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#fff', color: '#0F172A', fontWeight: 700, cursor: 'pointer' }}>{busy === 'STARTER' ? '…' : 'Starter — Rs 4,999/mo'}</button>
          <a href="/hire/settings/billing" style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#6D28D9', textDecoration: 'none', padding: 4 }}>See all plans</a>
        </div>
        <div style={{ fontSize: 12, color: '#475569', textAlign: 'center', marginTop: 14 }}>Questions? hello@levl1.io</div>
      </div>
    </div>
  )
}
