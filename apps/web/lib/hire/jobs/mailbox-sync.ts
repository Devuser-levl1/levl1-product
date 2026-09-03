import { prisma } from '@/lib/prisma'
import { syncConnection } from '@/lib/hire/mailbox/sync'

export const MAILBOX_SYNC_JOB = 'mailbox-sync-all'
// Poll cadence for pulling new IMAP mail across all connected mailboxes.
export const MAILBOX_SYNC_CRON = '*/3 * * * *' // every 3 minutes

/**
 * Pull new mail for every connected mailbox (all tenants). Runs on a pg-boss
 * schedule inside the always-on web service, so inbound mail is fetched even
 * when no recruiter has the inbox open. Per-connection error-guarded — one bad
 * mailbox never blocks the rest; syncConnection advances lastSeenUid and records
 * per-connection errors + handles encoding/attachments.
 */
export async function mailboxSyncAllHandler(): Promise<{ mailboxes: number; newMessages: number }> {
  const conns = await prisma.mailboxConnection.findMany({ where: { status: 'connected', credentials: { not: null } } })
  let total = 0
  for (const conn of conns) {
    try {
      const { newCount } = await syncConnection(conn)
      total += newCount
    } catch (e) {
      console.error('[mailbox-sync-all] connection failed for', conn.email, '-', e instanceof Error ? e.message : e)
    }
  }
  if (conns.length) console.log(`[mailbox-sync-all] polled ${conns.length} mailbox(es), ${total} new message(s)`)
  return { mailboxes: conns.length, newMessages: total }
}
