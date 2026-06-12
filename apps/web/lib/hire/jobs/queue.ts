import { PgBoss } from 'pg-boss'
import { JOB_NAME, scoreCandidateHandler } from './score-candidate'

let boss: PgBoss | null = null
let starting: Promise<PgBoss> | null = null

export async function getQueue(): Promise<PgBoss> {
  if (boss) return boss
  if (!starting) {
    starting = (async () => {
      const b = new PgBoss(process.env.DATABASE_URL!)
      await b.start()
      await b.createQueue(JOB_NAME)
      // pg-boss v12 hands the worker an array of jobs.
      await b.work<{ candidateId: string }>(JOB_NAME, async (jobs) => {
        for (const job of jobs) {
          await scoreCandidateHandler(job.data)
        }
      })
      boss = b
      console.log('[pg-boss] Queue started + worker registered')
      return b
    })()
  }
  return starting
}

export async function enqueue(jobName: string, data: Record<string, unknown>) {
  const queue = await getQueue()
  await queue.send(jobName, data)
  console.log(`[pg-boss] Enqueued job: ${jobName}`)
}
