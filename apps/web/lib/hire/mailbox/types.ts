// Provider-agnostic mailbox connector interface. IMAP/SMTP implements it now;
// Google/Microsoft OAuth connectors slot in later behind the SAME shape, so
// callers never branch on provider.

// Decrypted, in-scope-only connection config. NEVER persist or log `password`.
export interface MailboxCfg {
  email: string
  password: string
  imapHost: string
  imapPort: number
  smtpHost: string
  smtpPort: number
}

export interface NormalizedMessage {
  uid: number
  fromAddr: string
  fromName?: string
  subject: string
  snippet: string
  bodyText: string
  receivedAt: Date
}

export interface SendInput {
  to: string
  subject: string
  html: string
  inReplyTo?: string
}

export interface MailboxConnector {
  provider: 'imap' | 'google' | 'microsoft'
  /** Verify both IMAP login and SMTP auth. */
  testConnection(cfg: MailboxCfg): Promise<{ ok: boolean; error?: string }>
  /** Pull messages newer than `sinceUid` (most-recent slice on first run). */
  fetchNew(cfg: MailboxCfg, sinceUid?: number): Promise<{ messages: NormalizedMessage[]; lastUid: number }>
  /** Send a 1:1 email from the recruiter's own address. */
  send(cfg: MailboxCfg, msg: SendInput): Promise<{ ok: boolean; messageId?: string; error?: string }>
}
