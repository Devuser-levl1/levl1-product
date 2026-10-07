import { ROUTES } from '@/config/site'
import type { CTA, Heading, Item, Step } from './types'

export const integrity = {
  meta: {
    title: 'Integrity & fraud detection — Levl1 Screen',
    description: 'Screen flags behaviour consistent with outside help in technical interviews — with evidence — and sends every flag to human review. Nothing is auto-rejected, and integrity is scored separately from competency.',
  },
  hero: {
    eyebrow: 'Integrity',
    title: 'Integrity isn’t guesswork.',
    highlight: 'isn’t guesswork.',
    lead: 'Screen watches for the signals that matter in a remote technical interview and flags them with evidence. A person reviews every flag. Nothing is auto-rejected.',
    primary: { label: 'Book a demo', href: ROUTES.demo } as CTA,
    secondary: { label: 'Try a demo interview', href: ROUTES.screenDemo } as CTA,
  },
  signals: {
    heading: { eyebrow: 'What Screen looks for', title: 'Signals, not suspicion.', lead: 'Each signal is logged with a timestamp and detail, so a reviewer can see exactly what happened and when.' } as Heading,
    items: [
      { icon: 'eye', title: 'Visible proctoring', body: 'The candidate can see the camera is on. Screen notes when no face is present, attention leaves the screen, the tab changes, fullscreen exits or screen-share drops.' },
      { icon: 'bot', title: 'Assistance tools & overlays', body: 'Flags behaviour consistent with unauthorized assistance tools and on-screen overlay assistants — such as reading-pattern eye movement or answers delivered as if read aloud.' },
      { icon: 'paste', title: 'Paste-origin checks', body: 'Large, pre-formed blocks pasted into the code editor are flagged with their size and timing.' },
      { icon: 'timer', title: 'Latency anomalies', body: 'Response-timing patterns consistent with looking answers up elsewhere are flagged for review.' },
      { icon: 'scanFace', title: 'Multiple faces', body: 'Another person appearing in frame is recorded with when and for how long.' },
      { icon: 'mic', title: 'Outside help by voice', body: 'After the interview, the recording is checked for a second or whispering voice. Findings go to review only.' },
    ] as Item[],
  },
  principles: {
    heading: { eyebrow: 'Principles', title: 'Flag, show, let a person decide.' } as Heading,
    items: [
      { icon: 'userCheck', title: 'Every flag goes to human review', body: 'Flags are inputs for your reviewers, not verdicts.' },
      { icon: 'shield', title: 'Never auto-disqualified', body: 'No candidate is rejected automatically because of an integrity flag.' },
      { icon: 'layers', title: 'Scored separately', body: 'Integrity never moves the competency score. Reviewers see both, side by side.' },
      { icon: 'file', title: 'Evidence attached', body: 'Each flag carries its timestamp, duration and detail, so decisions can be explained.' },
    ] as Item[],
  },
  honesty: 'No system can detect every form of assistance. Screen’s job is to surface evidence so your reviewers can make a fair, informed call.',
  cta: {
    title: 'See an integrity review for yourself.',
    primary: { label: 'Book a demo', href: ROUTES.demo } as CTA,
    secondary: { label: 'Explore Screen', href: ROUTES.screen } as CTA,
  },
}

export const hirematch = {
  meta: {
    title: 'HireMatch — explainable candidate–job matching in HirePilot',
    description: 'HireMatch explains why a candidate fits a role, where the gaps are, and how your rubric weights shaped the score. Verify, don’t filter.',
  },
  hero: {
    eyebrow: 'HireMatch · in HirePilot',
    title: 'Verify, don’t filter.',
    highlight: 'don’t filter.',
    lead: 'HireMatch explains why a candidate fits a role — and where they don’t — using the weighted rubric your team sets. Every score shows its working.',
    primary: { label: 'Book a demo', href: ROUTES.demo } as CTA,
    secondary: { label: 'Explore HirePilot', href: ROUTES.hirepilot } as CTA,
  },
  how: {
    heading: { eyebrow: 'Explainable by design', title: 'A match score you can argue with.', lead: 'Matching should point your attention, not make decisions out of sight.' } as Heading,
    items: [
      { icon: 'target', title: 'Why they fit', body: 'Matched skills with the evidence from the résumé, in plain language.' },
      { icon: 'alert', title: 'Skill gaps, called out', body: 'Missing or thin areas are listed, so you know what to probe in conversation.' },
      { icon: 'sliders', title: 'Rubric-weighted scores', body: 'The weights your team sets decide what matters. Change a weight and re-score.' },
      { icon: 'eye', title: 'No black box', body: 'Every score is broken down by rubric line. Nothing is hidden behind a single number.' },
      { icon: 'workflow', title: 'Both directions', body: 'Find the best candidates for a job, or the best jobs for a candidate.' },
      { icon: 'userCheck', title: 'Verify, don’t filter', body: 'Use the ranking to decide who to look at first — a recruiter still decides who moves forward.' },
    ] as Item[],
  },
  steps: {
    heading: { eyebrow: 'How it works', title: 'Set the bar. See the reasons. Decide.' } as Heading,
    items: [
      { title: 'Set the rubric', body: 'Must-haves, nice-to-haves and weights for the role.' },
      { title: 'HireMatch scores and explains', body: 'Each candidate gets a score with the reasons and the gaps.' },
      { title: 'You verify', body: 'Check the reasoning, probe the gaps, and move the right people forward.' },
    ] as Step[],
  },
  cta: {
    title: 'See HireMatch on your own roles.',
    primary: { label: 'Book a demo', href: ROUTES.demo } as CTA,
    secondary: { label: 'Start a free trial', href: ROUTES.hirepilotTrial } as CTA,
  },
}
