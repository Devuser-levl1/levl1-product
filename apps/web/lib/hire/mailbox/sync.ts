import { prisma } from '@/lib/prisma'
import { getConnector } from './index'
import { decryptMailboxSecret } from './crypto'
import { classifyJobSpec, classifyResume } from './classify'
import { sanitizeMessage } from './sanitize'
import { buildResumeProposal } from '@/lib/hire/agent/resume-intake'
import type { MailboxCfg } from './types'

interface ConnLike {
  id: string; tenantId: string; provider: string; email: string; userId?: string | null
  imapHost: string | null; imapPort: number | null; smtpHost: string | null; smtpPort: number | null
  credentials: string | null; lastSeenUid: number | null
}

/**
 * Pull new mail for one connection, AI-flag job specs, store messages, advance
 * the cursor. Credentials are decrypted only inside this scope and never logged.
 * Returns the count of new messages (throws only on unexpected errors).
 */
export async function syncConnection(conn: ConnLike): Promise<{ newCount: number }> {
  const connector = getConnector(conn.provider)
  const secret = decryptMailboxSecret(conn.credentials)
  if (!connector || !secret || !conn.imapHost || !conn.smtpHost || !conn.imapPort || !conn.smtpPort) {
    await prisma.mailboxConnection.update({ where: { id: conn.id }, data: { status: 'error', lastError: 'Mailbox is not fully configured — reconnect.' } })
    return { newCount: 0 }
  }

  const cfg: MailboxCfg = {
    email: conn.email, password: secret.password,
    imapHost: conn.imapHost, imapPort: conn.imapPort, smtpHost: conn.smtpHost, smtpPort: conn.smtpPort,
  }

  try {
    const { messages, lastUid } = await connector.fetchNew(cfg, conn.lastSeenUid ?? undefined)

    // Guard against re-inserting any uid we already stored for this connection.
    const existing = messages.length
      ? new Set((await prisma.mailboxMessage.findMany({ where: { connectionId: conn.id, uid: { in: messages.map((m) => m.uid) } }, select: { uid: true } })).map((r) => r.uid))
      : new Set<number>()

    let newCount = 0
    let skipped = 0
    for (const raw of messages) {
      if (existing.has(raw.uid)) continue
      // Defensive re-sanitize (belt-and-suspenders — the connector already did
      // this) so no null byte / invalid UTF-8 can ever reach Postgres.
      const m = sanitizeMessage(raw)
      // Per-message guard: one malformed email must never fail the whole batch.
      try {
        const attachments = raw.attachments ?? []
        const verdict = await classifyJobSpec(m.subject, m.bodyText)
        const resume = classifyResume(m.subject, m.bodyText, attachments.map((a) => a.filename))
        const stored = await prisma.mailboxMessage.create({
          data: {
            connectionId: conn.id, tenantId: conn.tenantId, uid: m.uid,
            fromAddr: m.fromAddr, fromName: m.fromName ?? null, subject: m.subject,
            snippet: m.snippet, bodyText: m.bodyText, receivedAt: m.receivedAt,
            isJobSpec: verdict.isJobSpec, jobSpecConfidence: verdict.confidence,
            isResume: resume.isResume, resumeConfidence: resume.confidence,
            attachments: attachments.length
              ? { create: attachments.map((a) => ({ tenantId: conn.tenantId, filename: a.filename, mimeType: a.mime, sizeBytes: a.size, contentBase64: a.contentBase64, isResume: resume.isResume })) }
              : undefined,
          },
          include: { attachments: { select: { id: true, isResume: true } } },
        })
        newCount++

        // Agentic résumé intake: one approval proposal per résumé attachment.
        if (resume.isResume) {
          for (const att of stored.attachments.filter((a) => a.isResume)) {
            await buildResumeProposal({
              tenantId: conn.tenantId, attachmentId: att.id, messageId: stored.id,
              fromName: m.fromName ?? null, fromAddr: m.fromAddr, assigneeUserId: conn.userId ?? null,
            }).catch((e) => console.error('[hire/mailbox/sync] resume proposal failed:', e instanceof Error ? e.message : e))
          }
        }
      } catch (err) {
        skipped++
        const reason = (err instanceof Error ? err.message : String(err)).replace(/\s+/g, ' ').slice(0, 200)
        console.error(`[hire/mailbox/sync] skipped uid ${raw.uid} for ${conn.email}: ${reason}`)
      }
    }
    if (skipped) console.warn(`[hire/mailbox/sync] ${conn.email}: ${skipped} message(s) skipped, ${newCount} stored`)

    await prisma.mailboxConnection.update({
      where: { id: conn.id },
      data: { lastSeenUid: Math.max(lastUid, conn.lastSeenUid ?? 0), lastSyncedAt: new Date(), status: 'connected', lastError: null },
    })
    return { newCount }
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).replace(/\s+/g, ' ').slice(0, 200)
    console.error('[hire/mailbox/sync] failed for', conn.email, '-', msg) // email + generic error, no creds
    await prisma.mailboxConnection.update({ where: { id: conn.id }, data: { status: 'error', lastError: msg } }).catch(() => {})
    return { newCount: 0 }
  }
}
