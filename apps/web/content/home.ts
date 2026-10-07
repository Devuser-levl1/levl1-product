import { INTERVIEW_LENGTH_LABEL, ROUTES } from '@/config/site'
import type { CTA, Heading, Item, SplitBlock, Step } from './types'
import type { ProductCardData } from '@/components/marketing/sections/product-cards'

export const home = {
  meta: {
    title: 'Levl1 — Technical interviews that run themselves',
    description: 'Levl1 Screen runs live, AI-led first-round technical interviews by voice, with live coding and a whiteboard. Your team gets a scored, evidence-backed report with integrity flags.',
  },
  hero: {
    eyebrow: 'Levl1 Screen · AI technical interviews',
    title: 'Technical interviews that run themselves — and show their work.',
    highlight: 'and show their work.',
    lead: 'Levl1’s AI interviewer runs live first-round technical interviews by voice, with live coding and a whiteboard. Your team gets a scored, evidence-backed report with integrity flags.',
    primary: { label: 'Book a demo', href: ROUTES.demo } as CTA,
    secondary: { label: 'Try a demo interview', href: ROUTES.screenDemo } as CTA,
    points: ['Voice, live coding and whiteboard', `${INTERVIEW_LENGTH_LABEL} per interview`, 'Every flag reviewed by a person'],
  },
  problem: {
    heading: { eyebrow: 'The first-round problem', title: 'The first round is where good hiring breaks.', lead: 'It is the most repeated, least consistent hour in your process — and the easiest to game.' } as Heading,
    items: [
      { icon: 'clock', title: 'First rounds eat senior engineers’ calendars.', body: 'Your best engineers spend hours every week on screens that mostly end in “no” — time that should go to the roadmap.' },
      { icon: 'message', title: 'Phone screens reward confident talkers.', body: 'Unstructured conversations favour polish over skill. Two interviewers, two different bars, and little evidence either way.' },
      { icon: 'alert', title: 'AI-assisted cheating breaks async tests.', body: 'Unproctored assignments and async tests are easy to hand to an AI assistant. A pass no longer tells you much.' },
    ] as Item[],
  },
  steps: {
    heading: { eyebrow: 'How it works', title: 'From job description to decision in four steps.' } as Heading,
    items: [
      { title: 'Create a role from your JD', body: 'Paste the job description. Screen drafts the questions and rubric, and your team approves them.' },
      { title: 'The candidate consents and schedules', body: 'Candidates are told up front the interview is AI-led, give consent, and pick a time that suits them.' },
      { title: 'The AI runs the technical round', body: 'An adaptive spoken interview with live coding and a whiteboard, following up on the candidate’s own answers.' },
      { title: 'Your team reviews the report', body: 'Scores with the reason behind each one, the transcript, the code — and integrity flags, kept separate.' },
    ] as Step[],
  },
  report: {
    eyebrow: 'The report',
    title: 'Every score comes with its reason.',
    lead: 'No opaque number. Each competency score links back to what the candidate actually said and wrote, so a hiring manager can check the reasoning in minutes.',
    bullets: [
      'Multi-dimensional competency scores',
      'A plain-language reason behind every score',
      'Full transcript, code and whiteboard',
      'Integrity flags kept separate from competency',
    ],
    link: { label: 'Explore Screen', href: ROUTES.screen },
    visual: 'screenReport',
  } as SplitBlock,
  products: {
    heading: { eyebrow: 'Products', title: 'Two products. Use the one you need.' } as Heading,
    items: [
      { name: 'Screen', tag: 'AI technical interview', title: 'First-round technical interviews, run by AI.', body: 'Adaptive voice interviews with live coding and a whiteboard, and a report your team can check.', href: ROUTES.screen, cta: 'Explore Screen', visual: 'screenRoom' },
      { name: 'HirePilot', tag: 'ATS + CRM', title: 'Running an agency? Run your whole desk on HirePilot.', body: 'The AI-native ATS + CRM: briefs, scoring, pipeline, client submissions and follow-ups in one place.', href: ROUTES.hirepilot, cta: 'Explore HirePilot', visual: 'hpPipeline' },
    ] as ProductCardData[],
  },
  integrity: {
    heading: { eyebrow: 'Integrity', title: 'Integrity isn’t guesswork.', highlight: 'isn’t guesswork.', lead: 'Suspicious behaviour gets flagged with evidence, and a human makes the call. Never auto-rejected.' } as Heading,
    link: { label: 'How integrity works', href: ROUTES.integrity } as CTA,
  },
  cta: {
    title: 'Hear it for yourself.',
    lead: 'Take a short demo interview in your browser, or see Screen on your own roles.',
    primary: { label: 'Book a demo', href: ROUTES.demo } as CTA,
    secondary: { label: 'Try a demo interview', href: ROUTES.screenDemo } as CTA,
  },
}
