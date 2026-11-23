'use client'

import { useParams } from 'next/navigation'
import { SolveReportView } from '@/components/solve/SolveReportView'

// Demo only: the prospect's own Solve report (the API 404s for real take-homes).
export default function SolveDemoReportPage() {
  const { token } = useParams<{ token: string }>()
  return <SolveReportView apiPath={`/api/solve/t/${token}/report`} mode="demo" />
}
