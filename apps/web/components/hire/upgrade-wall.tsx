'use client'
import { HIRE_PLANS } from '@/lib/hire/plans'
import { requestUpgrade, UPGRADE_EMAIL } from '@/lib/shared/request-upgrade'

// Upgrades are arranged with the team (no self-serve checkout).
export function startHireUpgrade(planId: string) {
  requestUpgrade('HirePilot', HIRE_PLANS[planId as keyof typeof HIRE_PLANS]?.name ?? planId)
}

export function HireUpgradeWall({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 28, width: 420, maxWidth: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Upgrade to continue</div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#475569' }}>×</button>
        </div>
        <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: '10px 0 20px' }}>{message}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => startHireUpgrade('GROWTH')} style={{ padding: '13px', borderRadius: 10, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Request Growth <span style={{ fontSize: 11, opacity: 0.85 }}>· recommended</span></button>
          <button onClick={() => startHireUpgrade('STARTER')} style={{ padding: '13px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#fff', color: '#0F172A', fontWeight: 700, cursor: 'pointer' }}>Request Starter</button>
          <a href="/hire/settings/billing" style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#6D28D9', textDecoration: 'none', padding: 4 }}>See all plans</a>
        </div>
        <div style={{ fontSize: 12, color: '#475569', textAlign: 'center', marginTop: 14 }}>Our team sets up your plan and invoices you directly · {UPGRADE_EMAIL}</div>
      </div>
    </div>
  )
}
