import { INTERVIEW_LENGTH_LABEL, PRODUCTS, ROUTES, TALK_TO_US, TRY_LIVE, type ProductKey } from '@/config/site'
import { DEMO_PERSONAS } from '@/lib/screen/demo/personas'
import type { ComparisonRow, CTA, Heading, Item, Pillar, TabItem, TimelineStep } from './types'
import type { Evidence } from '@/components/marketing/sections/hero'

const NAME = PRODUCTS.screen.name
const demoMins = DEMO_PERSONAS.map((p) => p.durationMin)
const DEMO_LENGTH = Math.min(...demoMins) === Math.max(...demoMins) ? `${Math.min(...demoMins)} minutes` : `${Math.min(...demoMins)}–${Math.max(...demoMins)} minutes`

/** Role chips that open the live demo for that role. */
export const DEMO_ROLE_CHIPS: CTA[] = DEMO_PERSONAS.map((p) => ({ label: p.category, href: `${ROUTES.screenDemo}?role=${p.slug}#try-live` }))
export const DEMO_MICROCOPY = `No sign-up · ${DEMO_LENGTH} · microphone needed`

export const home = {
  meta: {
    title: 'Levl1 — Interviews that show their work',
    description: `${NAME} runs the technical first round — live voice, real code, a whiteboard — and hands back the evidence, not just a score.`,
  },
  hero: {
    display: true,
    title: 'Interviews that show their work.',
    lead: `${NAME} runs the technical first round — live voice, real code, a whiteboard — and hands back the evidence, not just a score.`,
    chipsLabel: `Pick a role and talk to ${NAME} now:`,
    chips: DEMO_ROLE_CHIPS,
    primary: TRY_LIVE as CTA,
    secondary: TALK_TO_US as CTA,
    microcopy: DEMO_MICROCOPY,
    evidence: [
      { time: '06:40', text: 'tests 4/4 passed', tone: 'pass' },
      { time: '12:02', text: 'flag · second face, 6s', tone: 'flag' },
    ] as Evidence[],
  },
  comparison: {
    heading: { eyebrow: 'Why teams switch', title: 'Your first round costs the most and tells you the least.' } as Heading,
    withLabel: `With ${NAME}`,
    rows: [
      { today: 'Senior engineers spend afternoons on first rounds that mostly end in “no”.', withScreen: 'Your engineers meet the shortlist, not the pipeline.' },
      { today: 'Assistants and overlays feed answers live — a good score may not be the candidate’s.', withScreen: 'Behaviour consistent with outside help is flagged with evidence. A person decides.' },
      { today: 'Keyword matching passes people who say the right words.', withScreen: 'Candidates write and run real code, then defend their decisions.' },
      { today: 'A bare score won’t survive the debrief.', withScreen: 'Every score comes with its reason and the evidence behind it.' },
      { today: 'Scheduling first rounds takes days of back-and-forth.', withScreen: 'Candidates book any slot, around the clock.' },
    ] as ComparisonRow[],
  },
  timeline: {
    heading: { eyebrow: 'How it works', title: 'One interview, minute by minute.', lead: 'What a candidate goes through — and what your team gets out of each moment.' } as Heading,
    steps: [
      { time: 'Before', title: 'Your bar, approved', body: 'Questions, a work sample and a must-have rubric are drafted from your JD. Your team approves them.', evidence: 'rubric approved', tone: 'neutral' },
      { time: '00:00', title: 'Consent first', body: 'The candidate agrees to an AI-led interview and, separately, to recording.', evidence: 'consent · 2 of 2 logged', tone: 'neutral' },
      { time: '02:10', title: 'A guided start', body: 'A short tour of the room before the first question.', evidence: 'tour complete', tone: 'neutral' },
      { time: '06:40', title: 'Real code', body: 'A work sample in the coding workspace, run against your tests.', evidence: 'tests 4/4 passed', tone: 'pass' },
      { time: '12:02', title: 'A flag, with evidence', body: 'A second face appears for six seconds. Logged for a person to review.', evidence: 'flag · second face, 6s', tone: 'flag' },
      { time: '30:00', title: 'The recommendation', body: 'Advance or not — with the reason behind every score.', evidence: 'advance to panel', tone: 'pass' },
    ] as TimelineStep[],
    caption: `An illustrative interview of ${INTERVIEW_LENGTH_LABEL}. Timings vary by role and interview mode.`,
  },
  pillars: {
    heading: { eyebrow: 'Why teams trust it', title: 'Proof, not promises.' } as Heading,
    items: [
      {
        eyebrow: 'Evidence, not guesses',
        title: 'See the call. Check the reasoning.',
        promise: 'The report leads with a recommendation, then shows exactly why — so a hiring manager can agree or disagree in minutes.',
        proof: [
          'Recommendation first, then competencies ranked with a reason for each',
          'Must-haves checked against your rubric, plus communication and culture-fit',
          'Strengths, concerns and transcript highlights',
          'Full session playback when you want to see it yourself',
        ],
        visual: 'screenReport',
      },
      {
        eyebrow: 'Catches what others miss',
        title: 'Flags with evidence. A person decides.',
        promise: `${NAME} watches for behaviour consistent with outside help — and attaches the evidence to every flag.`,
        proof: [
          'Tab switches, fullscreen exits, screen-share drops, no face or multiple faces',
          'Reading-gaze and read-aloud patterns consistent with overlay assistants',
          'Paste and response-latency anomalies, and a second voice in the recording',
          'Integrity is scored separately from competency',
        ],
        note: 'Overlay assistants are inferred from signals, not detected as specific apps. Every flag goes to human review and nothing is auto-rejected — no system catches everything.',
        link: { label: 'How integrity works', href: ROUTES.integrity },
        visual: 'screenIntegrity',
      },
    ] as Pillar[],
  },
  audience: {
    heading: { eyebrow: 'Built for both', title: 'One interview. Three teams that rely on it.' } as Heading,
    items: [
      {
        id: 'eng', label: 'Engineering leaders', shortLabel: 'Eng leaders', visual: 'snipCode',
        title: 'Deeper signal, defensible decisions.',
        body: 'See how candidates actually work — and spend your engineers’ time only on the shortlist.',
        bullets: ['Watch candidates work, not just talk', 'Every score explained — ready for your debrief', 'Your rubric, approved by your team'],
      },
      {
        id: 'ta', label: 'Recruiters & TA', shortLabel: 'Recruiters', visual: 'screenControl',
        title: 'More first rounds, no more calendar.',
        body: 'Interviews run in parallel while you work the rest of the funnel.',
        bullets: ['Candidates self-schedule, around the clock', 'Live interview health in the Control Room — without joining', 'Consent, invites and reminders by email and WhatsApp', 'Export results to CSV'],
      },
      {
        id: 'agencies', label: 'Agencies', visual: 'snipLogistics',
        title: 'Verify before you submit.',
        body: 'Put a structured technical interview behind every submission — with the logistics already covered.',
        bodyShort: 'A structured technical interview behind every submission.',
        bullets: ['The same bar for every candidate', 'Notice period, location and work authorization captured', 'Scores your recruiters can explain to a client'],
      },
    ] as TabItem[],
  },
  funnel: {
    heading: { eyebrow: 'One funnel', title: 'Stage one of three.', lead: `${NAME} is live. ${PRODUCTS.takeHome.name} and ${PRODUCTS.liveInterview.name} are in development.` } as Heading,
    details: {
      screen: 'Live AI technical interviews with integrity checks and evidence reports.',
      takeHome: 'A real-world task in a real IDE, evaluated against your rubric and tests.',
      liveInterview: 'Your interviewers, with an AI copilot for follow-ups, notes and scorecards.',
    } as Record<ProductKey, string>,
  },
  trust: {
    heading: { eyebrow: 'Trust', title: 'Consent first. Encrypted. Auto-deleted.' } as Heading,
    items: [
      { icon: 'clipboard', title: 'Consent, logged', body: 'Separate consent for the AI interview and for recording, both logged.' },
      { icon: 'lock', title: 'Encrypted', body: 'In transit, and recordings and transcripts at rest.' },
      { icon: 'trash', title: 'Auto-deleted', body: 'Recordings and transcripts are purged after fixed periods shown to candidates.' },
      { icon: 'userCheck', title: 'Humans decide', body: 'The AI recommends and flags. Your team decides.' },
    ] as Item[],
    link: { label: 'Read about security', href: ROUTES.security } as CTA,
  },
  cta: {
    title: 'Hear it for yourself.',
    lead: `Pick a role and talk to ${NAME} in your browser — no sign-up, ${DEMO_LENGTH}.`,
    primary: TRY_LIVE as CTA,
    secondary: TALK_TO_US as CTA,
  },
}
