import { INTERVIEW_LENGTH_LABEL, ROUTES } from '@/config/site'
import type { CTA, Heading, Item, SplitBlock } from './types'

export const agencies = {
  meta: {
    title: 'For staffing & recruitment agencies — Levl1',
    description: 'Run your agency desk on HirePilot, and verify technical candidates with Screen before you submit. Offer verified technical screening to your clients as a premium service.',
  },
  hero: {
    eyebrow: 'For staffing & recruitment agencies',
    title: 'Run your desk. Verify before you submit.',
    highlight: 'Verify before you submit.',
    lead: 'HirePilot runs the agency desk end to end. Screen gives technical candidates a structured, evidence-backed interview before they reach your client. Use either one, or both.',
    primary: { label: 'Book a demo', href: ROUTES.demo } as CTA,
    secondary: { label: 'Start a HirePilot trial', href: ROUTES.hirepilotTrial } as CTA,
  },
  pains: {
    heading: { eyebrow: 'Sound familiar?', title: 'Agency hiring is a volume game with no room for misses.' } as Heading,
    items: [
      { icon: 'clock', title: 'Recruiters drowning in screening calls', body: 'Hours a day on first calls that a structured process could have handled.' },
      { icon: 'alert', title: 'Clients rejecting under-verified candidates', body: 'A weak technical submission costs you the candidate — and some of the client’s trust.' },
      { icon: 'hourglass', title: 'Slow submissions', body: 'By the time a shortlist is checked and formatted, the client has seen someone else’s.' },
    ] as Item[],
  },
  splits: [
    {
      eyebrow: 'HirePilot runs the desk',
      title: 'Every client, role and placement in one place.',
      lead: 'Briefs, screening, pipeline, client submissions and follow-ups — with AI doing the manual work.',
      bullets: ['AI job briefs and weighted rubrics', 'Résumé scoring, including scanned PDFs', 'Send to client with a summary sheet', 'Unified inbox for email and WhatsApp', 'Team assignment and performance'],
      link: { label: 'Explore HirePilot', href: ROUTES.hirepilot },
      visual: 'hpSubmit',
    },
    {
      eyebrow: 'Screen verifies',
      title: 'Know they can do the job before your client asks.',
      lead: `An AI-led technical interview (${INTERVIEW_LENGTH_LABEL}) with live coding and a whiteboard, and a report with the reason behind every score.`,
      bullets: ['Same structured bar for every candidate', 'Scores your recruiters can explain to a client', 'Integrity flags reviewed by a person — never auto-rejected'],
      link: { label: 'Explore Screen', href: ROUTES.screen },
      visual: 'screenReport',
    },
    {
      eyebrow: 'Get paid, keep placements',
      title: 'The back office, handled.',
      lead: 'Automatic payment reminders by client, and scheduled check-ins after a placement starts.',
      bullets: ['AR tracking with automatic nudges', 'Post-placement nurture check-ins', 'Client CRM linked to jobs'],
      visual: 'hpAR',
    },
  ] as SplitBlock[],
  premium: {
    heading: { eyebrow: 'A new line of business', title: 'Offer verified technical screening to your own clients as a premium service.', highlight: 'as a premium service.', lead: 'Put a structured, evidence-backed technical interview behind your submissions — and sell it as part of your service.' } as Heading,
  },
  cta: {
    title: 'See Levl1 on your agency’s roles.',
    primary: { label: 'Book a demo', href: ROUTES.demo } as CTA,
    secondary: { label: 'Try a demo interview', href: ROUTES.screenDemo } as CTA,
  },
}

export const enterprise = {
  meta: {
    title: 'For enterprise engineering & TA teams — Levl1 Screen',
    description: 'Use Screen as round one: AI-led technical interviews with live coding and a whiteboard, consistent rubrics, and evidence-backed reports your engineers can trust.',
  },
  hero: {
    eyebrow: 'For enterprise engineering & TA teams',
    title: 'Give your engineers their first-round hours back.',
    highlight: 'first-round hours back.',
    lead: 'Screen runs round one as a live, AI-led technical interview. Your team reviews a scored, evidence-backed report and spends interview time only on candidates worth it.',
    primary: { label: 'Book a demo', href: ROUTES.demo } as CTA,
    secondary: { label: 'Try a demo interview', href: ROUTES.screenDemo } as CTA,
  },
  pains: {
    heading: { eyebrow: 'The cost of round one', title: 'Round one is expensive, inconsistent and easy to game.' } as Heading,
    items: [
      { icon: 'clock', title: 'Engineer hours spent on first rounds', body: 'Senior engineers lose whole afternoons to screens that mostly end in “no”.' },
      { icon: 'users', title: 'Inconsistent interviewers', body: 'Different interviewers, different questions, different bars — and hard-to-compare notes.' },
      { icon: 'alert', title: 'Cheating', body: 'AI assistants make unproctored tests and async assignments unreliable signals.' },
    ] as Item[],
  },
  splits: [
    {
      eyebrow: 'Round one, handled',
      title: 'The same rigorous round for every candidate.',
      lead: 'Questions drafted from your job description and approved by your team. Every candidate for a role meets the same bar.',
      bullets: ['Adaptive voice interview with live coding and a whiteboard', 'Follow-ups that dig into the candidate’s own answers', `${INTERVIEW_LENGTH_LABEL} per candidate`],
      visual: 'screenRoom',
    },
    {
      eyebrow: 'Evidence, not impressions',
      title: 'Reports your engineers can check.',
      lead: 'A reason behind every score, the transcript and the code — with integrity flags kept separate and reviewed by a person.',
      bullets: ['Multi-dimensional competency scores', 'Integrity scored separately from competency', 'Nothing auto-rejected'],
      link: { label: 'How integrity works', href: ROUTES.integrity },
      visual: 'screenIntegrity',
    },
  ] as SplitBlock[],
  readiness: {
    heading: { eyebrow: 'Enterprise readiness', title: 'What we can say today — and nothing more.', lead: 'The facts below are how Levl1 works now. Ask us anything that isn’t listed.' } as Heading,
    items: [
      { icon: 'lock', title: 'Encrypted in transit', body: 'All traffic is served over HTTPS.' },
      { icon: 'layers', title: 'Tenant isolation', body: 'Every customer’s data is scoped to its own workspace.' },
      { icon: 'key', title: 'Role-based access', body: 'Control who can see and change what.' },
      { icon: 'clipboard', title: 'Candidate consent', body: 'Candidates are told the interview is AI-led and consent before it starts.' },
      { icon: 'userCheck', title: 'Humans decide', body: 'AI scores and flags; your team makes every hiring decision.' },
      { icon: 'server', title: 'Named subprocessors', body: 'The services that power Levl1 are listed on our Security page.' },
    ] as Item[],
    link: { label: 'Read about security', href: ROUTES.security } as CTA,
  },
  cta: {
    title: 'Pilot Screen on one of your roles.',
    primary: { label: 'Book a demo', href: ROUTES.demo } as CTA,
    secondary: { label: 'Try a demo interview', href: ROUTES.screenDemo } as CTA,
  },
}
