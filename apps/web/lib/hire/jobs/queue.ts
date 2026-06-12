import { PgBoss } from 'pg-boss'

let boss: PgBoss | null = null

export async function getQueue(): Promise<PgBoss> {
  if (!boss) {
    boss = new PgBoss(process.env.DATABASE_URL!)
    await boss.start()
    console.log('[pg-boss] Queue started')
  }
  return boss
}

export async function enqueue(jobName: string, data: Record<string, unknown>) {
  const queue = await getQueue()
  await queue.send(jobName, data)
  console.log(`[pg-boss] Enqueued job: ${jobName}`)
}
