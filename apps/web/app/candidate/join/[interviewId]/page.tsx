import { redirect } from 'next/navigation'
import { loadCandidateInterview } from '@/lib/candidatePortal'
import JoinClient from './JoinClient'

export const dynamic = 'force-dynamic'

export default async function CandidateJoinPage({
  params,
}: {
  params: { interviewId: string }
}) {
  const result = await loadCandidateInterview(params.interviewId)

  if (!result.ok) {
    redirect(`/candidate/error?message=${encodeURIComponent(result.reason)}`)
  }

  const { data } = result

  if (data.status === 'completed') {
    redirect(`/candidate/error?message=${encodeURIComponent('This interview has already been completed.')}`)
  }
  if (!data.scheduledAt) {
    // Not scheduled yet — send them to the slot picker instead of a dead end.
    redirect(`/candidate/schedule/${data.interviewId}`)
  }

  return <JoinClient data={data} />
}
