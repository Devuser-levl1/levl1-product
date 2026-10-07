import { ROUTES } from '@/config/site'
import type { CTA, Heading, Item, SplitBlock } from './types'

// Every feature here is verified in the repo (see docs/website-restructure-plan.md §5).
export const hirepilot = {
  meta: {
    title: 'HirePilot — the AI-native ATS + CRM for recruitment teams',
    description: 'HirePilot runs your whole recruiting desk: AI job briefs and rubrics, résumé scoring (including scanned PDFs), explainable matching, pipeline, an agentic assistant with approvals, a unified inbox and client submissions.',
  },
  hero: {
    eyebrow: 'HirePilot · ATS + CRM',
    title: 'The AI-native ATS + CRM for recruitment teams that move fast.',
    highlight: 'that move fast.',
    lead: 'HirePilot runs your whole desk — briefs, screening, pipeline, client submissions and follow-ups — with AI doing the manual work and you approving what matters.',
    primary: { label: 'Book a demo', href: ROUTES.demo } as CTA,
    secondary: { label: 'Start a free trial', href: ROUTES.hirepilotTrial } as CTA,
    points: ['Use it on its own', 'Built for agencies and in-house teams', 'You approve what the AI does'],
  },
  splits: [
    {
      eyebrow: 'Briefs & rubrics',
      title: 'From a one-line nudge to a complete job brief.',
      lead: 'Describe the role in a sentence and HirePilot drafts a role-specific brief, then a weighted screening rubric you control.',
      bullets: ['AI job-brief generator', 'Weighted rubrics: must-haves, nice-to-haves, and how much each matters', 'Change a weight and re-score'],
      visual: 'hpBrief',
    },
    {
      eyebrow: 'Résumé parsing & scoring',
      title: 'Every résumé read and scored — even scanned PDFs.',
      lead: 'Résumés are parsed and scored against your rubric as they arrive. Image-based and scanned PDFs are read too, so nobody gets dropped for a bad file.',
      bullets: ['Scores against your rubric, not keywords', 'Matched and missing skills, with reasoning', 'Handles scanned and image-based PDFs'],
      visual: 'hpProfile',
    },
    {
      eyebrow: 'HireMatch',
      title: 'Matching that explains itself.',
      lead: 'HireMatch shows why a candidate fits a role, where the gaps are, and how each rubric weight moved the score.',
      bullets: ['Why they fit, in plain language', 'Skill gaps called out', 'Rubric-weighted, never a black box'],
      link: { label: 'About HireMatch', href: ROUTES.hirematch },
      visual: 'hpMatch',
    },
    {
      eyebrow: 'Lev, the agentic assistant',
      title: 'An assistant that does the work — after you say yes.',
      lead: 'Ask Lev to find candidates, update the pipeline or draft outreach. It proposes the action, you approve it, then it runs.',
      bullets: ['Acts across jobs, candidates and pipeline', 'Every action is a proposal until you approve it', 'Answers how-to questions about HirePilot'],
      visual: 'hpLev',
    },
    {
      eyebrow: 'Unified inbox',
      title: 'Email and WhatsApp, in one inbox.',
      lead: 'Connect your business mailbox and WhatsApp. Conversations sit next to the candidate they belong to, so nothing lives in someone’s personal phone.',
      bullets: ['Your own mailbox, connected', 'WhatsApp conversations alongside email', 'Linked to candidate records'],
      visual: 'hpInbox',
    },
  ] as SplitBlock[],
  more: {
    heading: { eyebrow: 'Everything else your desk runs on', title: 'One system, first brief to final invoice.' } as Heading,
    items: [
      { icon: 'kanban', title: 'Pipeline tracking', body: 'Drag-and-drop stages per job, with history on every move.' },
      { icon: 'send', title: 'Send to client', body: 'Select candidates and submit them to a client contact with a summary sheet.' },
      { icon: 'bell', title: 'AR nudges', body: 'Track receivables by client and send automatic payment reminders.' },
      { icon: 'heart', title: 'Candidate nurture', body: 'Scheduled post-placement check-ins, so you hear about problems early.' },
      { icon: 'dashboard', title: 'Team & performance', body: 'Assign jobs, see who is working on what, and track performance across the team.' },
      { icon: 'globe', title: 'Branded career pages', body: 'A careers page on your brand, with applications flowing straight into HirePilot.' },
      { icon: 'megaphone', title: 'One-click job posting', body: 'Publish jobs through your own job-board accounts in one step.' },
      { icon: 'lock', title: 'Roles & audit log', body: 'Role-based access for recruiters, managers and admins, with an audit trail of key actions.' },
    ] as Item[],
  },
  standalone: {
    heading: { eyebrow: 'On its own', title: 'A complete ATS + CRM. Nothing else required.', lead: 'HirePilot is a standalone product. Start a free trial yourself, or book a walkthrough on your own roles.' } as Heading,
  },
  cta: {
    title: 'Run your desk on HirePilot.',
    lead: 'Start a free trial, or let us walk you through it.',
    primary: { label: 'Book a demo', href: ROUTES.demo } as CTA,
    secondary: { label: 'Start a free trial', href: ROUTES.hirepilotTrial } as CTA,
  },
}
