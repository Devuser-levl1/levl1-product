import { notFound } from 'next/navigation'
import { Gallery } from './gallery'

// Dev-only design-system gallery (Design-System Pass 2) — 404 in production.
export default function DevUiPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <Gallery />
}
