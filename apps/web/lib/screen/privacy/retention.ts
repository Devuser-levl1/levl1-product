import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { readCapturePolicy } from './policy'

// ── Captured-data retention (Screen-scoped) ────────────────────────────────
// Enforces lib/screen/privacy/policy.ts:
//   media      (photo + audio recording)            → deleted after mediaRetentionDays
//   transcript (transcript, per-question responses,
//               code editor text, second-voice snippets) → deleted after transcriptRetentionDays
//   live tail  (control-room rolling transcript)    → cleared 24h after the interview ends
//   consent withdrawn                               → media deleted immediately
// Counted from completedAt (or createdAt for sessions that never finished).
// Runs from /api/cron/privacy-retention, the report-sweep cron, and
// opportunistically on recording upload. Read paths ALSO refuse expired
// media, so a late purge never means late exposure.

const DAY = 86_400_000
const BATCH = 100
const LIVE_TAIL_MS = DAY

const endedBefore = (cutoff: Date): Prisma.InterviewWhereInput => ({
  OR: [{ completedAt: { lt: cutoff } }, { completedAt: null, createdAt: { lt: cutoff } }],
})

/** Delete photo + audio for one interview (consent withdrawal, manual deletion). */
export async function purgeMediaFor(interviewId: string) {
  await prisma.$transaction([
    prisma.interviewRecording.deleteMany({ where: { interviewId } }),
    prisma.interviewVerification.updateMany({ where: { interviewId }, data: { photoUrl: null } }),
    prisma.interview.update({ where: { id: interviewId }, data: { mediaPurgedAt: new Date() } }),
  ])
}

async function purgeTranscriptFor(interviewId: string) {
  const snippets = await prisma.interviewIntegrityEvent.findMany({
    where: { interviewId, type: 'second_voice' }, select: { id: true, meta: true, durationMs: true },
  })
  await prisma.$transaction([
    prisma.interview.update({
      where: { id: interviewId },
      data: { transcript: Prisma.DbNull, questionResponses: Prisma.DbNull, codeEditorContent: null, transcriptPurgedAt: new Date() },
    }),
    prisma.interviewLiveState.updateMany({ where: { interviewId }, data: { transcriptTail: Prisma.DbNull, interim: null, questionText: null } }),
    // Keep the event (timing/confidence) but drop what the second voice said.
    ...snippets.map((e) => {
      const meta = (e.meta && typeof e.meta === 'object' ? { ...(e.meta as Record<string, unknown>) } : {})
      delete meta.transcript; delete meta.transcriptEnc
      return prisma.interviewIntegrityEvent.update({
        where: { id: e.id },
        data: { detail: 'Second voice detected (words removed under the retention policy)', meta: meta as Prisma.InputJsonValue },
      })
    }),
  ])
}

export interface RetentionResult { media: number; transcripts: number; liveTails: number; recordingsExpired: number }

export async function runRetentionPurge(now = new Date()): Promise<RetentionResult> {
  const policy = readCapturePolicy()
  const mediaCutoff = new Date(now.getTime() - policy.mediaRetentionDays * DAY)
  const transcriptCutoff = new Date(now.getTime() - policy.transcriptRetentionDays * DAY)

  // 1. Media past retention, or consent withdrawn.
  const media = await prisma.interview.findMany({
    where: {
      mediaPurgedAt: null,
      OR: [{ consentWithdrawnAt: { not: null } }, endedBefore(mediaCutoff)],
      AND: [{ OR: [{ recording: { isNot: null } }, { verification: { photoUrl: { not: null } } }] }],
    },
    select: { id: true }, take: BATCH,
  })
  for (const m of media) await purgeMediaFor(m.id).catch((e) => console.error('[retention] media purge failed', m.id, e instanceof Error ? e.message : e))

  // Recordings carry their own expiresAt (set at upload) — honour it too.
  const expired = await prisma.interviewRecording.deleteMany({ where: { expiresAt: { lt: now } } })

  // 2. Transcript-class data past retention.
  const transcripts = await prisma.interview.findMany({
    where: { transcriptPurgedAt: null, ...endedBefore(transcriptCutoff) },
    select: { id: true }, take: BATCH,
  })
  for (const t of transcripts) await purgeTranscriptFor(t.id).catch((e) => console.error('[retention] transcript purge failed', t.id, e instanceof Error ? e.message : e))

  // 3. Live-view tail: only needed while the session is live.
  const tails = await prisma.interviewLiveState.updateMany({
    where: {
      interview: { status: 'completed', completedAt: { lt: new Date(now.getTime() - LIVE_TAIL_MS) } },
      OR: [{ transcriptTail: { not: Prisma.DbNull } }, { interim: { not: null } }],
    },
    data: { transcriptTail: Prisma.DbNull, interim: null },
  })

  const result = { media: media.length, transcripts: transcripts.length, liveTails: tails.count, recordingsExpired: expired.count }
  if (result.media || result.transcripts || result.liveTails || result.recordingsExpired) console.info('[retention] purged', JSON.stringify(result))
  return result
}

/** Is this interview's media still inside the retention window? (read-time guard) */
export function mediaExpired(iv: { completedAt: Date | null; createdAt: Date; consentWithdrawnAt: Date | null; mediaPurgedAt: Date | null }, now = Date.now()): boolean {
  if (iv.mediaPurgedAt || iv.consentWithdrawnAt) return true
  const from = (iv.completedAt ?? iv.createdAt).getTime()
  return now - from > readCapturePolicy().mediaRetentionDays * DAY
}
