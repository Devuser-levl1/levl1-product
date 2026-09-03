import type { Metadata } from 'next'
import { Container } from '@/components/marketing/ui'
import { Doorway } from '@/components/marketing/hp'

export const metadata: Metadata = {
  title: 'HirePilot — the AI-native ATS + CRM',
  description: 'Built for how you hire. Choose your path — for staffing agencies, or for in-house talent teams.',
  openGraph: { title: 'HirePilot — the AI-native ATS + CRM that does the work', description: 'Built for how you hire. Choose your path.' },
}

export default function HirePilotRouter() {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', minHeight: '86vh', display: 'flex', alignItems: 'center', paddingTop: 120, paddingBottom: 72, background: 'linear-gradient(180deg,#F5F3FF,#fff)' }}>
      {/* split violet panels */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', pointerEvents: 'none' }}>
        <div className="mk-blob" style={{ width: 520, height: 520, background: '#A78BFA', top: -120, left: -100 }} />
        <div className="mk-blob" style={{ width: 480, height: 480, background: '#60A5FA', bottom: -140, right: -90 }} />
      </div>
      <Container style={{ position: 'relative' }}>
        <div style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto 44px' }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#7C3AED', marginBottom: 16 }}>HirePilot</div>
          <h1 className="mk-h1">The AI-native ATS + CRM<br />that does the work.</h1>
          <p style={{ fontSize: 18.5, color: '#475569', lineHeight: 1.6, margin: '20px auto 0', maxWidth: 560 }}>
            Built for how you hire. <strong>Are you a staffing agency, or an in-house team?</strong> Choose your path.
          </p>
        </div>

        <div className="mk-grid-2" style={{ maxWidth: 900, margin: '0 auto', gap: 24 }}>
          <Doorway
            href="/hirepilot/agencies" side="left" label="For staffing agencies"
            title="Run every client, role & placement →"
            points={['Client CRM, deals & submissions', 'Receivables that chase themselves', 'Source, submit, place — Lev drives it']}
          />
          <Doorway
            href="/hirepilot/enterprise" side="right" label="For in-house teams" dark
            title="Fill your own roles, faster →"
            points={['AI scoring on every applicant', 'First-round interviews at scale', 'ATS-agnostic — works with your stack']}
          />
        </div>
      </Container>
    </section>
  )
}
