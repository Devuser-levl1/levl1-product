import { loadCandidateInterview } from '@/lib/candidatePortal'

export const dynamic = 'force-dynamic'

export default async function CandidateCompletePage({
  params,
}: {
  params: { interviewId: string }
}) {
  const result = await loadCandidateInterview(params.interviewId)

  // Even on a bad link we show a graceful thank-you rather than an error here.
  const data = result.ok ? result.data : null
  const brand = data?.brandColor ?? '#4F46E5'

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #F0FFF4 0%, #F0EBFF 100%)',
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
          maxWidth: 480,
          width: '100%',
          background: '#fff',
          border: '1px solid #E2E8F0',
          borderRadius: 18,
          padding: '44px 36px',
          textAlign: 'center',
          boxShadow: '0 8px 30px rgba(15,23,42,0.06)',
        }}
      >
        <div
          style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
            background: 'rgba(16,185,129,0.12)', color: '#10B981',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
          }}
        >
          ✓
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: '0 0 12px' }}>
          Thank you{data ? `, ${data.candidateFirstName}` : ''}!
        </h1>

        <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.7, margin: 0 }}>
          {data ? (
            <>
              Your interview for <strong>{data.positionTitle}</strong> at{' '}
              <strong>{data.company}</strong> is complete.
            </>
          ) : (
            'Your interview is complete.'
          )}
        </p>

        <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.7, marginTop: 14 }}>
          The hiring team will review your responses and be in touch within{' '}
          <strong>2–3 business days</strong>.
        </p>

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #F1F5F9' }}>
          {data?.agencyLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.agencyLogoUrl} alt={data.agencyName} height={36} style={{ objectFit: 'contain', maxWidth: 160 }} />
          ) : (
            data && (
              <div style={{ fontSize: 14, fontWeight: 700, color: brand }}>{data.agencyName}</div>
            )
          )}
          <div style={{ fontSize: 12, color: '#CBD5E1', marginTop: 8 }}>Powered by Levl1</div>
        </div>
      </div>
    </div>
  )
}
