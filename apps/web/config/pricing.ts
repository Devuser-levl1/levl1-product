// ── Pricing config — plan names + inclusions only ──────────────────────────
// No figures are published. Each plan has an optional `price`; while it is
// empty the UI renders "Contact for pricing". To switch prices on later, fill
// `price` (and optionally `priceNote`) here — no page changes needed.

export interface Plan {
  id: string
  name: string
  tagline: string
  /** Leave undefined/empty to show "Contact for pricing". */
  price?: string
  priceNote?: string
  includes: string[]
  highlighted?: boolean
  cta: { label: string; href: string }
  secondaryCta?: { label: string; href: string }
}

export interface PricingProduct {
  id: 'screen' | 'hirepilot'
  label: string
  summary: string
  unit: string
  plans: Plan[]
}

export const CONTACT_FOR_PRICING = 'Contact for pricing'

const TALK_TO_SALES = { label: 'Talk to sales', href: '/demo' }
const START_TRIAL = { label: 'Start a free trial', href: '/hire/signup' }

export const PRICING: PricingProduct[] = [
  {
    id: 'screen',
    label: 'Screen',
    summary: 'AI-led first-round technical interviews. Buy interviews as you need them, or commit to volume.',
    unit: 'Per interview',
    plans: [
      {
        id: 'screen-credits',
        name: 'Pay-as-you-go credit packs',
        tagline: 'For teams hiring in bursts, or trying Screen on live roles.',
        includes: [
          'Voice interviews with live coding and a whiteboard',
          'Question banks your team approves',
          'Scored, evidence-backed reports',
          'Integrity flags for human review',
          'Consent and scheduling by email and WhatsApp',
        ],
        cta: TALK_TO_SALES,
      },
      {
        id: 'screen-volume',
        name: 'Volume plans',
        tagline: 'For steady, high-volume technical hiring.',
        highlighted: true,
        includes: [
          'Everything in credit packs',
          'Committed interview volume',
          'Custom question banks and rubrics',
          'Dedicated onboarding',
          'Priority support',
        ],
        cta: TALK_TO_SALES,
      },
    ],
  },
  {
    id: 'hirepilot',
    label: 'HirePilot',
    summary: 'The AI-native ATS + CRM. Priced per seat.',
    unit: 'Per seat',
    plans: [
      {
        id: 'hp-launch',
        name: 'Launch',
        tagline: 'For small desks getting organised.',
        includes: [
          'Jobs, pipeline and candidate database',
          'AI job briefs and weighted screening rubrics',
          'Résumé parsing and AI scoring, including scanned PDFs',
          'Branded career pages',
          'Email support',
        ],
        cta: TALK_TO_SALES,
        secondaryCta: START_TRIAL,
      },
      {
        id: 'hp-scale',
        name: 'Scale',
        tagline: 'For growing agencies and recruiting teams.',
        highlighted: true,
        includes: [
          'Everything in Launch',
          'HireMatch explainable matching',
          'Lev, the agentic assistant, with approvals',
          'Unified inbox for email and WhatsApp',
          'Client CRM, submissions and AR nudges',
          'Candidate nurture',
          'Team management and performance dashboard',
        ],
        cta: TALK_TO_SALES,
        secondaryCta: START_TRIAL,
      },
      {
        id: 'hp-enterprise',
        name: 'Enterprise',
        tagline: 'For large teams with specific requirements.',
        includes: [
          'Everything in Scale',
          'Role-based access and audit log',
          'Job posting through your own board accounts',
          'Guided onboarding and data import',
          'Dedicated support',
        ],
        cta: TALK_TO_SALES,
      },
    ],
  },
]
