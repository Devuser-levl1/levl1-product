import { ImapFlow, type FetchMessageObject } from 'imapflow'
import nodemailer from 'nodemailer'
import type { MailboxConnector, MailboxCfg, NormalizedMessage, SendInput } from './types'

// First-sync cap so connecting a years-old mailbox doesn't pull thousands.
const FIRST_SYNC_LIMIT = 30
const BODY_MAX = 20_000
const SNIPPET_MAX = 200

// Universal TLS rule derived from the PORT — no per-provider code:
//   465 → implicit SSL/TLS (secure)            993 → implicit SSL/TLS (IMAP)
//   587 → STARTTLS (secure:false, requireTLS)  143 → STARTTLS (IMAP)
// Works for any host (Hostinger, GoDaddy, Zoho, cPanel, O365, Gmail, …).
function makeImap(cfg: MailboxCfg): ImapFlow {
  return new ImapFlow({
    host: cfg.imapHost,
    port: cfg.imapPort,
    secure: cfg.imapPort === 993, // 143 → imapflow negotiates STARTTLS
    auth: { user: cfg.email, pass: cfg.password },
    logger: false, // never let the IMAP lib log credentials
  })
}

function makeSmtp(cfg: MailboxCfg) {
  const secure = cfg.smtpPort === 465
  return nodemailer.createTransport({
    host: cfg.smtpHost,
    port: cfg.smtpPort,
    secure, // 465 → implicit SSL
    requireTLS: !secure, // 587/others → upgrade via STARTTLS
    auth: { user: cfg.email, pass: cfg.password },
  })
}

// Host-agnostic error classification: blocked/timeout vs auth vs TLS handshake.
function classifyError(e: unknown, stage: 'IMAP' | 'SMTP'): string {
  const raw = (e instanceof Error ? e.message : String(e)) + ' ' + ((e as { code?: string })?.code ?? '')
  const m = raw.toLowerCase()
  if (/etimedout|timed? ?out|econnrefused|enotfound|ehostunreach|enetunreach|econnreset|dns/.test(m)) {
    return `${stage}: connection blocked or timed out — check the host/port and that your network/firewall allows outbound mail.`
  }
  if (/auth|login|credential|535|password|invalid user|535-|authenticationfailed|invalid login/.test(m)) {
    return `${stage}: authentication rejected — check the email and password (use an app password if your provider requires one).`
  }
  if (/tls|ssl|handshake|certificate|self.?signed|wrong version|ssl routines|epROTO|unable to verify/.test(m)) {
    return `${stage}: TLS handshake error — the port's encryption mode may be wrong (use 465 for SSL, or 587/STARTTLS).`
  }
  return `${stage}: ${raw.replace(/\s+/g, ' ').trim().slice(0, 160)}`
}

function stripHtml(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim()
}

function decodeBuf(buf: Buffer, encoding?: string): string {
  const enc = (encoding || '').toLowerCase()
  if (enc === 'base64') return Buffer.from(buf.toString('utf8'), 'base64').toString('utf8')
  if (enc === 'quoted-printable') {
    return buf.toString('utf8')
      .replace(/=\r?\n/g, '')
      .replace(/=([A-Fa-f0-9]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  }
  return buf.toString('utf8')
}

// Walk the IMAP bodyStructure to find the best text part (prefer text/plain).
interface BodyNode { part?: string; type?: string; encoding?: string; childNodes?: BodyNode[] }
function pickTextPart(node: BodyNode | undefined): { part: string; type: string; encoding?: string } | null {
  if (!node) return null
  const visit = (n: BodyNode, preferPlain: boolean): { part: string; type: string; encoding?: string } | null => {
    if (n.childNodes && n.childNodes.length) {
      for (const c of n.childNodes) { const r = visit(c, preferPlain); if (r) return r }
      return null
    }
    const type = (n.type || '').toLowerCase()
    if (preferPlain && type === 'text/plain') return { part: n.part || '1', type, encoding: n.encoding }
    if (!preferPlain && type.startsWith('text/')) return { part: n.part || '1', type, encoding: n.encoding }
    return null
  }
  return visit(node, true) || visit(node, false)
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const c of stream) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c))
  return Buffer.concat(chunks)
}

async function fetchBodyText(client: ImapFlow, uid: number, bodyStructure: BodyNode | undefined): Promise<string> {
  try {
    const part = pickTextPart(bodyStructure)
    const partId = part?.part ?? '1'
    const dl = await client.download(String(uid), partId, { uid: true })
    if (!dl?.content) return ''
    const buf = await streamToBuffer(dl.content)
    let text = decodeBuf(buf, part?.encoding)
    if ((part?.type || '').includes('html')) text = stripHtml(text)
    return text.slice(0, BODY_MAX).trim()
  } catch {
    return ''
  }
}

export const imapConnector: MailboxConnector = {
  provider: 'imap',

  async testConnection(cfg: MailboxCfg) {
    // 1) IMAP login
    const client = makeImap(cfg)
    try {
      await client.connect()
    } catch (e) {
      return { ok: false, error: classifyError(e, 'IMAP') }
    } finally {
      try { await client.logout() } catch { /* ignore */ }
    }
    // 2) SMTP auth
    try {
      const smtp = makeSmtp(cfg)
      await smtp.verify()
    } catch (e) {
      return { ok: false, error: classifyError(e, 'SMTP') }
    }
    return { ok: true }
  },

  async fetchNew(cfg: MailboxCfg, sinceUid?: number) {
    const client = makeImap(cfg)
    const messages: NormalizedMessage[] = []
    let lastUid = sinceUid ?? 0
    try {
      await client.connect()
      const lock = await client.getMailboxLock('INBOX')
      try {
        let uids = (await client.search({ all: true }, { uid: true })) || []
        uids = sinceUid ? uids.filter((u) => u > sinceUid) : uids.slice(-FIRST_SYNC_LIMIT)
        uids.sort((a, b) => a - b)
        for (const uid of uids) {
          const msg = (await client.fetchOne(String(uid), { uid: true, envelope: true, bodyStructure: true }, { uid: true })) as FetchMessageObject | false
          if (!msg) continue
          const env = msg.envelope
          const from = env?.from?.[0]
          const bodyText = await fetchBodyText(client, uid, msg.bodyStructure as unknown as BodyNode)
          const snippetSrc = bodyText || env?.subject || ''
          messages.push({
            uid,
            fromAddr: from?.address ?? '',
            fromName: from?.name || undefined,
            subject: env?.subject ?? '(no subject)',
            snippet: snippetSrc.replace(/\s+/g, ' ').slice(0, SNIPPET_MAX),
            bodyText,
            receivedAt: env?.date ?? new Date(),
          })
          if (uid > lastUid) lastUid = uid
        }
      } finally {
        lock.release()
      }
    } finally {
      try { await client.logout() } catch { /* ignore */ }
    }
    return { messages, lastUid }
  },

  async send(cfg: MailboxCfg, msg: SendInput) {
    try {
      const smtp = makeSmtp(cfg)
      const info = await smtp.sendMail({
        from: cfg.email,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        ...(msg.inReplyTo ? { inReplyTo: msg.inReplyTo, references: msg.inReplyTo } : {}),
      })
      return { ok: true, messageId: info.messageId }
    } catch (e) {
      return { ok: false, error: cleanErr(e) }
    }
  },
}

// Surface a concise, credential-free error message.
function cleanErr(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e)
  return m.replace(/\s+/g, ' ').slice(0, 200)
}
