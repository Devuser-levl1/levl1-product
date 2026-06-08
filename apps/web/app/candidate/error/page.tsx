import Link from 'next/link'

export const dynamic = 'force-dynamic'

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
        background: 'linear-gradient(135deg, #F8FAFC 0%, #F0EBFF 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div
        style={{
          maxWidth: 440,
          width: '100%',
          background: '#fff',
          border: '1px solid #E2E8F0',
          borderRadius: 18,
          padding: '40px 32px',
          textAlign: 'center',
          boxShadow: '0 8px 30px rgba(15,23,42,0.06)',
        }}
      >
        <div style={{ fontSize: 44, marginBottom: 12 }}>🔒</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '0 0 10px' }}>
          We hit a snag
        </h1>
        <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: 0 }}>{message}</p>
        <div style={{ marginTop: 28, fontSize: 12, color: '#94A3B8' }}>
          Need help? Reply to your invitation email or contact your recruiter.
        </div>
      </div>
      <div style={{ marginTop: 24, fontSize: 12, color: '#CBD5E1' }}>
        Powered by <Link href="https://levl1.io" style={{ color: '#94A3B8', fontWeight: 700, textDecoration: 'none' }}>Levl1</Link>
      </div>
    </div>
  )
}
