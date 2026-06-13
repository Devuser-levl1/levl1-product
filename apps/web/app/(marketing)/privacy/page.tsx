import type { Metadata } from 'next'
import { LegalPage, H, P, UL } from '@/components/marketing/legal'
export const metadata: Metadata = { title: 'Privacy Policy — Levl1' }
export default function Privacy() {
  return <LegalPage title="Privacy Policy" updated="June 2026">
    <P>Levl1 provides AI-assisted hiring and candidate evaluation. This policy explains what we collect, why, and the rights you and candidates have.</P>
    <H>Data we collect</H>
    <UL items={['Recruiter/account data: name, work email, company, role, usage.', 'Candidate data: name, email, phone, resume text, application answers, and — where an AI interview is conducted — voice recording, transcript, code, and an evaluation report.', 'Operational data: logs, billing records, and security events.']} />
    <H>How we use it</H>
    <P>To run your hiring pipeline, generate AI scores and evidence-based reports, send transactional and (with your action) campaign emails, process billing, and secure the service. We do not sell personal data.</P>
    <H>AI processing of interview data</H>
    <P>Interview audio and transcripts are processed by our AI provider to produce scores tied to evidence. Candidates are informed before an interview and consent is captured.</P>
    <H>Retention</H>
    <P>We retain data while your account is active or as needed to provide the service, then delete or anonymise it on request, subject to legal obligations.</P>
    <H>Candidate rights</H>
    <P>Candidates may request access to, correction of, or deletion of their data via the controlling employer/agency or by contacting us. We support data-subject requests under GDPR and similar laws.</P>
    <H>Sharing & subprocessors</H>
    <P>We share data only with subprocessors that power the service (Anthropic, ElevenLabs, Resend, Cashfree, Render) under contract. See our <a href="/security" style={{ color: "#6D28D9" }}>Security page</a>.</P>
    <H>International transfers</H><P>Data may be processed outside your country using appropriate safeguards.</P>
    <H>Contact</H><P>Questions or requests: hello@levl1.io.</P>
  </LegalPage>
}
