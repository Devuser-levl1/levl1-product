import { NextResponse } from 'next/server'
import { withHireAuth } from '@/lib/hire/tenant-middleware'
import { prisma } from '@/lib/prisma'
import { getConnector, isBusinessEmail } from '@/lib/hire/mailbox'
import { assertMailboxEncryptionKey, encryptMailboxSecret } from '@/lib/hire/mailbox/crypto'
import type { MailboxCfg } from '@/lib/hire/mailbox/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// POST /api/hire/mailbox/connect — verify IMAP+SMTP, then store the (encrypted)
// mailbox for THIS recruiter. The password is write-only: never echoed back.
export const POST = withHireAuth(async (req, ctx) => {
  const body = await req.json().catch(() => ({}))
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const imapHost = String(body.imapHost ?? '').trim()
  const smtpHost = String(body.smtpHost ?? '').trim()
  const imapPort = Number(body.imapPort)
  const smtpPort = Number(body.smtpPort)

  if (!email || !password || !imapHost || !smtpHost || !imapPort || !smtpPort) {
    return NextResponse.json({ error: 'Email, app password, and IMAP/SMTP host + port are all required.' }, { status: 400 })
  }
  if (!isBusinessEmail(email)) {
    return NextResponse.json({ error: 'Connect a business mailbox. Free/consumer providers (Gmail, Outlook, Yahoo…) aren’t supported on the IMAP path.' }, { status: 400 })
  }

  // Hard-fail before touching a real password if the encryption key is weak.
  try {
    assertMailboxEncryptionKey()
  } catch (e) {
    console.error('[hire/mailbox/connect] encryption key check failed for', email) // no secret
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Encryption is not configured securely.' }, { status: 500 })
  }

  const connector = getConnector('imap')!
  const cfg: MailboxCfg = { email, password, imapHost, imapPort, smtpHost, smtpPort }
  const test = await connector.testConnection(cfg)

  if (!test.ok) {
    // Record the failure (status only — NEVER store creds on a failed test).
    await prisma.mailboxConnection.upsert({
      where: { userId_email: { userId: ctx.userId, email } },
      update: { status: 'error', lastError: test.error ?? 'Connection failed', imapHost, imapPort, smtpHost, smtpPort, provider: 'imap', tenantId: ctx.tenantId },
      create: { tenantId: ctx.tenantId, userId: ctx.userId, provider: 'imap', email, imapHost, imapPort, smtpHost, smtpPort, status: 'error', lastError: test.error ?? 'Connection failed' },
    }).catch(() => {})
    return NextResponse.json({ error: test.error ?? 'Could not connect — check the host/port and app password.' }, { status: 400 })
  }

  const credentials = encryptMailboxSecret({ password })
  await prisma.mailboxConnection.upsert({
    where: { userId_email: { userId: ctx.userId, email } },
    update: { provider: 'imap', tenantId: ctx.tenantId, imapHost, imapPort, smtpHost, smtpPort, credentials, status: 'connected', lastError: null },
    create: { tenantId: ctx.tenantId, userId: ctx.userId, provider: 'imap', email, imapHost, imapPort, smtpHost, smtpPort, credentials, status: 'connected' },
  })

  console.log('[hire/mailbox/connect] connected', email, 'status=connected') // email + status only
  return NextResponse.json({ ok: true, email, status: 'connected' })
})
