// Plain (non-'use client') design tokens so SERVER components can import `H`
// without "dotting into a client module" RSC errors. The client-only primitives
// (Button, Card, …) live in hire-kit.tsx and re-export these.

export const H = {
  // Brand accent (violet)
  primary: '#6D28D9',
  primaryBright: '#7C3AED',
  primary400: '#A78BFA',
  primaryTint: 'rgba(109,40,217,0.08)',
  primaryTintBorder: 'rgba(109,40,217,0.20)',
  // Neutrals (shared platform scale)
  ink: '#0F172A',
  body: '#334155',
  muted: '#475569',
  faint: '#64748B',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  surface: '#F8FAFC',
  white: '#FFFFFF',
  // Status
  green: '#059669', amber: '#D97706', red: '#DC2626',
  // Radius / shadow
  radius: 14, radiusSm: 10, radiusBtn: 9, pill: 100,
  shadow: '0 1px 2px rgba(15,23,42,0.04)',
  shadowCard: '0 1px 3px rgba(15,23,42,0.06)',
  shadowPop: '0 16px 40px -12px rgba(15,23,42,0.22)',
} as const
