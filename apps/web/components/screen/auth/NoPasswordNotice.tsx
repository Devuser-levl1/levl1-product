import Link from 'next/link'
import { ScreenLogo } from '@/components/screen/brand/ScreenLogo'

// Screen sign-in is email + one-time code. The old password-reset pages now
// explain that instead of collecting a password nothing can use.
export function NoPasswordNotice({ title }: { title: string }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--lv-surface-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'var(--lv-font-sans)' }}>
      <main className="lv-card" style={{ width: '100%', maxWidth: 420, padding: 32, boxShadow: 'none' }}>
        <div style={{ marginBottom: 24 }}><ScreenLogo height={38} tone="auto" /></div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--lv-text)', margin: '0 0 8px' }}>{title}</h1>
        <p style={{ fontSize: 14, color: 'var(--lv-text-body)', lineHeight: 1.6, margin: '0 0 20px' }}>
          Screen doesn&apos;t use passwords. You sign in with a one-time code sent to your work email — so there&apos;s nothing to reset. If you can&apos;t receive codes at that address any more, ask a workspace admin to invite your new email.
        </p>
        <Link href="/interviews/login" className="lv-btn lv-btn--primary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 40, textDecoration: 'none' }}>Sign in with an email code</Link>
      </main>
    </div>
  )
}
