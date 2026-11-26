import { redirect } from 'next/navigation'
import { loadCandidateInterview } from '@/lib/candidatePortal'
import { candidateDetour } from '@/lib/screen/recovery/candidate-route'
import ScheduleClient from './ScheduleClient'

export const dynamic = 'force-dynamic'

export default async function CandidateSchedulePage({
  params, searchParams,
}: {
  params: { interviewId: string }; searchParams: { k?: string }
}) {
  const result = await loadCandidateInterview(params.interviewId, typeof searchParams?.k === 'string' ? searchParams.k : null)

  if (!result.ok) {
    redirect(`/candidate/error?message=${encodeURIComponent(result.reason)}`)
  }
  // Interrupted → recovery page; open elsewhere / completed → explained dead end.
  const detour = candidateDetour(result.data)
  if (detour) redirect(detour)

  return <ScheduleClient data={result.data} />
}
