import { redirect } from 'next/navigation'
import { loadCandidateInterview } from '@/lib/candidatePortal'
import ScheduleClient from './ScheduleClient'

export const dynamic = 'force-dynamic'

export default async function CandidateSchedulePage({
  params,
}: {
  params: { interviewId: string }
}) {
  const result = await loadCandidateInterview(params.interviewId)

  if (!result.ok) {
    redirect(`/candidate/error?message=${encodeURIComponent(result.reason)}`)
  }
  if (result.data.status === 'completed') {
    redirect(`/candidate/error?message=${encodeURIComponent('This interview has already been completed.')}`)
  }

  return <ScheduleClient data={result.data} />
}
