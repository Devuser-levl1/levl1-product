import { PRODUCTS } from '@/config/site'

// Whitelisted OG card copy, keyed by page. /og?p=<key> only renders these —
// never arbitrary query text. `hirepilot` / `hirematch` stay as keys for the
// hidden (redirected) Hire pages, with neutral Levl1 copy.
export const OG_PAGES = {
  home: { eyebrow: 'Levl1', title: 'Interviews that show their work.' },
  screen: { eyebrow: `${PRODUCTS.screen.name} · Stage ${PRODUCTS.screen.stage}`, title: 'A first-round interviewer that can’t be fooled by a good story.' },
  screenDemo: { eyebrow: 'Live demo · no sign-up', title: 'Sit in the candidate’s chair.' },
  takeHome: { eyebrow: `${PRODUCTS.takeHome.name} · Coming soon`, title: 'Real work, not trivia.' },
  liveInterview: { eyebrow: `${PRODUCTS.liveInterview.name} · Coming soon`, title: 'Make every interviewer as good as your best one.' },
  integrity: { eyebrow: 'Integrity', title: 'Flags with evidence. A person makes the call.' },
  agencies: { eyebrow: 'For recruitment agencies', title: 'Verify before you submit.' },
  enterprise: { eyebrow: 'For engineering leaders', title: 'Give your engineers their first-round hours back.' },
  iaas: { eyebrow: 'Services', title: 'Interview-as-a-Service.' },
  customAssessments: { eyebrow: 'Services', title: 'Custom assessments, designed with your team.' },
  pricing: { eyebrow: 'Pricing', title: 'Plans that fit how you hire.' },
  security: { eyebrow: 'Security', title: 'How Levl1 handles your data.' },
  demo: { eyebrow: 'Talk to us', title: 'See Levl1 on your roles.' },
  legal: { eyebrow: 'Levl1', title: 'Legal' },
  hirepilot: { eyebrow: 'Levl1', title: 'Interviews that show their work.' },
  hirematch: { eyebrow: 'Levl1', title: 'Interviews that show their work.' },
} as const

export type OgPageKey = keyof typeof OG_PAGES
