import { redirect } from 'next/navigation'
import { loadCandidateInterview } from '@/lib/candidatePortal'
import { candidateDetour } from '@/lib/screen/recovery/candidate-route'
import JoinClient from './JoinClient'

export const dynamic = 'force-dynamic'

export default async function CandidateJoinPage({
  params, searchParams,
}: {
  params: { interviewId: string }; searchParams: { k?: string }
}) {
  const result = await loadCandidateInterview(params.interviewId, typeof searchParams?.k === 'string' ? searchParams.k : null)

  if (!result.ok) {
    redirect(`/candidate/error?message=${encodeURIComponent(result.reason)}`)
  }

  const { data } = result

  // Interrupted → recovery page; open elsewhere / completed → explained dead end.
  const detour = candidateDetour(data)
  if (detour) redirect(detour)
  if (!data.scheduledAt) {
    // Not scheduled yet — send them to the slot picker instead of a dead end.
    redirect(`/candidate/schedule/${data.interviewId}${data.linkKey ? `?k=${encodeURIComponent(data.linkKey)}` : ''}`)
  }

  return <JoinClient data={data} />
}
