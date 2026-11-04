import { Lock } from 'lucide-react'
import { PoweredBy } from '@/components/screen/candidate/CandidateShell'

export const dynamic = 'force-dynamic'

// Design-System Pass 3 (group 7): candidate error state on Screen tokens.
export default function CandidateErrorPage({
  searchParams,
}: {
  searchParams: { message?: string }
}) {
  const message =
    searchParams.message ||
    'Something went wrong with your interview link. Please contact your recruiter.'

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, var(--lv-bg) 0%, var(--lv-accent-soft) 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        fontFamily: 'var(--lv-font-sans)',
      }}
    >
      <main
        className="lv-card"
        role="alert"
        style={{
          maxWidth: 440,
          width: '100%',
          padding: 'clamp(28px, 6vw, 40px) clamp(20px, 5vw, 32px)',
          textAlign: 'center',
          boxShadow: 'var(--lv-shadow-md)',
        }}
      >
        <div aria-hidden="true" style={{ width: 44, height: 44, borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--lv-surface-muted)', color: 'var(--lv-text-muted)' }}><Lock size={20} /></div>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--lv-text)', margin: '0 0 10px' }}>
          We hit a snag
        </h1>
        <p style={{ fontSize: 14, color: 'var(--lv-text-body)', lineHeight: 1.6, margin: 0 }}>{message}</p>
        <div style={{ marginTop: 28, fontSize: 13, color: 'var(--lv-text-muted)' }}>
          Need help? Reply to your invitation email or contact your recruiter.
        </div>
      </main>
      <PoweredBy link />
    </div>
  )
}
