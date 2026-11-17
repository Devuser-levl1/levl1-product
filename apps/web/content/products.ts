import { PRODUCTS } from '@/config/site'
import type { ComingSoonContent } from '@/components/marketing/sections/coming-soon'

// Coming-soon products. Everything is written in the FUTURE tense — these are
// in development and nothing here may imply they exist today.

export const takeHome: ComingSoonContent & { meta: { title: string; description: string } } = {
  product: 'takeHome',
  meta: {
    title: `${PRODUCTS.takeHome.name} — coming soon — Levl1`,
    description: `${PRODUCTS.takeHome.name} will give candidates a real-world task in a real IDE, evaluated against your rubric and tests, with an optional AI follow-up where they defend their work. Join early access.`,
  },
  hero: {
    title: 'Real work, not trivia — and impossible to fake.',
    highlight: 'and impossible to fake.',
    lead: `${PRODUCTS.takeHome.name} will be stage two of your technical hiring funnel: a real-world task, done asynchronously in a real IDE, evaluated against your rubric and tests — then defended.`,
  },
  problem: {
    heading: { eyebrow: 'The problem', title: 'Take-home tasks stopped telling you much.' },
    items: [
      { title: 'Easy to outsource', body: 'A task done at home can be handed to a friend, a contractor or an AI assistant.' },
      { title: 'You can’t tell who did it', body: 'A polished submission says nothing about who wrote it, or whether they understand it.' },
      { title: 'Expensive to grade', body: 'Senior engineers spend hours reviewing submissions, and each grades differently.' },
    ],
  },
  how: {
    heading: { eyebrow: 'How it will work', title: 'Async, but accountable.' },
    steps: [
      { title: 'A real task in a real IDE', body: 'Candidates will work on a realistic task in a full development environment, on their own time.' },
      { title: 'Evaluated automatically', body: 'Submissions will be run against tests and assessed against your rubric, with the evidence attached.' },
      { title: 'Defend your work', body: 'An optional AI follow-up will ask candidates to explain the decisions in their own submission.' },
    ],
  },
  different: {
    heading: { eyebrow: 'Why it will be different', title: 'Built to answer the question that matters: did they do it, and do they understand it?' },
    items: [
      { icon: 'terminal', title: 'Real environment', body: 'Tasks will look like the work, not like a puzzle.' },
      { icon: 'sliders', title: 'Your rubric', body: 'It will use the same must-have and good-to-have tiers your team already approves for Screen.' },
      { icon: 'message', title: 'Defended, not just submitted', body: 'Understanding will be checked in conversation, not assumed from code.' },
    ],
  },
  earlyAccess: {
    title: `Help shape ${PRODUCTS.takeHome.name}.`,
    lead: 'Tell us about the roles you’d use it for. Early-access teams will see it first and steer what we build.',
    note: `${PRODUCTS.takeHome.name} is in development. Nothing on this page is available yet — ${PRODUCTS.screen.name} is, today.`,
  },
}

export const liveInterview: ComingSoonContent & { meta: { title: string; description: string } } = {
  product: 'liveInterview',
  meta: {
    title: `${PRODUCTS.liveInterview.name} — coming soon — Levl1`,
    description: `${PRODUCTS.liveInterview.name} will give your interviewers an AI copilot in our video room: suggested follow-ups, live structured notes, coverage tracking, integrity signals and an auto-drafted scorecard. Join early access.`,
  },
  hero: {
    title: 'Make every interviewer as good as your best one.',
    highlight: 'as good as your best one.',
    lead: `${PRODUCTS.liveInterview.name} will be stage three: your interviewers, in our video room, with an AI copilot that keeps every interview structured, covered and well documented.`,
  },
  problem: {
    heading: { eyebrow: 'The problem', title: 'Your later rounds are only as good as the interviewer in the room.' },
    items: [
      { title: 'Inconsistent', body: 'Two interviewers ask different questions and hold different bars for the same role.' },
      { title: 'Hard to calibrate', body: 'Notes are thin and late, so debriefs run on memory and impressions.' },
      { title: 'Uneven junior interviewers', body: 'New interviewers miss follow-ups and leave gaps your senior people would have caught.' },
    ],
  },
  how: {
    heading: { eyebrow: 'How it will work', title: 'A human interview, with an AI copilot alongside.' },
    steps: [
      { title: 'Interview in our video room', body: 'Your interviewer will run the conversation; the copilot will listen alongside.' },
      { title: 'Guided in the moment', body: 'It will suggest follow-ups, take live structured notes and track coverage against your rubric.' },
      { title: 'Scorecard drafted for you', body: 'It will draft the scorecard; the interviewer will review and edit it before submitting.' },
    ],
  },
  different: {
    heading: { eyebrow: 'Why it will be different', title: 'The interviewer stays in charge.' },
    items: [
      { icon: 'list', title: 'Coverage, not scripts', body: 'The copilot will track which parts of your rubric are covered, so nothing is missed.' },
      { icon: 'shield', title: 'Integrity signals', body: 'The copilot will surface signals of outside help, with evidence, for the interviewer to weigh.' },
      { icon: 'fingerprint', title: 'Identity continuity', body: 'It will check the candidate is the same person who took the Screen stage.' },
    ],
  },
  earlyAccess: {
    title: `Help shape ${PRODUCTS.liveInterview.name}.`,
    lead: 'Tell us how your interview loop works today. Early-access teams will see it first and steer what we build.',
    note: `${PRODUCTS.liveInterview.name} is in development. Nothing on this page is available yet — ${PRODUCTS.screen.name} is, today.`,
  },
}
