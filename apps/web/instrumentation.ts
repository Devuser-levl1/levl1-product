// Next.js boot hook — runs once when the server starts. Registers the pg-boss
// workers (AI candidate scoring, interview reminders, campaigns) on boot, so the
// queue has a consumer at startup rather than only lazily on the first enqueue.
//
// The pg-boss import is nested inside the `nodejs` runtime guard (the pattern
// Next.js documents) so the edge build never bundles pg's Node-only deps.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (!process.env.DATABASE_URL) return
    try {
      const { getQueue } = await import('@/lib/hire/jobs/queue')
      await getQueue()
      console.log('[instrumentation] pg-boss workers registered on boot')
    } catch (e) {
      // Non-fatal: workers still lazy-start on the first enqueue.
      console.error('[instrumentation] worker boot failed (will lazy-start on first enqueue):', e instanceof Error ? e.message : e)
    }
  }
}
