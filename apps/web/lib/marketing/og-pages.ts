// Whitelisted OG card copy, keyed by page. /og?p=<key> only renders these —
// never arbitrary query text.
export const OG_PAGES = {
  home: { eyebrow: 'Levl1', title: 'Technical interviews that run themselves — and show their work.' },
  screen: { eyebrow: 'Levl1 Screen', title: 'A first-round technical interviewer that never gets tired, rushed, or biased.' },
  screenDemo: { eyebrow: 'Levl1 Screen', title: 'Try a real AI technical interview.' },
  hirepilot: { eyebrow: 'HirePilot', title: 'The AI-native ATS + CRM for recruitment teams that move fast.' },
  integrity: { eyebrow: 'Integrity', title: 'Flags with evidence. A human makes the call.' },
  hirematch: { eyebrow: 'HireMatch', title: 'Explainable matching. Verify, don’t filter.' },
  agencies: { eyebrow: 'For Agencies', title: 'Run your desk. Verify before you submit.' },
  enterprise: { eyebrow: 'For Enterprise', title: 'Give your engineers their first-round hours back.' },
  iaas: { eyebrow: 'Services', title: 'Interview-as-a-Service, powered by Levl1.' },
  customAssessments: { eyebrow: 'Services', title: 'Custom assessments, designed with your team.' },
  pricing: { eyebrow: 'Pricing', title: 'Plans for Screen and HirePilot.' },
  security: { eyebrow: 'Security', title: 'How Levl1 handles your data.' },
  demo: { eyebrow: 'Book a demo', title: 'See Levl1 on your roles.' },
  legal: { eyebrow: 'Levl1', title: 'Legal' },
} as const

export type OgPageKey = keyof typeof OG_PAGES
