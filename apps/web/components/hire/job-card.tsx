export interface JobCardProps {
  id: string
  title: string
  status?: string
}
export function JobCard({ title, status }: JobCardProps) {
  return (
    <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 16 }}>
      <div style={{ fontWeight: 700 }}>{title}</div>
      {status ? <div style={{ fontSize: 12, color: '#475569' }}>{status}</div> : null}
    </div>
  )
}
