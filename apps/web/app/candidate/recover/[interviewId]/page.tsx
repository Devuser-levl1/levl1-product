import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { loadCandidateInterview } from '@/lib/candidatePortal'
import { candidateDetour } from '@/lib/screen/recovery/candidate-route'
import { maxSelfRetakes, retakePolicy } from '@/lib/screen/recovery/state'
import RecoverClient from './RecoverClient'

export const dynamic = 'force-dynamic'

// The candidate's interview started but didn't finish (crash, network, mic…).
// They're never left at a dead end: the hiring team is told, and — only if the
// workspace allows self-serve retakes — they can start a fresh attempt.
export default async function CandidateRecoverPage({ params, searchParams }: { params: { interviewId: string }; searchParams: { k?: string } }) {
  const result = await loadCandidateInterview(params.interviewId, typeof searchParams?.k === 'string' ? searchParams.k : null)
  if (!result.ok) redirect(`/candidate/error?message=${encodeURIComponent(result.reason)}`)
  const data = result.data
  if (data.recovery !== 'interrupted' && data.recovery !== 'terminated') {
    const detour = candidateDetour(data)
    redirect(detour ?? `/candidate/schedule/${data.interviewId}${data.linkKey ? `?k=${encodeURIComponent(data.linkKey)}` : ''}`)
  }
  const used = await prisma.interviewAttempt.count({ where: { interviewId: data.interviewId, retakeMode: 'self' } })
  const selfRetake = retakePolicy() === 'self' && used < maxSelfRetakes()
  return <RecoverClient data={data} selfRetake={selfRetake} />
}
