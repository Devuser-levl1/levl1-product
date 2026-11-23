import { PRODUCTS, ROUTES, TALK_TO_US } from '@/config/site'
import type { CTA, Heading, Item, SplitBlock, Step } from './types'

// Solve (Stage 2) — LIVE product page. Present tense: everything here exists
// in the product today (lib/screen/solve/*). Keep it that way — if a claim
// isn't built, it doesn't go on this page.

const NAME = PRODUCTS.takeHome.name
const SET_UP: CTA = { label: 'Sign in to set it up', href: ROUTES.signIn }

export const solve = {
  meta: {
    title: `${NAME} — take-home assessments that can’t be faked — Levl1`,
    description: `${NAME} gives candidates a real-world task to solve on their own time in a browser coding workspace, runs it against your tests, scores it against your rubric, then has them defend their own code in a short AI interview.`,
  },
  hero: {
    badge: `Stage ${PRODUCTS.takeHome.stage} · Available now`,
    badgeTone: 'live' as const,
    title: 'A take-home they have to defend.',
    lead: `${NAME} sends a real-world task the candidate solves on their own time. It runs against your tests, gets scored against your rubric, and ends with a short spoken interview about the code they wrote — so a submission they didn’t write doesn’t get through.`,
    primary: TALK_TO_US as CTA,
    secondary: SET_UP,
    microcopy: `Part of ${PRODUCTS.screen.name} workspaces — turn it on per position.`,
  },
  how: {
    heading: { eyebrow: 'How it works', title: 'Async, but accountable.' } as Heading,
    items: [
      { icon: 'terminal', title: 'Solve', body: 'A realistic task in a browser coding workspace, within a window you set. Work saves as they go; time running out submits what they have.' },
      { icon: 'list', title: 'Evaluated', body: 'Every test runs on the submitted code, hidden ones included. Empty or starter-only submissions are flagged, never scored.' },
      { icon: 'message', title: 'Defended', body: 'A short spoken interview about their own code: why this approach, walk me through this part, what breaks at scale.' },
    ] as Item[],
  },
  work: {
    eyebrow: 'The task',
    title: 'Real work, in a real workspace.',
    lead: 'Tasks come from your reviewed task bank or are drafted from the job description with tests verified by running them. Nothing goes to a candidate until someone on your team approves it.',
    bullets: [
      'Choose the window, the time limit and the languages',
      'Run code and tests in the browser; hidden tests stay hidden',
      'A timeline of how the solution came together, not just the result',
    ],
    visual: 'snipCode',   // the same editor + test runner as the Screen work sample (the hero shows the full Solve workspace)
  } as SplitBlock,
  ai: {
    heading: { eyebrow: 'AI, on your terms', title: 'Decide whether AI is allowed. Either way, you see what happened.' } as Heading,
    items: [
      { icon: 'bot', title: 'AI allowed', body: 'A built-in assistant in the editor. The report scores AI fluency: how they broke the problem down, what they asked, whether they checked the answers and caught its mistakes.' },
      { icon: 'shield', title: 'AI not allowed', body: 'The submitted code and how it was written are checked for signs of AI generation. Any flag goes to a person, with the evidence.' },
      { icon: 'message', title: 'Either way, defended', body: 'In the defense interview they explain their code in their own words, including the parts that came from AI.' },
    ] as Item[],
  },
  report: {
    eyebrow: 'The report',
    title: 'A recommendation first. Then the evidence.',
    lead: 'Built for the debrief, the same way as the Screen report.',
    bullets: [
      'Verdict up front, gated by your must-have, good-to-have and add-on rubrics',
      'Correctness, approach, critical thinking, defense and AI fluency, scored separately',
      'Every claim linked to a moment in the work or a line of the defense',
      'Integrity signals for review — never an automatic rejection',
    ],
    visual: 'solveReport',
  } as SplitBlock,
  steps: [
    { title: 'Turn it on for a position', body: 'Pick or generate a task, approve it, set the window.' },
    { title: 'Send it to candidates', body: `Usually the ones who passed ${PRODUCTS.screen.name}. Each gets a private link; no account needed.` },
    { title: 'Read the report', body: 'Submission, tests, timeline, AI use and the defense, in one place.' },
  ] as Step[],
  cta: {
    title: 'See it on one of your roles.',
    lead: `We’ll set ${NAME} up on a real job description with you.`,
    primary: TALK_TO_US as CTA,
    secondary: SET_UP,
  },
}
