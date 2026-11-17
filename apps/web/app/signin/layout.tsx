import type { Metadata } from 'next'

// Default Levl1 favicon (no route-specific icons), and kept out of search.
export const metadata: Metadata = {
  title: 'Sign in — Levl1',
  robots: { index: false, follow: false },
}

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children
}
