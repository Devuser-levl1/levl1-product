'use client'

import { useState } from 'react'
import { Headphones } from 'lucide-react'
import { SupportModal } from './SupportModal'

type Tone = 'light' | 'dark' | 'sidebar'

interface ContactHelpdeskProps {
  /** Visual treatment for the surface it sits on. */
  tone?: Tone
  /** Pre-fill the reporter's email (e.g. the signed-in user). */
  defaultEmail?: string
  /** Override the label. Defaults to "Contact helpdesk". */
  label?: string
  style?: React.CSSProperties
}

const TONES: Record<Tone, React.CSSProperties> = {
  // On white / light backgrounds (login page).
  light: {
    color: '#6D28D9',
    background: 'transparent',
    border: '1px solid #E9E7F5',
  },
  // On dark backgrounds (marketing footer).
  dark: {
    color: '#C7CCEA',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.12)',
  },
  // Full-width nav item inside the app sidebar (dark).
  sidebar: {
    color: '#CBD5E1',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.10)',
  },
}

/**
 * Shared "Contact helpdesk" entry point — a headphone icon + text that opens
 * the support ticket modal (POST /api/support). Rendered identically on the
 * login page, marketing footer, and inside the app so support is one click
 * away from anywhere.
 */
export function ContactHelpdesk({ tone = 'light', defaultEmail, label = 'Contact helpdesk', style }: ContactHelpdeskProps) {
  const [open, setOpen] = useState(false)
  const base = TONES[tone]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: tone === 'sidebar' ? 'flex-start' : 'center',
          gap: 8,
          width: tone === 'sidebar' ? '100%' : undefined,
          padding: tone === 'sidebar' ? '9px 10px' : '8px 14px',
          borderRadius: 9,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: 'pointer',
          textDecoration: 'none',
          transition: 'opacity 0.15s',
          ...base,
          ...style,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8' }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
      >
        <Headphones size={15} style={{ flexShrink: 0 }} />
        {label}
      </button>
      <SupportModal open={open} onClose={() => setOpen(false)} defaultEmail={defaultEmail} />
    </>
  )
}
