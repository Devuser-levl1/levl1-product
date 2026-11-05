import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recruiterAccess } from '@/lib/screen/recruiter/access'
import { execute, judge0Configured } from '@/lib/screen/workspace/judge0'
import { isWorkspaceLanguage, outputsMatch } from '@/lib/screen/workspace/task'
import { sanitizeTests } from '@/lib/screen/taskbank/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// POST — run the reference solution against every test in Judge0 (sandboxed).
// All pass → lastVerifiedAt is set (required before a task can go active).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = recruiterAccess(req, { edit: true })
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
  if (!judge0Configured()) return NextResponse.json({ error: 'Code execution is not configured (JUDGE0_API_KEY).' }, { status: 503 })
  const t = await prisma.taskBankItem.findFirst({ where: { id: params.id, agencyId: access.session.agencyId } })
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!t.referenceSolution?.trim()) return NextResponse.json({ error: 'Add a reference solution first.' }, { status: 400 })
  const language = isWorkspaceLanguage(t.referenceLanguage) ? t.referenceLanguage : 'python'
  const tests = sanitizeTests(t.tests)
  if (!tests.length) return NextResponse.json({ error: 'Add test cases first.' }, { status: 400 })
  const results = []
  for (const test of tests) {
    const r = await execute({ language, source: t.referenceSolution, stdin: test.input })
    results.push({ id: test.id, name: test.name, passed: r.status === 'ok' && outputsMatch(r.stdout, test.expected), status: r.status, actual: r.stdout.slice(0, 2000), stderr: (r.compileOutput || r.stderr).slice(0, 1000) })
  }
  const allPass = results.every((r) => r.passed)
  await prisma.taskBankItem.update({ where: { id: t.id }, data: { lastVerifiedAt: allPass ? new Date() : null } })
  return NextResponse.json({ allPass, results })
}
