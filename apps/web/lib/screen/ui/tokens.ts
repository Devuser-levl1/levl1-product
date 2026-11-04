// ── Screen design tokens for inline styles (Design-System Pass 1) ──────────
// The Screen app styles mostly via inline `style={{…}}`. This mirrors
// app/screen-tokens.css as CSS-variable references, so components write
// `color: lv.text` instead of a hex — and dark mode (later) is one switch.
// Values live ONLY in screen-tokens.css; this file never holds raw colours.

const v = (name: string) => `var(--lv-${name})`

export const lv = {
  // brand
  brand: v('brand'), brandHover: v('brand-hover'), brandActive: v('brand-active'),
  brandSoft: v('brand-soft'), brandSoftBorder: v('brand-soft-border'), brandText: v('brand-text'),
  onBrand: v('on-brand'), accent: v('accent'), accentSoft: v('accent-soft'), gradientBrand: v('gradient-brand'),
  // text
  text: v('text'), textBody: v('text-body'), textMuted: v('text-muted'), textSubtle: v('text-subtle'), textInverse: v('text-inverse'),
  // surfaces + borders
  bg: v('bg'), surface: v('surface'), surfaceSunken: v('surface-sunken'), surfaceMuted: v('surface-muted'), overlay: v('overlay'),
  border: v('border'), borderStrong: v('border-strong'), borderControl: v('border-control'), borderFocus: v('border-focus'),
  // semantic
  success: v('success'), successSoft: v('success-soft'), successBorder: v('success-border'),
  warning: v('warning'), warningSoft: v('warning-soft'), warningBorder: v('warning-border'),
  danger: v('danger'), dangerHover: v('danger-hover'), dangerSoft: v('danger-soft'), dangerBorder: v('danger-border'),
  info: v('info'), infoSoft: v('info-soft'), infoBorder: v('info-border'),
  // focus + elevation
  focusRing: v('focus-ring'), focusOutline: v('focus-outline'),
  shadowSm: v('shadow-sm'), shadowMd: v('shadow-md'), shadowLg: v('shadow-lg'),
  // type
  fontSans: v('font-sans'), fontDisplay: v('font-display'), fontMono: v('font-mono'),
  // motion
  ease: v('ease'), durFast: v('dur-fast'), dur: v('dur'),
} as const

/** Spacing scale (px) — 4px base. Use numbers in inline styles: padding: space[4]. */
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const

/** Type scale (px) — the ONLY font sizes Screen UI should use. */
export const text = { '2xs': 11, xs: 12, sm: 13, base: 14, md: 16, lg: 18, xl: 22, '2xl': 28 } as const

/** Weights — the system stops at 600; `bold` is kept as an alias of semibold. */
export const weight = { regular: 400, medium: 500, semibold: 600, bold: 600 } as const

/** Corner radii (px). sm = badges/checkboxes, md = buttons/inputs, lg = cards/modals. */
export const radius = { sm: 4, md: 6, lg: 8, pill: 999 } as const

/** Control sizing (px). Compact controls must still give a 44px hit area. */
export const size = { control: 40, controlSm: 32, touch: 44, contentMax: 1200, gutter: 32 } as const

export const z = { sticky: 40, sidebar: 50, overlay: 80, modal: 90, toast: 100 } as const
