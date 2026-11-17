import { INTERVIEW_LENGTH_LABEL, PRODUCTS, ROUTES, TALK_TO_US, TRY_LIVE } from '@/config/site'
import type { CTA, Heading, Item, SplitBlock, Step } from './types'

const NAME = PRODUCTS.screen.name

export const screen = {
  meta: {
    title: `${NAME} — AI technical interviews — Levl1`,
    description: `${NAME} runs an adaptive spoken technical interview with live coding, a whiteboard and follow-ups (${INTERVIEW_LENGTH_LABEL}), flags behaviour consistent with outside help, and delivers an evidence-backed recommendation.`,
  },
  hero: {
    badge: `Stage ${PRODUCTS.screen.stage} · Available now`,
    badgeTone: 'live' as const,
    title: 'A technical interviewer that never gets tired, rushed, or fooled by a good story.',
    highlight: 'or fooled by a good story.',
    lead: `${NAME} runs a live, spoken technical interview — with real code, a whiteboard and follow-ups on the candidate’s own answers — then hands your team a recommendation with the evidence behind it.`,
    primary: TRY_LIVE as CTA,
    secondary: TALK_TO_US as CTA,
    points: [INTERVIEW_LENGTH_LABEL, 'Voice, live coding and whiteboard', 'Questions and rubric your team approves'],
  },
  interview: {
    heading: { eyebrow: 'Inside the interview', title: 'A real technical round, not a quiz.', lead: 'It holds a conversation, watches the candidate work, and adapts as it goes.' } as Heading,
    items: [
      { icon: 'mic', title: 'Adaptive voice', body: 'A natural spoken interview that adjusts depth as it goes. Candidates can interrupt and push back.' },
      { icon: 'terminal', title: 'Observe & defend', body: 'A real task in a coding workspace. The code runs against tests, then the candidate defends their decisions.' },
      { icon: 'pen', title: 'Whiteboard', body: 'For system design — the candidate sketches, the interviewer asks about the trade-offs.' },
      { icon: 'search', title: 'Follow-ups on their own answers', body: 'Questions dig into what the candidate actually said, so rehearsed answers don’t carry the round.' },
      { icon: 'list', title: 'Logistics & must-haves', body: 'Notice period, location, relocation, work authorization and your knockout questions — covered in the same session.' },
      { icon: 'users', title: 'Culture-fit', body: 'A short structured segment on working style, scored separately from technical depth.' },
    ] as Item[],
  },
  modes: {
    heading: { eyebrow: 'Interview modes', title: 'The right format for the role.', lead: 'Suggested from the job description — you choose.' } as Heading,
    items: [
      { icon: 'code', title: 'Technical work sample', body: 'A real task in a coding workspace, run against tests and then defended — plus technical Q&A.' },
      { icon: 'layers', title: 'Hybrid', body: 'A spoken interview with one hands-on work-sample segment — often right for leads.' },
      { icon: 'message', title: 'Conversational', body: 'A structured spoken interview with no coding workspace.' },
    ] as Item[],
  },
  report: {
    eyebrow: 'The report',
    title: 'A recommendation first. Then the evidence.',
    lead: 'Built for the debrief: a hiring manager can see the call, check the reasoning and move on.',
    bullets: [
      'Verdict and recommendation up front',
      'Competencies ranked, each with a reason',
      'Must-haves panel against your rubric',
      'Communication, culture-fit, strengths and concerns',
      'Transcript highlights — with the integrity panel kept separate',
    ],
    visual: 'screenReport',
  } as SplitBlock,
  candidate: {
    eyebrow: 'The candidate experience',
    title: 'Upfront about the AI. Respectful of their time.',
    lead: `Candidates know what to expect before they start. The interview takes ${INTERVIEW_LENGTH_LABEL}, including a short guided tour of the interface.`,
    bullets: [
      'Told the interview is AI-led, by email and WhatsApp',
      'Two separate consents — the AI interview, and recording — each logged',
      'They pick a time that suits them, around the clock',
      'An automatic tour of the interface before the first question',
    ],
    visual: 'screenConsent',
  } as SplitBlock,
  approval: {
    eyebrow: 'Your bar',
    title: 'Your questions. Your rubric. Every candidate.',
    lead: 'AI drafts the questions, work sample and rubric from your job description. Your team approves them before anyone is interviewed.',
    bullets: ['Drafted from your JD, approved by your team', 'Must-have and good-to-have tiers drive scoring', 'The same bar for every candidate for a role'],
    visual: 'screenApproval',
  } as SplitBlock,
  operations: {
    heading: { eyebrow: 'Operations', title: 'Run many interviews without running them.' } as Heading,
    items: [
      { icon: 'calendar', title: 'Self-scheduling', body: 'Candidates book any slot, around the clock — interviews run in parallel.' },
      { icon: 'monitor', title: 'Control Room', body: 'See live interview health — camera, mic, progress — without joining.' },
      { icon: 'play', title: 'Session playback', body: 'Replay any interview when you want to see it for yourself.' },
      { icon: 'download', title: 'CSV export', body: 'Export results by role, date range or recommendation.' },
    ] as Item[],
  },
  integrity: {
    heading: { eyebrow: 'Integrity', title: 'Flags with evidence. A person makes the call.', lead: `${NAME} flags behaviour consistent with outside help — assistants, overlays, pasted answers, another face or voice — and attaches the evidence. Nothing is auto-rejected.` } as Heading,
    link: { label: 'How integrity works', href: ROUTES.integrity } as CTA,
  },
  cta: {
    title: 'Sit in the candidate’s chair.',
    lead: 'Take a short live interview in your browser. No sign-up.',
    primary: TRY_LIVE as CTA,
    secondary: TALK_TO_US as CTA,
  },
}

export const screenDemo = {
  meta: {
    title: `Try a live interview — ${NAME} — Levl1`,
    description: 'Pick a technical role and take a short, live AI interview by voice in your browser. No sign-up.',
  },
  hero: {
    badge: 'Live demo · no sign-up',
    badgeTone: 'live' as const,
    title: 'Sit in the candidate’s chair.',
    lead: `Pick a role and talk it through by voice, right in your browser. The demo takes a few minutes — a real interview takes ${INTERVIEW_LENGTH_LABEL}.`,
  },
  expect: {
    heading: { eyebrow: 'What you’ll experience', title: 'Three steps, a few minutes.' } as Heading,
    items: [
      { title: 'Pick a role', body: 'Backend, data or full-stack — each with its own short question set.' },
      { title: 'Talk it through', body: 'Answer out loud. Interrupt, push back, ask for clarification — it adapts.' },
      { title: 'See the evidence', body: 'Get the evidence report at the end, the way a hiring manager would.' },
    ] as Step[],
  },
  full: {
    heading: { eyebrow: 'What the full interview adds', title: 'The demo is a taste. The real thing goes deeper.' } as Heading,
    items: [
      { icon: 'terminal', title: 'Observe & defend', body: 'A real task in a coding workspace, run against tests, then defended.' },
      { icon: 'shield', title: 'Integrity checks', body: 'Signals for outside help, with evidence — AI-answer checks where enabled for a role.' },
      { icon: 'sliders', title: 'Your rubric', body: 'Questions and must-haves drafted from your JD and approved by your team.' },
      { icon: 'users', title: 'The recruiter side', body: 'Self-scheduling, the Control Room, playback and CSV export.' },
    ] as Item[],
  },
  after: {
    heading: { eyebrow: 'Evaluating for your team?', title: `See ${NAME} on one of your roles.`, lead: 'We’ll set it up from one of your job descriptions and walk you through a real report.' } as Heading,
    primary: TALK_TO_US as CTA,
    secondary: { label: `Explore ${NAME}`, href: ROUTES.screen } as CTA,
  },
}
