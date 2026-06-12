export interface CandidateCardProps {
  id: string
  name: string
  currentStage?: string
  aiScore?: number | null
}
export function CandidateCard({ name, currentStage, aiScore }: CandidateCardProps) {
  return (
    <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 16 }}>
      <div style={{ fontWeight: 700 }}>{name}</div>
      <div style={{ fontSize: 12, color: '#94A3B8' }}>
        {currentStage ?? 'Sourced'}{typeof aiScore === 'number' ? ` · ${aiScore}/100` : ''}
      </div>
    </div>
  )
}
