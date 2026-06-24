import type { MailboxConnector } from './types'
import { imapConnector } from './imap-connector'

// Connector registry — mirror of lib/jobboards. Add a provider later = one new
// connector file + a registry entry; callers stay provider-agnostic.
const REGISTRY: Record<string, MailboxConnector> = {
  imap: imapConnector,
  // google: googleConnector,     // deferred (OAuth)
  // microsoft: microsoftConnector, // deferred (OAuth)
}

export function getConnector(provider: string): MailboxConnector | null {
  return REGISTRY[provider] ?? null
}

// Hostinger defaults to pre-fill the connect form.
export const HOSTINGER_DEFAULTS = { imapHost: 'imap.hostinger.com', imapPort: 993, smtpHost: 'smtp.hostinger.com', smtpPort: 465 }

// Free/consumer domains rejected on the IMAP path (OAuth handles these later).
const CONSUMER_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'yahoo.com', 'yahoo.co.in', 'ymail.com', 'icloud.com', 'me.com', 'mac.com',
  'proton.me', 'protonmail.com', 'aol.com', 'gmx.com', 'zoho.com', 'mail.com', 'rediffmail.com',
])

export function isBusinessEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1]
  if (!domain) return false
  return !CONSUMER_DOMAINS.has(domain)
}

export type { MailboxConnector, MailboxCfg, NormalizedMessage } from './types'
