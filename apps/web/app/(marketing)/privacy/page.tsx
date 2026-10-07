import Link from 'next/link'
import { LegalPage, H, P, UL } from '@/components/marketing/legal'
import { pageMetadata } from '@/lib/marketing/metadata'
import { CONTACT_EMAIL, LEGAL_ENTITY } from '@/config/site'

export const metadata = pageMetadata({ title: 'Privacy Policy — Levl1', description: `How ${LEGAL_ENTITY} collects, uses and protects personal data in Levl1.`, path: '/privacy', og: 'legal' })

export default function Privacy() {
  return <LegalPage title="Privacy Policy" updated="October 2026">
    <P>Levl1 (including Levl1 Screen and HirePilot) is provided by {LEGAL_ENTITY} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). {LEGAL_ENTITY} is the data controller for the personal data described in this policy. This policy explains what we collect, why, and the rights you and candidates have.</P>
    <H>Data we collect</H>
    <UL items={['Account data: name, work email, company, role and usage.', 'Candidate data: name, email, phone, résumé text, application answers and — where an AI interview is conducted — voice recording, transcript, code, whiteboard content, integrity events and an evaluation report.', 'Operational data: logs, billing records and security events.']} />
    <H>How we use it</H>
    <P>To run your hiring pipeline, produce AI scores and evidence-based reports, send transactional and (when you choose to) campaign emails and WhatsApp messages, process billing, and secure the service. We do not sell personal data.</P>
    <H>AI processing of interview data</H>
    <P>Interview audio and transcripts are processed by our AI providers to produce scores tied to evidence. Candidates are told before an interview that it is AI-led, and consent is captured. AI outputs inform human decisions; integrity flags are always reviewed by a person and never cause automatic rejection.</P>
    <H>Retention</H>
    <P>We retain data while your account is active or as needed to provide the service, then delete or anonymise it on request, subject to legal obligations.</P>
    <H>Candidate rights</H>
    <P>Candidates may request access to, correction of, or deletion of their data via the employer or agency that invited them, or by contacting us.</P>
    <H>Sharing &amp; subprocessors</H>
    <P>We share data only with subprocessors that power the service (Anthropic, ElevenLabs, Twilio, Resend, Cashfree, Render) under contract. See our <Link href="/security" className="font-semibold text-mk-purple underline-offset-2 hover:underline">Security page</Link>.</P>
    <H>International transfers</H><P>Data may be processed outside your country using appropriate safeguards.</P>
    <H>Contact</H><P>Questions or requests: {LEGAL_ENTITY}, {CONTACT_EMAIL}.</P>
  </LegalPage>
}
