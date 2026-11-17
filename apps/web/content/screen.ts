import { INTERVIEW_LENGTH_LABEL, PRODUCTS, ROUTES, TALK_TO_US, TRY_LIVE } from '@/config/site'
import type { CTA, Heading, Item, SplitBlock, Step, TabItem } from './types'
import { DEMO_MICROCOPY, DEMO_ROLE_CHIPS } from './home'

const NAME = PRODUCTS.screen.name

export const screen = {
  meta: {
    title: `${NAME} — AI technical interviews — Levl1`,
    description: `${NAME} runs an adaptive spoken technical interview with live coding, a whiteboard and follow-ups (${INTERVIEW_LENGTH_LABEL}), flags behaviour consistent with outside help, and delivers an evidence-backed recommendation.`,
  },
  hero: {
    badge: `Stage ${PRODUCTS.screen.stage} · Available now`,
    badgeTone: 'live' as const,
    title: 'A first-round interviewer that can’t be fooled by a good story.',
    lead: `${NAME} runs a live, spoken technical interview — real code, a whiteboard, follow-ups on the candidate’s own answers — then hands your team a recommendation with the evidence behind it.`,
    chipsLabel: 'Try it as a candidate:',
    chips: DEMO_ROLE_CHIPS,
    primary: TRY_LIVE as CTA,
    secondary: TALK_TO_US as CTA,
    microcopy: DEMO_MICROCOPY,
    evidence: [
      { time: '06:40', text: 'tests 4/4 passed', tone: 'pass' as const },
      { time: '30:00', text: 'advance to panel', tone: 'pass' as const },
    ],
  },
  interview: {
    heading: { eyebrow: 'Inside the interview', title: 'A real technical round. Not a quiz.', lead: `${INTERVIEW_LENGTH_LABEL}. It holds a conversation, watches the candidate work, and adapts as it goes.` } as Heading,
    tabs: [
      { id: 'voice', label: 'Adaptive voice', visual: 'snipVoice', title: 'A conversation, not a form.', body: 'A natural spoken interview that adjusts its depth as it goes. Candidates can interrupt, ask for clarification and push back — it adapts.', bullets: ['Natural voice, both ways', 'Candidates can interrupt mid-question', 'Depth adjusts to how they’re doing'] },
      { id: 'code', label: 'Code & tests', visual: 'snipCode', title: 'Observe the work. Then make them defend it.', body: 'A real task in a coding workspace. The code runs against tests, then the candidate explains the decisions behind it.', bullets: ['A real work sample, not trivia', 'Run against your tests', 'Defended out loud afterwards'] },
      { id: 'whiteboard', label: 'Whiteboard', visual: 'snipWhiteboard', title: 'Design, sketched and questioned.', body: 'For system design, the candidate sketches and the interviewer asks about the trade-offs.', bullets: ['A shared whiteboard in the room', 'Questions about failure modes and scale'] },
      { id: 'followups', label: 'Follow-ups', visual: 'snipFollowup', title: 'Rehearsed answers don’t carry the round.', body: 'Follow-up questions dig into what the candidate actually said, so a polished story gets tested.', bullets: ['Grounded in the candidate’s own words', 'Probes the parts that sound too clean'] },
      { id: 'logistics', label: 'Logistics', visual: 'snipLogistics', title: 'The practical questions, covered.', body: 'Notice period, location, relocation, work authorization and your knockout questions — in the same session.', bullets: ['Your knockout questions included', 'Answers captured in the report'] },
      { id: 'culture', label: 'Culture-fit', visual: 'snipCulture', title: 'Working style, scored on its own.', body: 'A short structured segment on how the candidate likes to work, scored separately from technical depth.', bullets: ['Structured agreement scale', 'Never blended into the technical score'] },
    ] as TabItem[],
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
    eyebrow: 'Operations',
    title: 'Run many interviews without running them.',
    lead: 'Interviews run in parallel while your team works the rest of the funnel.',
    bullets: [
      'Self-scheduling — candidates book any slot, around the clock',
      'Control Room — live camera, mic and progress health, without joining',
      'Session playback — replay any interview yourself',
      'CSV export — by role, date range or recommendation',
    ],
    visual: 'screenControl',
  } as SplitBlock,
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
