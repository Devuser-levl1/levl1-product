// Shared types for the Levl1 capture extension.

export interface Settings {
  apiKey: string
  baseUrl: string            // e.g. https://levl1.io
  defaultJobId: string       // optional default Hire job for interviews
}

export const DEFAULT_BASE_URL = 'https://levl1.io'

// Best-effort fields scraped from a candidate page (only what's visible).
export interface Captured {
  name: string
  title: string              // headline / current title
  company: string
  location: string
  profileUrl: string
  email: string              // only if visibly present on the page
  phone: string              // only if visibly present on the page
  source: 'linkedin' | 'generic'
}

export interface Job { id: string; title: string }
