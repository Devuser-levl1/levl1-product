import { INTERVIEW_LENGTH_LABEL, PRODUCTS, ROUTES, TALK_TO_US, TRY_LIVE } from '@/config/site'
import type { CTA, Heading, Item, SplitBlock } from './types'

const NAME = PRODUCTS.screen.name

export const agencies = {
  meta: {
    title: 'For recruitment agencies — Levl1',
    description: `Verify technical candidates with ${NAME} before you submit them — and offer verified technical screening to your clients as a premium service.`,
  },
  hero: {
    eyebrow: 'For recruitment agencies',
    title: 'Verify before you submit.',
    highlight: 'before you submit.',
    lead: `${NAME} gives every technical candidate a rigorous, evidence-backed interview before they reach your client — so your shortlist holds up.`,
    primary: TRY_LIVE as CTA,
    secondary: TALK_TO_US as CTA,
  },
  pains: {
    heading: { eyebrow: 'Sound familiar?', title: 'Technical placements live or die on the first submission.' } as Heading,
    items: [
      { title: 'Recruiters drowning in screening calls', body: 'Hours a day on first calls — for technical roles your recruiters can’t fully assess.' },
      { title: 'Clients rejecting under-verified candidates', body: 'A weak technical submission costs you the candidate, and some of the client’s trust.' },
      { title: 'Slow submissions', body: 'By the time a shortlist is checked, the client has seen someone else’s.' },
    ] as Item[],
  },
  splits: [
    {
      eyebrow: 'Verify',
      title: 'Know they can do the job before your client asks.',
      lead: `An AI-led technical interview (${INTERVIEW_LENGTH_LABEL}) with live coding and a whiteboard, and a report with a reason behind every score.`,
      bullets: ['The same structured bar for every candidate', 'Scores your recruiters can explain to a client', 'Integrity flags reviewed by a person — never auto-rejected'],
      link: { label: `Explore ${NAME}`, href: ROUTES.screen },
      visual: 'screenReport',
    },
    {
      eyebrow: 'Scale',
      title: 'Screen more candidates without more calls.',
      lead: 'Candidates book a slot that suits them, around the clock. Interviews run in parallel while your team works the desk.',
      bullets: ['Self-scheduling with consent and reminders by email and WhatsApp', 'Live interview health in the Control Room', 'Results exported to CSV'],
      visual: 'screenControl',
    },
  ] as SplitBlock[],
  premium: {
    heading: { eyebrow: 'A new line of business', title: 'Offer verified technical screening to your own clients as a premium service.', highlight: 'as a premium service.', lead: 'Put a structured, evidence-backed technical interview behind your submissions — and sell it as part of your service.' } as Heading,
  },
  cta: {
    title: 'See Levl1 on one of your client’s roles.',
    primary: TALK_TO_US as CTA,
    secondary: TRY_LIVE as CTA,
  },
}

export const enterprise = {
  meta: {
    title: 'For engineering leaders & TA teams — Levl1',
    description: `Use ${NAME} as round one: AI technical interviews with real code, consistent rubrics, and evidence-backed reports your engineers can trust.`,
  },
  hero: {
    eyebrow: 'For engineering leaders & TA teams',
    title: 'Give your engineers their first-round hours back.',
    highlight: 'first-round hours back.',
    lead: `${NAME} runs round one as a live, AI-led technical interview. Your team reviews an evidence-backed recommendation and spends interview time only on candidates worth it.`,
    primary: TRY_LIVE as CTA,
    secondary: TALK_TO_US as CTA,
  },
  pains: {
    heading: { eyebrow: 'The cost of round one', title: 'Round one is expensive, inconsistent and easy to game.' } as Heading,
    items: [
      { title: 'Engineer hours spent on first rounds', body: 'Senior engineers lose whole afternoons to screens that mostly end in “no”.' },
      { title: 'Inconsistent interviewers', body: 'Different interviewers, different questions, different bars — and notes that are hard to compare.' },
      { title: 'Cheating', body: 'AI assistants make unproctored tests and async assignments unreliable signals.' },
    ] as Item[],
  },
  splits: [
    {
      eyebrow: 'Round one, handled',
      title: 'The same rigorous round for every candidate.',
      lead: 'Questions, a work sample and a rubric drafted from your job description and approved by your team.',
      bullets: ['Adaptive voice interview with live coding and a whiteboard', 'Observe & defend: real code, run against tests, then explained', `${INTERVIEW_LENGTH_LABEL} per candidate`],
      visual: 'screenRoom',
    },
    {
      eyebrow: 'Evidence, not impressions',
      title: 'Reports your engineers can check.',
      lead: 'A recommendation first, a reason behind every score, and integrity kept separate for a person to review.',
      bullets: ['Competencies ranked with reasons', 'Must-haves checked against your rubric', 'Nothing auto-rejected'],
      link: { label: 'How integrity works', href: ROUTES.integrity },
      visual: 'screenIntegrity',
    },
  ] as SplitBlock[],
  readiness: {
    heading: { eyebrow: 'Enterprise readiness', title: 'What we can say today — and nothing more.', lead: 'The facts below are how Levl1 works now. Ask us anything that isn’t listed.' } as Heading,
    items: [
      { icon: 'lock', title: 'Encrypted in transit and at rest', body: 'HTTPS throughout. Interview recordings, photos and transcripts are encrypted before they reach the database.' },
      { icon: 'trash', title: 'Automatic retention', body: 'Recordings and transcripts are purged automatically after fixed periods.' },
      { icon: 'clipboard', title: 'Logged consent', body: 'Separate consents for the AI interview and for recording, each logged with a timestamp.' },
      { icon: 'layers', title: 'Tenant isolation', body: 'Every customer’s data is scoped to its own workspace.' },
      { icon: 'key', title: 'Role-based access', body: 'Control who can see and change what.' },
      { icon: 'userCheck', title: 'Humans decide', body: 'AI scores and flags; your team makes every hiring decision.' },
    ] as Item[],
    link: { label: 'Read about security', href: ROUTES.security } as CTA,
  },
  cta: {
    title: `Pilot ${NAME} on one of your roles.`,
    primary: TALK_TO_US as CTA,
    secondary: TRY_LIVE as CTA,
  },
}
