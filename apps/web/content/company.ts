import { CONTACT_EMAIL, INTERVIEW_LENGTH_LABEL, ROUTES } from '@/config/site'
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
    description: 'We design role-specific technical question banks and scoring rubrics with your team, then run them in Levl1 Screen.',
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
    description: 'How Levl1 handles customer and candidate data today: encryption in transit, tenant isolation, role-based access, candidate consent and named subprocessors.',
  },
  hero: {
    eyebrow: 'Security',
    title: 'How we handle your data.',
    highlight: 'your data.',
    lead: 'What Levl1 does today, stated plainly. If something you need isn’t listed, ask us.',
  },
  facts: [
    { icon: 'lock', title: 'Encryption in transit', body: 'Levl1 is served over HTTPS, so data is encrypted between your browser and our servers.' },
    { icon: 'layers', title: 'Tenant isolation', body: 'Every customer’s data is scoped to its own workspace. Queries are filtered by workspace on the server.' },
    { icon: 'key', title: 'Role-based access', body: 'Access is controlled by role, and HirePilot keeps an audit log of key actions.' },
    { icon: 'clipboard', title: 'Candidate consent', body: 'Candidates are told the interview is AI-led and give consent before it starts.' },
    { icon: 'fingerprint', title: 'Stored credentials are encrypted', body: 'Credentials you connect, such as a mailbox or job-board account, are encrypted with AES-256-GCM.' },
    { icon: 'userCheck', title: 'Humans make the decisions', body: 'AI scores and integrity flags inform your team. Nothing is auto-rejected.' },
  ] as Item[],
  // TODO(abhijit): confirm and add — encryption at rest (Render-managed Postgres), a defined data-retention policy,
  // "candidate data is not used to train models" (check provider terms), and data residency options. Render nothing until confirmed.
  subprocessors: [
    ['Anthropic', 'AI evaluation and résumé scoring'],
    ['ElevenLabs', 'Interview voice and transcription'],
    ['Twilio', 'WhatsApp messaging'],
    ['Resend', 'Transactional email'],
    ['Render', 'Hosting and managed database'],
  ] as [string, string][],
  contact: `Security questions or a vendor questionnaire? Email ${CONTACT_EMAIL}.`,
}

export const pricingPage = {
  meta: {
    title: 'Pricing — Levl1 Screen and HirePilot',
    description: 'Plans for Screen (credit packs and volume plans) and HirePilot (Launch, Scale and Enterprise, per seat). Contact us for pricing.',
  },
  heading: { eyebrow: 'Pricing', title: 'Plans that fit how you hire.', lead: 'Screen and HirePilot are sold separately. Tell us about your volume and team, and we’ll put together a plan.' } as Heading,
  faq: [
    { q: 'Why don’t you publish prices?', a: 'Plans depend on interview volume, seats and the products you use. Talk to us and we’ll give you a clear quote.' },
    { q: 'Do candidates know they’re being interviewed by AI?', a: 'Yes. Candidates are told the interview is AI-led by email and WhatsApp, and they give consent before it starts.' },
    { q: 'How long does a Screen interview take?', a: `${INTERVIEW_LENGTH_LABEL}, including a short guided tour of the interface.` },
    { q: 'Does the AI make hiring decisions?', a: 'No. Screen scores and flags; your team decides. Integrity flags always go to a person, and nothing is auto-rejected.' },
    { q: 'What happens to candidate data?', a: 'It is used to run interviews and produce reports for your team. We don’t sell personal data. The services that process it are listed on our Security page.' },
    { q: 'Is there a free trial?', a: 'HirePilot has a free trial you can start yourself. For Screen, try a demo interview with no sign-up, then talk to us about trying it on your own roles.' },
  ] as FAQItem[],
}

export const demoPage = {
  meta: {
    title: 'Book a demo — Levl1',
    description: 'See Levl1 Screen or HirePilot on your own roles. Or try a demo interview right now, no sign-up.',
  },
  heading: { eyebrow: 'Book a demo', title: 'See Levl1 on your roles.', lead: 'Tell us a little about your hiring and we’ll set up a walkthrough of Screen, HirePilot, or both.' } as Heading,
  gallery: {
    title: 'Can’t wait? Try a demo interview now.',
    body: 'Pick a technical role and talk to Screen by voice in your browser. No sign-up.',
    cta: { label: 'Try a demo interview', href: ROUTES.screenDemo } as CTA,
  },
}
