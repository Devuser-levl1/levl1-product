import { INTERVIEW_LENGTH_LABEL, PRODUCTS, ROUTES, TALK_TO_US, TRY_LIVE, type ProductKey } from '@/config/site'
import type { Audience, CTA, Heading, Item, Pillar, Step } from './types'

export const home = {
  meta: {
    title: 'Levl1 — Technical screening you can actually trust',
    description: 'Screen runs rigorous AI technical interviews by voice, with live coding and a whiteboard, flags what others miss, and hands your team an evidence-backed recommendation.',
  },
  hero: {
    badge: 'Early access',
    badgeTone: 'live' as const,
    title: 'Technical screening you can actually trust.',
    highlight: 'actually trust.',
    lead: `${PRODUCTS.screen.name} runs rigorous AI technical interviews, catches what others miss, and hands you evidence-backed decisions — not another résumé pile.`,
    primary: TRY_LIVE as CTA,
    secondary: TALK_TO_US as CTA,
    points: ['Voice, live coding and whiteboard', INTERVIEW_LENGTH_LABEL, 'Every flag reviewed by a person'],
  },
  problem: {
    heading: { eyebrow: 'The problem', title: 'First-round technical screening is broken.', lead: 'It costs your best engineers the most time, and tells you the least.' } as Heading,
    items: [
      { title: 'Screens eat senior engineers’ time', body: 'Hours every week on first rounds — and most of them end in “no”.' },
      { title: 'AI-interview results can’t be trusted', body: 'Assistants and on-screen overlays feed answers in real time. A good score may not be the candidate’s.' },
      { title: 'Keyword matching passes the wrong people', body: 'Résumés that say the right words get through. Whether they can do the work is still unknown.' },
      { title: 'Bare scores you can’t defend', body: 'A number without reasons won’t survive a debrief, and won’t convince a hiring panel.' },
    ] as Item[],
  },
  outcome: {
    heading: { eyebrow: 'What changes', title: 'What your team gets back.' } as Heading,
    items: [
      { icon: 'clock', title: 'Engineer hours back', body: 'Senior engineers meet the shortlist, not the whole pipeline.' },
      { icon: 'scale', title: 'One bar for everyone', body: 'Every candidate for a role meets the same approved questions and rubric.' },
      { icon: 'file', title: 'Results you can defend', body: 'Every score comes with its reason and the evidence behind it.' },
      { icon: 'zap', title: 'A faster funnel', body: 'Candidates book a time that suits them, around the clock.' },
      { icon: 'filter', title: 'Fewer bad advances', body: 'Weak and assisted performances surface before the panel, not after.' },
    ] as Item[],
  },
  steps: {
    heading: { eyebrow: 'How it works', title: 'From job description to decision.' } as Heading,
    items: [
      { title: 'Your JD in', body: 'AI drafts the questions, a work sample and a must-have / good-to-have rubric. Your team approves them.' },
      { title: 'The AI runs the interview', body: 'An adaptive spoken interview with live coding and a whiteboard, following up on the candidate’s own answers.' },
      { title: 'Evidence out', body: 'A report with a clear recommendation, a reason for every score — and integrity kept separate, for a person to review.' },
    ] as Step[],
  },
  pillars: {
    heading: { eyebrow: 'Why teams trust it', title: 'Three promises, and the proof behind each.' } as Heading,
    items: [
      {
        eyebrow: 'Evidence, not guesses',
        title: 'Every decision comes with its working.',
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
        promise: 'Screen watches for behaviour consistent with outside help — and attaches the evidence to every flag.',
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
      {
        eyebrow: 'Real technical depth',
        title: 'Observe the work. Then make them defend it.',
        promise: 'Candidates solve a real task in a coding workspace, their code runs against tests, and then they explain their decisions.',
        proof: [
          'Adaptive follow-ups that dig into the candidate’s own answers',
          'Observe & defend: a real work sample, run against tests, then defended',
          'A whiteboard for system design',
          'Must-have and good-to-have tiers drive the scoring',
        ],
        visual: 'screenApproval',
      },
    ] as Pillar[],
  },
  audience: {
    heading: { eyebrow: 'Built for both', title: 'For the people who own the bar — and the people who run the process.' } as Heading,
    items: [
      {
        label: 'Hiring managers & engineering leaders',
        title: 'Deeper signal, defensible decisions.',
        points: [
          'Watch candidates work, not just talk',
          'Every score explained — ready for your debrief',
          'Your engineers’ time goes to the shortlist',
          'Your rubric, approved by your team',
        ],
      },
      {
        label: 'Recruiters & talent acquisition',
        title: 'Run more first rounds without more calendar.',
        points: [
          'Candidates self-schedule, in parallel, around the clock',
          'See live interview health in the Control Room without joining',
          'Consent, invites and reminders by email and WhatsApp',
          'Export results to CSV',
        ],
      },
    ] as Audience[],
  },
  funnel: {
    heading: { eyebrow: 'One funnel', title: `${PRODUCTS.screen.name} is the first stage of your technical hiring funnel.`, lead: 'Two more stages are in development.' } as Heading,
    details: {
      screen: 'Live AI technical interviews with integrity checks and evidence reports.',
      takeHome: 'A real-world task in a real IDE, evaluated against your rubric and tests.',
      liveInterview: 'Your interviewers, with an AI copilot for follow-ups, notes and scorecards.',
    } as Record<ProductKey, string>,
  },
  trust: {
    heading: { eyebrow: 'Trust', title: 'Built to handle candidate data properly.' } as Heading,
    items: [
      { icon: 'clipboard', title: 'Consent first', body: 'Candidates are told the interview is AI-led, and give separate consent for recording. Both are logged.' },
      { icon: 'lock', title: 'Encrypted', body: 'Data is encrypted in transit, and interview recordings and transcripts are encrypted at rest.' },
      { icon: 'trash', title: 'Automatic retention', body: 'Recordings and transcripts are purged automatically after fixed periods shown to candidates.' },
      { icon: 'userCheck', title: 'Humans decide', body: 'The AI recommends and flags. Your team makes every hiring decision.' },
    ] as Item[],
    link: { label: 'Read about security', href: ROUTES.security } as CTA,
  },
  cta: {
    title: 'Hear it for yourself.',
    lead: 'Take a short live interview in your browser, or see Screen on one of your own roles.',
    primary: TRY_LIVE as CTA,
    secondary: TALK_TO_US as CTA,
  },
}
