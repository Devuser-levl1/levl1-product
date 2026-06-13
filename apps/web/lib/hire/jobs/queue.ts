import { PgBoss } from 'pg-boss'
import { JOB_NAME, scoreCandidateHandler } from './score-candidate'
import { REMINDER_JOB, interviewReminderHandler } from './interview-reminder'
import { SEND_CAMPAIGN_JOB, sendCampaignHandler } from './send-campaign'

let boss: PgBoss | null = null
let starting: Promise<PgBoss> | null = null

export async function getQueue(): Promise<PgBoss> {
  if (boss) return boss
  if (!starting) {
    starting = (async () => {
      const connectionString = process.env.DATABASE_URL!
      // Managed Postgres (Render) requires SSL; pg-boss uses raw `pg` which
      // needs ssl configured explicitly (Prisma handles its own).
      const needsSsl = /render\.com|sslmode=require|amazonaws\.com/.test(connectionString)
      const b = needsSsl
        ? new PgBoss({ connectionString, ssl: { rejectUnauthorized: false } })
        : new PgBoss(connectionString)
      await b.start()

      // AI candidate scoring
      await b.createQueue(JOB_NAME)
      await b.work<{ candidateId: string }>(JOB_NAME, async (jobs) => {
        for (const job of jobs) await scoreCandidateHandler(job.data)
      })

      // Interview reminders (24h / 1h before)
      await b.createQueue(REMINDER_JOB)
      await b.work<{ interviewId: string; kind: '24hr' | '1hr' }>(REMINDER_JOB, async (jobs) => {
        for (const job of jobs) await interviewReminderHandler(job.data)
      })

      // Email campaigns
      await b.createQueue(SEND_CAMPAIGN_JOB)
      await b.work<{ campaignId: string }>(SEND_CAMPAIGN_JOB, async (jobs) => {
        for (const job of jobs) await sendCampaignHandler(job.data)
      })

      boss = b
      console.log('[pg-boss] Queue started + workers registered')
      return b
    })()
  }
  return starting
}

/** Same boss instance — used to schedule delayed interview reminders. */
export async function getReminderQueue(): Promise<PgBoss> {
  return getQueue()
}

export async function enqueue(jobName: string, data: Record<string, unknown>) {
  const queue = await getQueue()
  await queue.send(jobName, data)
  console.log(`[pg-boss] Enqueued job: ${jobName}`)
}
