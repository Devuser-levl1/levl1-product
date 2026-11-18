import { CONTACT_EMAIL, INTERVIEW_LENGTH_LABEL, PRODUCTS, ROUTES, TRY_LIVE } from '@/config/site'
import type { CTA, FAQItem, Heading, Item, Step } from './types'

const TALK: CTA = { label: 'Talk to us', href: ROUTES.demo }

export const iaas = {
  meta: {
    title: 'Interview-as-a-Service — Levl1',
    description: 'Expert interviewers run your later technical rounds using Levl1’s interview tooling, so your engineers can stay on the roadmap.',
  },
  hero: {
    eyebrow: 'Services',
    title: 'Interview-as-a-Service.',
    highlight: 'as-a-Service.',
    lead: 'Expert interviewers run your later technical rounds using Levl1’s tooling — so your engineers stay on the roadmap.',
    primary: TALK,
  },
  items: [
    { icon: 'users', title: 'Experienced interviewers', body: 'Practitioners matched to the role and level you’re hiring for.' },
    { icon: 'list', title: 'Your rubric, applied consistently', body: 'We agree the bar with you first, then every round is run against it.' },
    { icon: 'file', title: 'Structured written feedback', body: 'Clear, evidence-based notes your hiring managers can act on.' },
  ] as Item[],
  steps: {
    heading: { eyebrow: 'How it works', title: 'Simple to start.' } as Heading,
    items: [
      { title: 'Tell us the role', body: 'Level, stack and what “great” looks like for your team.' },
      { title: 'Agree the rubric', body: 'We align on questions, scoring and the interviewer profile.' },
      { title: 'We run the rounds', body: 'You get structured feedback after every interview.' },
    ] as Step[],
  },
  cta: { title: 'Need more interview capacity?', primary: TALK },
}

export const customAssessments = {
  meta: {
    title: 'Custom Assessments — Levl1',
    description: 'We design role-specific technical question banks and scoring rubrics with your team, then run them in Screen.',
  },
  hero: {
    eyebrow: 'Services',
    title: 'Custom assessments, designed with your team.',
    highlight: 'designed with your team.',
    lead: 'We build role-specific question banks and scoring rubrics with your engineers, so Screen tests for exactly what your roles need.',
    primary: TALK,
  },
  items: [
    { icon: 'puzzle', title: 'Role-specific question banks', body: 'Built around your stack, your systems and the problems your team actually solves.' },
    { icon: 'sliders', title: 'Rubrics that match your bar', body: 'Clear scoring criteria for each competency, at the level you hire for.' },
    { icon: 'handshake', title: 'Calibrated with your engineers', body: 'We work with your interviewers so the rubric reflects how they judge.' },
    { icon: 'badge', title: 'Yours to approve', body: 'Nothing goes live until your team signs it off.' },
  ] as Item[],
  steps: {
    heading: { eyebrow: 'How it works', title: 'From role to rubric.' } as Heading,
    items: [
      { title: 'Discovery', body: 'We learn the role, the team and what separates strong from adequate.' },
      { title: 'Design', body: 'We draft the question bank and rubric with your engineers.' },
      { title: 'Run in Screen', body: 'Approved questions run in every Screen interview for that role.' },
    ] as Step[],
  },
  cta: { title: 'Have a hard-to-assess role?', primary: TALK },
}

export const security = {
  meta: {
    title: 'Security & data handling — Levl1',
    description: 'How Levl1 handles candidate and customer data today: encryption in transit and at rest, automatic retention, logged consent, tenant isolation, role-based access and named subprocessors.',
  },
  hero: {
    eyebrow: 'Security',
    title: 'How we handle your data.',
    highlight: 'your data.',
    lead: 'What Levl1 does today, stated plainly. If something you need isn’t listed, ask us.',
  },
  facts: [
    { icon: 'lock', title: 'Encrypted in transit', body: 'Levl1 is served over HTTPS, so data is encrypted between the browser and our servers.' },
    { icon: 'fingerprint', title: 'Interview data encrypted at rest', body: 'Candidate photos, audio recordings, transcripts and responses are encrypted with AES-256-GCM before they reach the database.' },
    { icon: 'trash', title: 'Automatic retention', body: 'Recordings and transcripts are purged automatically after fixed periods, which are shown to candidates.' },
    { icon: 'clipboard', title: 'Logged consent', body: 'Separate consents for the AI interview and for recording, each logged with a timestamp and notice version. Withdrawal is logged too.' },
    { icon: 'layers', title: 'Tenant isolation', body: 'Every customer’s data is scoped to its own workspace. Queries are filtered by workspace on the server.' },
    { icon: 'key', title: 'Role-based access', body: 'Access is controlled by role, so people see only what their role allows.' },
    { icon: 'userCheck', title: 'Humans make the decisions', body: 'AI scores and integrity flags inform your team. Nothing is auto-rejected.' },
    { icon: 'server', title: 'Keys stay on the server', body: 'Voice and AI provider keys are server-only. Interview voice sessions use single-use tokens.' },
  ] as Item[],
  // TODO(abhijit): confirm and add — "candidate data is not used to train models" (check provider terms)
  // and data residency options. Render nothing until confirmed.
  subprocessors: [
    ['Anthropic', 'AI evaluation and scoring'],
    ['ElevenLabs', 'Interview voice and transcription'],
    ['Judge0 (via RapidAPI)', 'Runs candidate code in work samples'],
    ['Twilio', 'WhatsApp messaging'],
    ['Resend', 'Transactional email'],
    ['Cashfree', 'Payments and billing'],
    ['Render', 'Hosting and managed database'],
  ] as [string, string][],
  contact: `Security questions or a vendor questionnaire? Email ${CONTACT_EMAIL}.`,
}

export const pricingPage = {
  meta: {
    title: 'Pricing — Levl1',
    description: `Plans for ${PRODUCTS.screen.name}: pay-as-you-go credit packs and volume plans. Contact us for pricing.`,
  },
  heading: { eyebrow: 'Pricing', title: 'Plans that fit how you hire.', lead: `${PRODUCTS.screen.name} is available now. Tell us about your interview volume and we’ll put together a plan.` } as Heading,
  faq: [
    { q: 'Why don’t you publish prices?', a: 'Plans depend on interview volume and how you’ll use them. Talk to us and we’ll give you a clear quote.' },
    { q: 'Do candidates know they’re being interviewed by AI?', a: 'Yes. Candidates are told the interview is AI-led by email and WhatsApp, and give separate, logged consent to the interview and to recording.' },
    { q: 'How long does an interview take?', a: `${INTERVIEW_LENGTH_LABEL}, including a short guided tour of the interface.` },
    { q: 'Does the AI make hiring decisions?', a: 'No. It recommends and flags; your team decides. Integrity flags always go to a person, and nothing is auto-rejected.' },
    { q: 'What happens to candidate data?', a: 'It’s used to run interviews and produce reports for your team. Recordings and transcripts are encrypted at rest and purged automatically after fixed periods. We don’t sell personal data.' },
    { q: 'Can we try it first?', a: 'Yes — take a live demo interview with no sign-up, then talk to us about trying it on your own roles.' },
    { q: `When will ${PRODUCTS.takeHome.name} and ${PRODUCTS.liveInterview.name} be available?`, a: 'Both are in development. Join early access on their pages and you’ll hear first — and help shape them.' },
  ] as FAQItem[],
}

export const demoPage = {
  meta: {
    title: 'Talk to us — Levl1',
    description: `See ${PRODUCTS.screen.name} on your own roles — or take a live interview right now, no sign-up.`,
  },
  heading: { eyebrow: 'Talk to us', title: 'See Levl1 on your roles.', lead: 'Tell us a little about your technical hiring and we’ll set up a walkthrough on one of your job descriptions.' } as Heading,
  gallery: {
    title: `Can’t wait? Try ${PRODUCTS.screen.name} live now.`,
    body: 'Pick a technical role and talk it through by voice in your browser. No sign-up.',
    cta: TRY_LIVE as CTA,
  },
}
