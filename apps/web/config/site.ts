// ── Marketing site config — single source of truth for brand, URLs, nav ────
// Copy lives in content/*.ts; this file holds the facts every page shares.

/** Canonical marketing origin. Separate from NEXT_PUBLIC_APP_URL so the app
 *  can move to its own subdomain later without changing canonicals. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://levl1.io').replace(/\/$/, '')

export const SITE_NAME = 'Levl1'
export const LEGAL_ENTITY = 'Avdima Technologies Pvt Ltd'
export const CONTACT_EMAIL = 'hello@levl1.io'

/** How long a production Screen interview takes, as marketed. The engine's
 *  envelope is 18 min (lib/screen/session/duration.ts); the label rounds up
 *  to cover the automatic interface tour. Change it here only. */
export const INTERVIEW_LENGTH_LABEL = '~20 minutes'

export const PRODUCT_NAMES = {
  screen: 'Levl1 Screen',
  screenShort: 'Screen',
  hirepilot: 'HirePilot',
} as const

export const ROUTES = {
  home: '/',
  screen: '/products/screen',
  screenDemo: '/products/screen/demo',
  hirepilot: '/products/hirepilot',
  integrity: '/features/integrity',
  hirematch: '/features/hirematch',
  agencies: '/solutions/agencies',
  enterprise: '/solutions/enterprise',
  iaas: '/services/interview-as-a-service',
  customAssessments: '/services/custom-assessments',
  pricing: '/pricing',
  security: '/security',
  demo: '/demo',
  privacy: '/privacy',
  terms: '/terms',
  cookies: '/cookies',
  // Existing product auth routes — linked, never moved.
  screenSignIn: '/interviews/login',
  hirepilotSignIn: '/hire/login',
  hirepilotTrial: '/hire/signup',
} as const

export type IconName =
  | 'mic' | 'code' | 'pen' | 'users' | 'clock' | 'calendar' | 'file' | 'shield' | 'eye' | 'scanFace'
  | 'paste' | 'timer' | 'gauge' | 'sparkles' | 'bot' | 'inbox' | 'send' | 'bell' | 'heart' | 'dashboard'
  | 'globe' | 'megaphone' | 'briefcase' | 'building' | 'target' | 'lock' | 'key' | 'userCheck' | 'scroll'
  | 'server' | 'workflow' | 'message' | 'layers' | 'list' | 'scale' | 'search' | 'brain' | 'handshake'
  | 'wand' | 'video' | 'play' | 'alert' | 'fingerprint' | 'sliders' | 'kanban' | 'mail' | 'puzzle'
  | 'badge' | 'hourglass' | 'clipboard' | 'chart' | 'compass'

export interface NavLink { label: string; href: string; desc?: string; icon?: IconName }
export interface NavGroup { label: string; columns: { title?: string; links: NavLink[] }[] }

export const NAV: NavGroup[] = [
  {
    label: 'Products',
    columns: [
      {
        title: 'Products',
        links: [
          { label: 'Screen', href: ROUTES.screen, icon: 'mic', desc: 'AI-led technical interviews with live coding and a whiteboard.' },
          { label: 'HirePilot', href: ROUTES.hirepilot, icon: 'kanban', desc: 'The AI-native ATS + CRM for recruitment teams.' },
        ],
      },
      {
        title: 'Features',
        links: [
          { label: 'Integrity', href: ROUTES.integrity, icon: 'shield', desc: 'Evidence-backed flags, reviewed by a human.' },
          { label: 'HireMatch', href: ROUTES.hirematch, icon: 'scale', desc: 'Explainable candidate–job matching.' },
        ],
      },
    ],
  },
  {
    label: 'Solutions',
    columns: [{
      links: [
        { label: 'For Agencies', href: ROUTES.agencies, icon: 'briefcase', desc: 'Run your desk and verify before you submit.' },
        { label: 'For Enterprise', href: ROUTES.enterprise, icon: 'building', desc: 'Give engineering its first-round hours back.' },
      ],
    }],
  },
  {
    label: 'Services',
    columns: [{
      links: [
        { label: 'Interview-as-a-Service', href: ROUTES.iaas, icon: 'users', desc: 'Expert interviewers for your later rounds.' },
        { label: 'Custom Assessments', href: ROUTES.customAssessments, icon: 'puzzle', desc: 'Role-specific questions and rubrics, built with you.' },
      ],
    }],
  },
]

export const SIGN_IN: NavLink[] = [
  { label: 'Screen', href: ROUTES.screenSignIn, desc: 'Interviews, candidates and reports.' },
  { label: 'HirePilot', href: ROUTES.hirepilotSignIn, desc: 'Your recruiting workspace.' },
]

export const FOOTER: { title: string; links: NavLink[] }[] = [
  { title: 'Products', links: [
    { label: 'Screen', href: ROUTES.screen },
    { label: 'HirePilot', href: ROUTES.hirepilot },
    { label: 'Try a demo interview', href: ROUTES.screenDemo },
  ] },
  { title: 'Features', links: [
    { label: 'Integrity', href: ROUTES.integrity },
    { label: 'HireMatch', href: ROUTES.hirematch },
  ] },
  { title: 'Solutions', links: [
    { label: 'For Agencies', href: ROUTES.agencies },
    { label: 'For Enterprise', href: ROUTES.enterprise },
  ] },
  { title: 'Services', links: [
    { label: 'Interview-as-a-Service', href: ROUTES.iaas },
    { label: 'Custom Assessments', href: ROUTES.customAssessments },
  ] },
  { title: 'Company', links: [
    { label: 'Pricing', href: ROUTES.pricing },
    { label: 'Security', href: ROUTES.security },
    { label: 'Privacy', href: ROUTES.privacy },
    { label: 'Terms', href: ROUTES.terms },
    { label: 'Cookies', href: ROUTES.cookies },
    { label: 'Contact', href: ROUTES.demo },
  ] },
]
