'use client'

import { useState } from 'react'
import { X, CheckCircle2, Zap, Star } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import toast from 'react-hot-toast'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '₹15,000',
    period: '/month',
    interviews: 50,
    features: [
      '50 AI interviews / month',
      '5 active positions',
      'AI question generation',
      'Full evaluation reports',
      'Email support',
    ],
    popular: false,
    cta: 'Upgrade to Starter',
    color: '#4F46E5',
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '₹45,000',
    period: '/month',
    interviews: 200,
    features: [
      '200 AI interviews / month',
      'Unlimited positions',
      'White-label reports',
      'Multi-client management',
      'L2 handoff workflow',
      'Priority support',
    ],
    popular: true,
    cta: 'Upgrade to Professional',
    color: '#7C3AED',
  },
]

export default function UpgradeWallModal() {
  const { showUpgradeWall, setShowUpgradeWall, agencyPlan } = useAppStore()
  const [loading, setLoading] = useState<string | null>(null)

  if (!showUpgradeWall) return null

  async function handleUpgrade(planId: string) {
    setLoading(planId)
    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Could not create payment order')
        setLoading(null)
        return
      }

      // Use Cashfree JS SDK if available, otherwise redirect
      const cf = (window as unknown as Record<string, unknown>).Cashfree
      if (cf && typeof cf === 'function') {
        const cashfree = (cf as (opts: unknown) => { checkout: (opts: unknown) => void })({ mode: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox' })
        cashfree.checkout({
          paymentSessionId: data.paymentSessionId,
          redirectTarget: '_modal',
        })
      } else {
        // Fallback: redirect to Cashfree hosted page via return_url logic
        // In practice, Cashfree SDK should always be loaded via layout.tsx script
        toast.error('Payment SDK not loaded. Please refresh and try again.')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  const isExpired = agencyPlan?.plan === 'trial' && (agencyPlan.interviewsUsed ?? 0) >= (agencyPlan.interviewsLimit ?? 5)
  const title = isExpired ? 'Trial Exhausted — Upgrade to Continue' : 'Unlock Full Access'
  const subtitle = isExpired
    ? "You've used all 5 free trial interviews. Upgrade to keep screening candidates."
    : 'Scale your candidate screening with a paid plan.'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15,10,46,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !isExpired) setShowUpgradeWall(false) }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          width: '100%',
          maxWidth: 720,
          boxShadow: '0 40px 100px rgba(79,70,229,0.22)',
          overflow: 'hidden',
          border: '1px solid #E2E8F0',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
            padding: '28px 32px 24px',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Zap size={20} color="#fff" fill="#fff" />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: '#fff' }}>{title}</span>
          </div>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.80)', lineHeight: 1.6 }}>{subtitle}</p>

          {!isExpired && (
            <button
              onClick={() => setShowUpgradeWall(false)}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                color: '#fff',
                display: 'flex',
                padding: 6,
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Plan cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 20,
            padding: '28px 32px',
          }}
          className="upgrade-grid"
        >
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              style={{
                border: plan.popular ? '2px solid #7C3AED' : '1px solid #E2E8F0',
                borderRadius: 14,
                padding: '22px 20px',
                position: 'relative',
                background: plan.popular ? 'rgba(124,58,237,0.02)' : '#fff',
              }}
            >
              {plan.popular && (
                <div
                  style={{
                    position: 'absolute',
                    top: -12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#7C3AED',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 12px',
                    borderRadius: 100,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Star size={10} fill="#fff" />
                  Most Popular
                </div>
              )}

              <div style={{ fontSize: 15, fontWeight: 800, color: plan.color, fontFamily: 'var(--font-display)', marginBottom: 4 }}>{plan.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: 4 }}>
                <span style={{ fontSize: 26, fontWeight: 800, color: '#1E293B', fontFamily: 'var(--font-display)' }}>{plan.price}</span>
                <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500 }}>{plan.period}</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 16, fontWeight: 500 }}>
                {plan.interviews} AI interviews / month
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {plan.features.map((f) => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                    <CheckCircle2 size={14} color={plan.color} style={{ marginTop: 1, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#475569', fontWeight: 500, lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={loading === plan.id}
                style={{
                  width: '100%',
                  background: loading === plan.id ? '#94A3B8' : plan.popular ? '#7C3AED' : '#4F46E5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 9,
                  padding: '11px 16px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: loading === plan.id ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-sans)',
                  boxShadow: loading === plan.id ? 'none' : `0 4px 14px rgba(124,58,237,0.25)`,
                  transition: 'all 0.2s',
                }}
              >
                {loading === plan.id ? 'Processing…' : plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div
          style={{
            padding: '0 32px 24px',
            textAlign: 'center',
            fontSize: 12,
            color: '#94A3B8',
          }}
        >
          Secure payment via Cashfree · Cancel anytime · GST applicable
        </div>
      </div>

      <style>{`
        @media (max-width: 600px) {
          .upgrade-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
