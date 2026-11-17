// ── Marketing site config — single source of truth for brand, URLs, nav ────
// Copy lives in content/*.ts; this file holds the facts every page shares.

/** Canonical marketing origin. Separate from NEXT_PUBLIC_APP_URL so the app
 *  can move to its own subdomain later without changing canonicals. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://levl1.io').replace(/\/$/, '')

export const SITE_NAME = 'Levl1'
export const CONTACT_EMAIL = 'hello@levl1.io'

/** How long a production Screen interview takes, as marketed. The engine's
 *  default envelope is 30 min (lib/screen/session/duration.ts, env-overridable).
 *  Change it here only. */
export const INTERVIEW_LENGTH_LABEL = '~30 minutes'

// ── Products — the technical hiring funnel. ALL product names live here. ──────
// Slugs are functional and don't change with names.
export type ProductKey = 'screen' | 'takeHome' | 'liveInterview'
export interface Product { name: string; stage: number; tagline: string; status: 'live' | 'soon'; href: string }

export const PRODUCTS: Record<ProductKey, Product> = {
  screen: { name: 'Screen', stage: 1, tagline: 'AI technical interviews', status: 'live', href: '/products/screen' },
  takeHome: { name: 'Take-Home', stage: 2, tagline: 'Real-world async tasks, auto-evaluated', status: 'soon', href: '/products/take-home' },
  liveInterview: { name: 'Live Interview', stage: 3, tagline: 'Human interviews with an AI copilot', status: 'soon', href: '/products/live-interview' },
}
export const PRODUCT_ORDER: ProductKey[] = ['screen', 'takeHome', 'liveInterview']
export const SOON_LABEL = 'Coming soon'
export const LIVE_LABEL = 'Available now'

export const ROUTES = {
  home: '/',
  screen: PRODUCTS.screen.href,
  screenDemo: '/products/screen/demo',
  takeHome: PRODUCTS.takeHome.href,
  liveInterview: PRODUCTS.liveInterview.href,
  integrity: '/features/integrity',
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
  signIn: '/signin',
  // Existing product auth route — linked, never moved.
  screenSignIn: '/interviews/login',
  // Hire (HirePilot) is hidden from the site; these keys stay only so the
  // untouched HirePilot/HireMatch marketing files keep compiling.
  hirepilot: '/products/hirepilot',
  hirematch: '/features/hirematch',
  hirepilotSignIn: '/hire/login',
  hirepilotTrial: '/hire/signup',
} as const

export type IconName =
  | 'mic' | 'code' | 'pen' | 'users' | 'clock' | 'calendar' | 'file' | 'shield' | 'eye' | 'scanFace'
  | 'paste' | 'timer' | 'gauge' | 'sparkles' | 'bot' | 'inbox' | 'send' | 'bell' | 'heart' | 'dashboard'
  | 'globe' | 'megaphone' | 'briefcase' | 'building' | 'target' | 'lock' | 'key' | 'userCheck' | 'scroll'
  | 'server' | 'workflow' | 'message' | 'layers' | 'list' | 'scale' | 'search' | 'brain' | 'handshake'
  | 'wand' | 'video' | 'play' | 'alert' | 'fingerprint' | 'sliders' | 'kanban' | 'mail' | 'puzzle'
  | 'badge' | 'hourglass' | 'clipboard' | 'chart' | 'compass' | 'terminal' | 'monitor' | 'download'
  | 'trash' | 'route' | 'filter' | 'zap'

export interface NavLink { label: string; href: string; desc?: string; icon?: IconName; badge?: string }
export interface NavGroup { label: string; columns: { title?: string; links: NavLink[] }[]; footer?: NavLink }

const productLink = (k: ProductKey, icon: IconName): NavLink => ({
  label: PRODUCTS[k].name,
  href: PRODUCTS[k].href,
  icon,
  desc: PRODUCTS[k].tagline,
  badge: PRODUCTS[k].status === 'soon' ? SOON_LABEL : undefined,
})

export const TRY_LIVE = { label: 'Try a live interview', href: ROUTES.screenDemo }
export const TALK_TO_US = { label: 'Talk to us', href: ROUTES.demo }

export const NAV: NavGroup[] = [
  {
    label: 'Products',
    columns: [
      { title: 'Your technical hiring funnel', links: [productLink('screen', 'mic'), productLink('takeHome', 'terminal'), productLink('liveInterview', 'video')] },
      { title: 'Platform', links: [
        { label: 'Integrity', href: ROUTES.integrity, icon: 'shield', desc: 'Flags with evidence, reviewed by a person.' },
        { label: 'Security', href: ROUTES.security, icon: 'lock', desc: 'How candidate data is protected.' },
      ] },
    ],
    footer: { label: 'Try a live interview — no sign-up', href: ROUTES.screenDemo },
  },
  {
    label: 'Solutions',
    columns: [{ links: [
      { label: 'For Engineering Leaders', href: ROUTES.enterprise, icon: 'building', desc: 'Deeper signal, and your engineers’ time back.' },
      { label: 'For Recruitment Agencies', href: ROUTES.agencies, icon: 'briefcase', desc: 'Verify technical candidates before you submit.' },
    ] }],
  },
  {
    label: 'Services',
    columns: [{ links: [
      { label: 'Interview-as-a-Service', href: ROUTES.iaas, icon: 'users', desc: 'Expert interviewers for your later rounds.' },
      { label: 'Custom Assessments', href: ROUTES.customAssessments, icon: 'puzzle', desc: 'Role-specific questions and rubrics, built with you.' },
    ] }],
  },
]

const footerProduct = (k: ProductKey): NavLink => ({ label: PRODUCTS[k].name, href: PRODUCTS[k].href, badge: PRODUCTS[k].status === 'soon' ? 'Soon' : undefined })

export const FOOTER: { title: string; links: NavLink[] }[] = [
  { title: 'Products', links: [...PRODUCT_ORDER.map(footerProduct), TRY_LIVE] },
  { title: 'Platform', links: [
    { label: 'Integrity', href: ROUTES.integrity },
    { label: 'Security', href: ROUTES.security },
    { label: 'Pricing', href: ROUTES.pricing },
  ] },
  { title: 'Solutions', links: [
    { label: 'For Engineering Leaders', href: ROUTES.enterprise },
    { label: 'For Recruitment Agencies', href: ROUTES.agencies },
  ] },
  { title: 'Services', links: [
    { label: 'Interview-as-a-Service', href: ROUTES.iaas },
    { label: 'Custom Assessments', href: ROUTES.customAssessments },
  ] },
  { title: 'Company', links: [
    { label: 'Contact', href: ROUTES.demo },
    { label: 'Privacy', href: ROUTES.privacy },
    { label: 'Terms', href: ROUTES.terms },
    { label: 'Cookies', href: ROUTES.cookies },
  ] },
]
