import { INTERVIEW_LENGTH_LABEL, ROUTES } from '@/config/site'
import type { CTA, Heading, Item, SplitBlock } from './types'

export const screen = {
  meta: {
    title: 'Levl1 Screen — AI first-round technical interviews',
    description: `Screen runs a live, spoken technical interview with live coding, a whiteboard and adaptive follow-ups (${INTERVIEW_LENGTH_LABEL}), then delivers a scored, evidence-backed report with integrity flags for human review.`,
  },
  hero: {
    eyebrow: 'Levl1 Screen',
    title: 'A first-round technical interviewer that never gets tired, rushed, or biased by a good story.',
    highlight: 'never gets tired, rushed, or biased by a good story.',
    lead: 'Screen runs a live, spoken technical interview — with live coding, a whiteboard and follow-ups that dig into the candidate’s own answers — then hands your team a scored report with the evidence behind every number.',
    primary: { label: 'Book a demo', href: ROUTES.demo } as CTA,
    secondary: { label: 'Try a demo interview', href: ROUTES.screenDemo } as CTA,
    points: [INTERVIEW_LENGTH_LABEL, 'Voice, live coding and whiteboard', 'Questions your team approves'],
  },
  interview: {
    heading: { eyebrow: 'What happens in the interview', title: 'A real technical round, not a quiz.', lead: 'Screen holds a conversation, watches the candidate work, and adapts as it goes — the way a good senior interviewer would.' } as Heading,
    items: [
      { icon: 'mic', title: 'Adaptive spoken questions', body: 'A natural voice conversation that adjusts depth to how the candidate is doing.' },
      { icon: 'code', title: 'Live coding', body: 'A real code editor in the room. Screen sees how the candidate builds a solution, not just the final answer.' },
      { icon: 'pen', title: 'Whiteboard', body: 'For system design and diagrams — the candidate sketches, Screen asks about the trade-offs.' },
      { icon: 'search', title: 'Follow-ups on their own answers', body: 'Screen digs into what the candidate actually said, so rehearsed answers don’t carry the round.' },
      { icon: 'users', title: 'Culture-fit segment', body: 'A short structured segment on working style, scored separately from technical depth.' },
      { icon: 'list', title: 'Questions your team approves', body: 'Questions are drafted from the role and approved by your team before any candidate sees them.' },
    ] as Item[],
  },
  candidate: {
    eyebrow: 'The candidate experience',
    title: 'Respectful of the candidate’s time — and upfront about the AI.',
    lead: `Candidates know exactly what to expect before they start. The interview takes ${INTERVIEW_LENGTH_LABEL}, including a short guided tour of the interface.`,
    bullets: [
      'Consent first — candidates are told the interview is AI-led, by email and WhatsApp',
      'They schedule at a time that suits them',
      'An automatic tour of the interface before the first question',
      `${INTERVIEW_LENGTH_LABEL}, start to finish`,
    ],
    visual: 'screenConsent',
  } as SplitBlock,
  report: {
    eyebrow: 'The report',
    title: 'Scores you can check, not just trust.',
    lead: 'Every report shows its working, so a hiring manager can agree or disagree with the AI in minutes — with the evidence in front of them.',
    bullets: [
      'Multi-dimensional competency scores',
      'A reason behind each score, tied to what the candidate said and wrote',
      'Full transcript',
      'The candidate’s code and whiteboard',
      'Integrity flags kept separate from the competency score',
    ],
    visual: 'screenReport',
  } as SplitBlock,
  approval: {
    eyebrow: 'Your bar',
    title: 'Your questions. Your rubric. Every candidate.',
    lead: 'Screen drafts questions from the role you create. Your team reviews and approves them, so every candidate for a role is assessed against the same bar.',
    bullets: ['Drafted from your job description', 'Reviewed and approved by your team', 'One consistent rubric per role'],
    visual: 'screenApproval',
  } as SplitBlock,
  integrity: {
    heading: { eyebrow: 'Integrity', title: 'Flags with evidence. A person makes the call.', lead: 'Screen flags behaviour consistent with outside help — unauthorized tools, overlay assistants, pasted answers, another face in frame — and attaches the evidence. Nothing is auto-rejected.' } as Heading,
    link: { label: 'How integrity works', href: ROUTES.integrity } as CTA,
  },
  cta: {
    title: 'Take a demo interview.',
    lead: 'Pick a role and talk to Screen in your browser. No sign-up.',
    primary: { label: 'Try a demo interview', href: ROUTES.screenDemo } as CTA,
    secondary: { label: 'Book a demo', href: ROUTES.demo } as CTA,
  },
}

export const screenDemo = {
  meta: {
    title: 'Try a demo interview — Levl1 Screen',
    description: 'Pick a technical role and start a short, live AI interview by voice in your browser. No sign-up.',
  },
  hero: {
    eyebrow: 'Levl1 Screen · Demo',
    title: 'Try a demo interview.',
    highlight: 'demo interview.',
    lead: `Pick a role and talk to Screen by voice, right in your browser. The demo is a short taste — a real interview takes ${INTERVIEW_LENGTH_LABEL}.`,
  },
  after: {
    heading: { eyebrow: 'Evaluating for your team?', title: 'See Screen on your own roles.', lead: 'We’ll set up questions from one of your job descriptions and walk you through a real report.' } as Heading,
    primary: { label: 'Book a demo', href: ROUTES.demo } as CTA,
    secondary: { label: 'Explore Screen', href: ROUTES.screen } as CTA,
  },
}
