import { PRODUCTS, ROUTES, SOON_LABEL } from '@/config/site'
import type { CTA, Heading, Item, TabItem } from './types'
import type { FeatureGroup } from '@/components/marketing/sections/feature-groups'
import type { Phase } from '@/components/marketing/sections/phases'

// Interview — Stage 3 (human-led, AI-assisted technical interview). COMING SOON.
// Copy rules for this page:
//  - Future tense throughout: nothing here exists yet. Early-access framing.
//  - A human runs the interview; the AI assists. Never "AI replaces the interviewer".
//  - Honest claims: "reduces bias", "standardizes", "flags for human review" —
//    never "eliminates bias", "100% fair" or "cheat-proof".
//  - No logos, testimonials or metrics. Mock values are illustrative UI.
// Product names come from config/site.ts (PRODUCTS) — never hardcode them.

const I = PRODUCTS.liveInterview.name
const S = PRODUCTS.screen.name
const SOLVE = PRODUCTS.takeHome.name

export const interview = {
  meta: {
    title: `${I} — AI copilot for human technical interviews (${SOON_LABEL.toLowerCase()}) — Levl1`,
    description: `${I} will give your interviewers an AI copilot: a shared rubric, suggested follow-ups, coverage tracking, panel calibration, integrity checks and an evidence-based scorecard. In development — join early access.`,
  },

  hero: {
    badge: `Stage ${PRODUCTS.liveInterview.stage} · ${SOON_LABEL}`,
    title: 'Make every interviewer as good as your best one.',
    lead: `${I} will be the AI copilot for your human technical interviews. It will standardize every round, reduce bias, check integrity and make every panel decision defensible — while your interviewer stays in charge.`,
    primary: { label: 'Get early access', href: '#early-access' } as CTA,
    secondary: { label: 'Talk to us', href: ROUTES.demo } as CTA,
    microcopy: `In development · early-access teams shape what we build · ${S} and ${SOLVE} are available today`,
  },

  problem: {
    heading: {
      eyebrow: 'The problem',
      title: 'The outcome depends on who interviewed, not just who applied.',
      lead: 'Live technical interviews are where most hiring decisions are made — and where they are least consistent.',
    } as Heading,
    items: [
      { title: 'Inconsistent', body: 'Different interviewers ask different things and judge them differently, so two candidates for the same role are rarely measured the same way.' },
      { title: 'Uncalibrated panels', body: 'Some interviewers score hard, some soft. Without a shared standard, a “4” from one person isn’t a “4” from another.' },
      { title: 'Bias creeps in', body: 'Unstructured conversations amplify first impressions and similarity — and make fairness hard to show.' },
      { title: 'Uneven interviewers', body: 'Junior interviewers miss follow-ups and leave gaps; your senior interviewers’ time is the scarcest in the loop.' },
      { title: 'Hard to defend', body: '“We felt they were strong” doesn’t hold up in a debrief, with a hiring manager, or when a decision is challenged.' },
    ] as Item[],
  },

  how: {
    heading: {
      eyebrow: 'How it will work',
      title: 'Your interviewer leads. The copilot keeps it structured.',
      lead: `A human runs a live technical interview in Levl1’s own video room — no Zoom or extra tools. The AI assists in real time and never takes over.`,
    } as Heading,
    phases: [
      {
        label: 'Before',
        title: 'A shared plan for the role',
        points: [
          'The interviewer gets the JD, résumé and earlier-stage evidence in one place',
          'A structured, rubric-based plan — the same standard every interviewer uses for this role',
          'Must-have competencies marked, so everyone knows what has to be assessed',
        ],
      },
      {
        label: 'During',
        title: 'A copilot alongside, not in charge',
        points: [
          'Suggested follow-ups grounded in what the candidate just said',
          'Live structured notes, mapped to competencies as the interview runs',
          'Coverage tracking — which required skills have and haven’t been assessed',
          'Integrity checks running quietly in the background',
        ],
      },
      {
        label: 'After',
        title: 'A scorecard drafted from evidence',
        points: [
          'An auto-drafted scorecard the interviewer reviews and edits before submitting',
          'Every score tied to what actually happened in the interview',
          'Comparable with every other candidate for the role',
        ],
      },
    ] as Phase[],
  },

  features: {
    heading: {
      eyebrow: 'What it will do',
      title: 'Everything a fair, consistent interview loop needs.',
      lead: 'Five capabilities, built around one idea: every candidate for a role is judged on the same parameters, by interviewers who are held to the same standard.',
    } as Heading,
    groups: [
      {
        id: 'calibration', icon: 'sliders', title: 'Panel calibration & consistency',
        lead: 'The same competencies, the same standard, whoever is in the room.',
        items: [
          { title: 'Shared rubric per role', body: 'Every interviewer assesses the same competencies against the same written standard.' },
          { title: 'Coverage tracking', body: 'The must-have skills are actually assessed in every interview — not just the ones an interviewer enjoys asking about.' },
          { title: 'Interviewer calibration', body: 'See who scores harder or softer than the rest of the panel, so it can be calibrated over time. Built for improvement, not blame.' },
          { title: 'Standardized scorecards', body: 'All candidates for a role are scored on the same parameters, so results are comparable.' },
        ],
      },
      {
        id: 'fairness', icon: 'scale', title: 'Bias reduction & fairness',
        lead: 'Structure is the most reliable way to reduce bias in interviews. This makes structure the default.',
        items: [
          { title: 'Structured, rubric-driven interviews', body: 'Research consistently finds structured interviews fairer and more predictive than unstructured conversations.' },
          { title: 'Consistent criteria', body: 'The same questions-of-record and criteria across every candidate for a role.' },
          { title: 'Fairness signals', body: 'Flags when an interviewer talked over the candidate, dominated the time or drifted from the plan.' },
          { title: 'Evidence-based scoring', body: 'Scores grounded in what the candidate said and did — not gut feel or first impressions.' },
        ],
      },
      {
        id: 'copilot', icon: 'sparkles', title: 'AI copilot for the interviewer',
        lead: 'Sharper interviews without breaking the conversation.',
        items: [
          { title: 'Suggested follow-ups', body: 'Real-time prompts grounded in the candidate’s own answers, for the interviewer to use or ignore.' },
          { title: 'Live structured notes', body: 'Notes and an auto-summary tied to competencies, so the interviewer can focus on the person.' },
          { title: 'Coverage nudges', body: '“You haven’t assessed concurrency yet” — before the time runs out, not after.' },
          { title: 'Auto-drafted scorecard', body: 'A first draft with evidence attached; the interviewer reviews, edits and owns the final call.' },
        ],
      },
      {
        id: 'integrity', icon: 'shield', title: 'Integrity',
        lead: `The same integrity engine as ${S} and ${SOLVE} — flags with evidence, decided by a person.`,
        items: [
          { title: 'Live integrity checks', body: 'Identity and suspicious-activity signals during the interview, consistent with the rest of Levl1.' },
          { title: 'Identity continuity', body: `Checks that the person in this interview is the same candidate who took the ${S} stage.` },
          { title: 'Flag with evidence', body: 'Every flag comes with the moment that triggered it, for human review.' },
          { title: 'Never auto-fail', body: 'Nothing is rejected automatically. A person reviews and decides.' },
        ],
      },
      {
        id: 'reporting', icon: 'chart', title: 'Reporting & decisions',
        lead: 'A clear verdict, the reasoning behind it, and a fair comparison.',
        items: [
          { title: 'Verdict-forward scorecard', body: 'A recommendation first, then the evidence for each competency.' },
          { title: 'Candidate comparison', body: 'Everyone interviewed for a role, side by side on the same parameters.' },
          { title: 'Views for each role', body: 'Interviewers see their own scorecards and private coaching; TA and HR see the comparison and panel calibration.' },
        ],
      },
    ] as FeatureGroup[],
  },

  audience: {
    heading: {
      eyebrow: 'Who it’s for',
      title: 'Built for the people who own the hiring bar.',
    } as Heading,
    items: [
      {
        id: 'ta', label: 'Talent Acquisition', shortLabel: 'TA teams', visual: 'ivCalibration',
        title: 'Calibrated panels. Comparable results. Fairness you can show.',
        body: 'Standardize interviews across interviewers and roles, calibrate your panels over time, and get results you can compare and defend — at scale.',
        bodyShort: 'Standardize interviews across interviewers and roles, and calibrate panels over time.',
        bullets: ['See which interviewers score harder or softer than the panel', 'Every candidate for a role judged on the same parameters', 'Evidence behind every decision when it’s questioned'],
      },
      {
        id: 'hm', label: 'Hiring managers', shortLabel: 'Managers', visual: 'ivCompare',
        title: 'Trust the signal from every interview.',
        body: 'Every candidate is assessed against the rubric you approved, so a strong score means the same thing whoever ran the round.',
        bodyShort: 'Every candidate is assessed against the rubric you approved.',
        bullets: ['Side-by-side comparison on the same competencies', 'A recommendation with the reasoning attached', 'Coverage you can check — no untested must-haves'],
      },
      {
        id: 'interviewers', label: 'Interviewers', visual: 'ivCoaching',
        title: 'A copilot that makes you sharper.',
        body: 'Spend the interview on the candidate, not on notes. Get timely follow-ups, a drafted scorecard, and private feedback on how your interviews run.',
        bodyShort: 'Spend the interview on the candidate, not on notes.',
        bullets: ['Follow-ups grounded in the candidate’s answers', 'Notes and a scorecard drafted for you', 'Private coaching — only you see it'],
      },
    ] as TabItem[],
  },

  funnel: {
    heading: {
      eyebrow: 'How it fits',
      title: 'Stage three of three.',
      lead: `${I} will be the deeper, human stage after ${S} and ${SOLVE}. Evidence and identity carry across stages — one candidate, one continuous, consistent evaluation.`,
    } as Heading,
    details: {
      screen: 'AI technical screening with integrity checks and an evidence report.',
      takeHome: 'A real-world take-home, then a short interview defending it.',
      liveInterview: 'Your interviewers, with an AI copilot, a shared rubric and a calibrated panel.',
    },
  },

  trust: {
    heading: { eyebrow: 'Trust & transparency', title: 'AI assists. People decide.' } as Heading,
    items: [
      { icon: 'userCheck', title: 'Human in the loop', body: 'The interviewer runs the interview and owns the scorecard. The AI suggests and flags; it never decides.' },
      { icon: 'scroll', title: 'Candidate consent', body: 'Candidates are told an AI copilot is assisting and consent before the interview, including to recording.' },
      { icon: 'lock', title: 'Encrypted and retained on a schedule', body: 'Recordings and transcripts will follow the same encryption and retention controls as the rest of Levl1.' },
      { icon: 'scale', title: 'Honest about limits', body: 'It reduces bias and flags integrity concerns for review. No system removes bias entirely or catches everything.' },
    ] as Item[],
    link: { label: 'Read about security', href: ROUTES.security } as CTA,
  },

  earlyAccess: {
    heading: {
      eyebrow: 'Early access',
      title: `Help shape ${I}.`,
      lead: 'Tell us how your interview loop works today. Early-access teams will see it first and steer what we build.',
    } as Heading,
    note: `${I} is in development. Nothing on this page is available yet — ${S} and ${SOLVE} are, today.`,
    talk: { label: 'Prefer to talk it through? Talk to us', href: ROUTES.demo } as CTA,
  },

  /** Caption under the product previews — they show a product in development. */
  previewNote: 'Illustrative preview of a product in development.',
}
