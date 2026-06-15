'use client'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, useDroppable, useDraggable } from '@dnd-kit/core'
import { useState } from 'react'

export interface KanbanCandidate {
  id: string; name: string; email: string; currentStage: string
  aiScore: number | null; aiRecommendation: string | null; interviewScore: number | null; source: string | null; createdAt: string
}
export interface KanbanStage { name: string; candidates: KanbanCandidate[] }
interface KanbanBoardProps {
  stages: KanbanStage[]
  jobId: string
  onMove: (candidateId: string, toStage: string) => Promise<void>
  onCandidateClick: (candidate: KanbanCandidate) => void
}

function scoreColor(score: number | null): string {
  if (!score) return '#475569'
  if (score >= 80) return '#10B981'
  if (score >= 60) return '#F59E0B'
  return '#EF4444'
}
const REC_BG: Record<string, string> = { strong_yes: '#ECFDF5', yes: '#F5F3FF', maybe: '#FFFBEB', no: '#FEF2F2' }
const REC_FG: Record<string, string> = { strong_yes: '#059669', yes: '#6D28D9', maybe: '#D97706', no: '#DC2626' }

function CandidateCard({ candidate, onClick }: { candidate: KanbanCandidate; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: candidate.id, data: { candidate } })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} onClick={onClick}
      style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 12px', cursor: 'grab', opacity: isDragging ? 0.4 : 1, transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined, marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', userSelect: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{candidate.name}</div>
        {candidate.aiScore != null && (
          <div style={{ fontSize: 11, fontWeight: 700, color: scoreColor(candidate.aiScore), background: `${scoreColor(candidate.aiScore)}15`, padding: '2px 6px', borderRadius: 4 }}>{candidate.aiScore}</div>
        )}
      </div>
      <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{candidate.email}</div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
        {candidate.interviewScore != null && <span title="Levl1 AI interview score" style={{ fontSize: 10, fontWeight: 700, background: 'rgba(124,58,237,0.10)', color: '#7C3AED', padding: '2px 6px', borderRadius: 4 }}>🎤 {candidate.interviewScore}</span>}
        {candidate.source && <span style={{ fontSize: 10, background: '#F1F5F9', color: '#64748B', padding: '2px 6px', borderRadius: 4 }}>{candidate.source}</span>}
        {candidate.aiRecommendation && <span style={{ fontSize: 10, background: REC_BG[candidate.aiRecommendation] ?? '#F1F5F9', color: REC_FG[candidate.aiRecommendation] ?? '#64748B', padding: '2px 6px', borderRadius: 4, textTransform: 'capitalize' }}>{candidate.aiRecommendation.replace('_', ' ')}</span>}
      </div>
    </div>
  )
}

function StageColumn({ stage, onCandidateClick }: { stage: KanbanStage; onCandidateClick: (c: KanbanCandidate) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.name })
  return (
    <div ref={setNodeRef} style={{ width: 240, flexShrink: 0, background: isOver ? '#F1F5F9' : '#F8FAFC', border: isOver ? '1px dashed #6D28D9' : '1px solid #E2E8F0', borderRadius: 10, padding: '12px 10px', minHeight: 200, transition: 'background 0.15s, border 0.15s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>{stage.name}</span>
        <span style={{ fontSize: 11, background: '#E2E8F0', color: '#64748B', padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>{stage.candidates.length}</span>
      </div>
      {stage.candidates.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} onClick={() => onCandidateClick(candidate)} />)}
      {stage.candidates.length === 0 && <div style={{ fontSize: 12, color: '#64748B', textAlign: 'center', paddingTop: 24 }}>Drop candidates here</div>}
    </div>
  )
}

function SummaryBar({ stages }: { stages: KanbanStage[] }) {
  const all = stages.flatMap((s) => s.candidates)
  const scored = all.filter((c) => c.aiScore != null)
  const avg = scored.length > 0 ? Math.round(scored.reduce((sum, c) => sum + (c.aiScore || 0), 0) / scored.length) : null
  const strongYes = all.filter((c) => c.aiRecommendation === 'strong_yes').length
  const Item = ({ children }: { children: React.ReactNode }) => <span style={{ fontSize: 13, color: '#475569' }}>{children}</span>
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16, padding: '10px 14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10 }}>
      <Item><strong>{all.length}</strong> candidates</Item><span style={{ color: '#E2E8F0' }}>|</span>
      <Item><strong>{scored.length}</strong> scored</Item><span style={{ color: '#E2E8F0' }}>|</span>
      <Item>Avg score: <strong>{avg ?? '—'}</strong></Item><span style={{ color: '#E2E8F0' }}>|</span>
      <Item><strong>{strongYes}</strong> Strong Yes</Item>
    </div>
  )
}

export function KanbanBoard({ stages, onMove, onCandidateClick }: KanbanBoardProps) {
  const [activeCandidate, setActiveCandidate] = useState<KanbanCandidate | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const handleDragStart = (event: DragStartEvent) => { setActiveCandidate((event.active.data.current?.candidate as KanbanCandidate) || null) }
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCandidate(null)
    const { active, over } = event
    if (!over) return
    const toStage = over.id as string
    const candidateId = active.id as string
    const fromStage = (active.data.current?.candidate as KanbanCandidate | undefined)?.currentStage
    if (fromStage === toStage) return
    await onMove(candidateId, toStage)
  }

  return (
    <div>
      <SummaryBar stages={stages} />
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
          {stages.map((stage) => <StageColumn key={stage.name} stage={stage} onCandidateClick={onCandidateClick} />)}
        </div>
        <DragOverlay>
          {activeCandidate && (
            <div style={{ background: 'white', border: '1px solid #6D28D9', borderRadius: 8, padding: '10px 12px', width: 220, boxShadow: '0 8px 24px rgba(109,40,217,0.15)', opacity: 0.95 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{activeCandidate.name}</div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{activeCandidate.email}</div>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
