import { STARTER_TASKS } from '@/lib/screen/taskbank/content'
import { bankTaskToWorkSample } from '@/lib/screen/taskbank/select'
import type { WorkSampleTask } from '@/lib/screen/workspace/task'
import type { DemoPersona } from './personas'

// ── Demo work sample (Screen-scoped, server-only) ──────────────────────────
// Builds the persona's hands-on task from Levl1's machine-verified starter
// content (expected outputs come from running a reference solution; an
// independent solution agrees; mutants are caught — see content.ts). It is
// marked approved for the DEMO only: it's Levl1's own sample content shown to
// prospects, never used to assess a real candidate. In customer workspaces the
// same tasks still load as drafts that need a hiring reviewer's approval.
// The demo sets a shorter suggested time box (persona.work.minutes).
export function demoWorkSample(p: DemoPersona): WorkSampleTask | null {
  if (!p.work) return null
  const t = STARTER_TASKS.find((x) => x.key === p.work!.taskKey)
  if (!t) { console.error('[demo] unknown starter task', p.work.taskKey); return null }
  const task = bankTaskToWorkSample(
    { id: `starter:${t.key}`, title: t.title, prompt: t.prompt, roles: t.roles, skills: t.skills, difficulty: t.difficulty, experienceMin: t.experienceMin, experienceMax: t.experienceMax, languages: t.languages, starterCode: t.starterCode, tests: t.tests, minutes: t.minutes, status: 'active', rubric: t.rubric },
    { preferLanguage: null, approvedBy: 'Levl1 demo (machine-verified starter task)' },
  )
  return { ...task, minutes: Math.min(task.minutes, p.work.minutes) }
}
