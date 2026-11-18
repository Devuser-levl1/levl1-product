import type { Metadata } from 'next'

// Candidate take-home links are private — keep them out of search engines.
export const metadata: Metadata = { title: 'Take-home assessment', robots: { index: false, follow: false } }

export default function SolveTokenLayout({ children }: { children: React.ReactNode }) {
  return children
}
