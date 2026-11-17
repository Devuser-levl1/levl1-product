import Link from 'next/link'
import { LegalPage, H, P, UL } from '@/components/marketing/legal'
import { pageMetadata } from '@/lib/marketing/metadata'
import { CONTACT_EMAIL, LEGAL_ENTITY } from '@/config/site'

export const metadata = pageMetadata({ title: 'Privacy Policy — Levl1', description: `How ${LEGAL_ENTITY} collects, uses and protects personal data.`, path: '/privacy', og: 'legal' })

export default function Privacy() {
  return <LegalPage title="Privacy Policy" updated="November 2026">
    <P>Levl1 — this website and the hiring software and services we provide through it — is provided by {LEGAL_ENTITY} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). {LEGAL_ENTITY} is the data controller for the personal data described in this policy. This policy explains what we collect, why, and the rights you and candidates have.</P>
    <H>Data we collect</H>
    <UL items={[
      'Account data: name, work email, company, role and usage.',
      'Website enquiries: details you submit through our contact, demo and early-access forms (name, work email, company, role and your message).',
      'Candidate data: name, email, phone, résumé text, application answers and — where an AI interview is conducted — a photo, voice recording, transcript, responses, code, whiteboard content, integrity events and an evaluation report.',
      'Operational data: logs, billing records and security events.',
    ]} />
    <H>How we use it</H>
    <P>To run interviews and hiring workflows, produce AI scores and evidence-based reports, respond to enquiries, send transactional emails and WhatsApp messages, process billing, and secure the service. We do not sell personal data.</P>
    <H>AI interviews and consent</H>
    <P>Candidates are told before an interview that it is conducted by an AI interviewer. They give two separate consents — one to the AI-led interview, and one to recording (photo, audio and camera monitoring). Each consent is logged with a timestamp and the version of the notice shown; a withdrawal of consent is logged too. Interview audio and transcripts are processed by our AI providers to produce scores tied to evidence. AI outputs inform human decisions: integrity flags are always reviewed by a person and never cause automatic rejection.</P>
    <H>Security</H>
    <P>Data is encrypted in transit. Candidate photos, audio recordings, transcripts and responses are encrypted at rest (AES-256-GCM) before they are stored. Access is limited by tenant and by role. See our <Link href="/security" className="font-medium text-mk-accent-text underline-offset-2 hover:underline">Security page</Link>.</P>
    <H>Retention</H>
    <P>Interview recordings and photos, and transcripts and responses, are deleted automatically after fixed retention periods that are shown to candidates before the interview. The evaluation report (scores and short quoted highlights) stays with the candidate record until the hiring organisation deletes the candidate. Other data is kept while an account is active or as needed to provide the service, then deleted or anonymised on request, subject to legal obligations.</P>
    <H>Candidate rights</H>
    <P>Candidates may request access to, correction of, or deletion of their data via the employer or agency that invited them, or by contacting us.</P>
    <H>Sharing &amp; subprocessors</H>
    <P>We share data only with subprocessors that power the service, under contract: Anthropic (AI evaluation), ElevenLabs (interview voice and transcription), Judge0 via RapidAPI (running candidate code), Twilio (WhatsApp), Resend (email), Cashfree (payments) and Render (hosting).</P>
    <H>International transfers</H><P>Data may be processed outside your country using appropriate safeguards.</P>
    <H>Contact</H><P>Questions or requests: {LEGAL_ENTITY}, {CONTACT_EMAIL}.</P>
  </LegalPage>
}
