'use client'

import { useParams } from 'next/navigation'
import { SolveReportView } from '@/components/solve/SolveReportView'

// Recruiter view of one Solve submission (agency-scoped API).
export default function SolveReportPage() {
  const { id } = useParams<{ id: string }>()
  return <SolveReportView apiPath={`/api/solve/submissions/${id}`} mode="recruiter" signinNext={`/solve/report/${id}`} />
}
