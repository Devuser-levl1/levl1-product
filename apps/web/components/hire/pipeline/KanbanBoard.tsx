'use client'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, useDroppable, useDraggable } from '@dnd-kit/core'
import { useState } from 'react'

export interface KanbanCandidate {
  id: string; name: string; email: string; currentStage: string
  aiScore: number | null; aiRecommendation: string | null; source: string | null; createdAt: string
  rejectedReason?: string | null; rejectedBy?: string | null; rejectedAt?: string | null
}
export interface KanbanStage { name: string; candidates: KanbanCandidate[] }
interface KanbanBoardProps {
  stages: KanbanStage[]
  jobId: string
  onMove: (candidateId: string, toStage: string) => Promise<void>
  onReject?: (candidate: KanbanCandidate) => void
  onDelete?: (candidate: KanbanCandidate) => void
  onCandidateClick: (candidate: KanbanCandidate) => void
}

export const REJECTED_STAGE = 'Rejected'

function scoreColor(score: number | null): string {
  if (!score) return '#475569'
  if (score >= 80) return '#10B981'
  if (score >= 60) return '#F59E0B'
  return '#EF4444'
}
const REC_BG: Record<string, string> = { strong_yes: '#ECFDF5', yes: '#F5F3FF', maybe: '#FFFBEB', no: '#FEF2F2' }
const REC_FG: Record<string, string> = { strong_yes: '#059669', yes: '#6D28D9', maybe: '#D97706', no: '#DC2626' }

function CandidateCard({ candidate, stageNames, onClick, onMove, onReject, onDelete }: {
  candidate: KanbanCandidate
  stageNames: string[]
  onClick: () => void
  onMove: (toStage: string) => void
  onReject?: () => void
  onDelete?: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: candidate.id, data: { candidate } })
  const [menu, setMenu] = useState(false)
  const [submenu, setSubmenu] = useState(false)
  const isRejected = candidate.currentStage === REJECTED_STAGE
  const moveTargets = stageNames.filter((s) => s !== candidate.currentStage && s !== REJECTED_STAGE)

  // Stop dnd-kit from starting a drag when interacting with the menu.
  const stop = (e: React.PointerEvent | React.MouseEvent) => e.stopPropagation()

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} onClick={onClick}
      style={{ position: 'relative', background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 12px', cursor: 'grab', opacity: isDragging ? 0.4 : 1, transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined, marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', userSelect: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{candidate.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {candidate.aiScore != null && (
            <div style={{ fontSize: 11, fontWeight: 700, color: scoreColor(candidate.aiScore), background: `${scoreColor(candidate.aiScore)}15`, padding: '2px 6px', borderRadius: 4 }}>{candidate.aiScore}</div>
          )}
          <button
            onPointerDown={stop}
            onClick={(e) => { stop(e); setMenu((v) => !v); setSubmenu(false) }}
            title="Actions"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94A3B8', fontSize: 16, lineHeight: 1, padding: '0 2px', borderRadius: 4 }}
          >⋯</button>
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{candidate.email}</div>
      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
        {candidate.source && <span style={{ fontSize: 10, background: '#F1F5F9', color: '#64748B', padding: '2px 6px', borderRadius: 4 }}>{candidate.source}</span>}
        {candidate.aiRecommendation && <span style={{ fontSize: 10, background: REC_BG[candidate.aiRecommendation] ?? '#F1F5F9', color: REC_FG[candidate.aiRecommendation] ?? '#64748B', padding: '2px 6px', borderRadius: 4, textTransform: 'capitalize' }}>{candidate.aiRecommendation.replace('_', ' ')}</span>}
      </div>

      {isRejected && candidate.rejectedReason && (
        <div style={{ marginTop: 8, padding: '6px 8px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626' }}>{candidate.rejectedReason}</div>
          {(candidate.rejectedBy || candidate.rejectedAt) && (
            <div style={{ fontSize: 10, color: '#B91C1C', marginTop: 2 }}>
              {candidate.rejectedBy ? `by ${candidate.rejectedBy}` : ''}{candidate.rejectedBy && candidate.rejectedAt ? ' · ' : ''}{candidate.rejectedAt ? new Date(candidate.rejectedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
            </div>
          )}
        </div>
      )}

      {menu && (
        <div onPointerDown={stop} onClick={stop}
          style={{ position: 'absolute', right: 8, top: 30, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, boxShadow: '0 6px 20px rgba(15,23,42,0.14)', zIndex: 30, minWidth: 188, overflow: 'visible' }}>
          {moveTargets.length > 0 && (
            <div style={{ position: 'relative' }} onMouseEnter={() => setSubmenu(true)} onMouseLeave={() => setSubmenu(false)}>
              <MI>Move to stage ▸</MI>
              {submenu && (
                <div style={{ position: 'absolute', right: '100%', top: 0, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, boxShadow: '0 6px 20px rgba(15,23,42,0.14)', minWidth: 160, marginRight: 2 }}>
                  {moveTargets.map((s) => <MI key={s} onClick={() => { setMenu(false); onMove(s) }}>{s}</MI>)}
                </div>
              )}
            </div>
          )}
          {!isRejected && onReject && <MI onClick={() => { setMenu(false); onReject() }} color="#B45309">Reject…</MI>}
          {onDelete && <MI onClick={() => { setMenu(false); onDelete() }} color="#DC2626">Delete…</MI>}
        </div>
      )}
    </div>
  )
}

function MI({ children, onClick, color }: { children: React.ReactNode; onClick?: () => void; color?: string }) {
  return (
    <button onClick={onClick}
      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px', fontSize: 12.5, fontWeight: 600, background: 'none', border: 'none', cursor: onClick ? 'pointer' : 'default', color: color ?? '#334155', whiteSpace: 'nowrap' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
    >{children}</button>
  )
}

function StageColumn({ stage, stageNames, onCandidateClick, onMove, onReject, onDelete }: {
  stage: KanbanStage
  stageNames: string[]
  onCandidateClick: (c: KanbanCandidate) => void
  onMove: (candidateId: string, toStage: string) => void
  onReject?: (c: KanbanCandidate) => void
  onDelete?: (c: KanbanCandidate) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.name })
  const isRejected = stage.name === REJECTED_STAGE
  return (
    <div ref={setNodeRef} style={{ width: 240, flexShrink: 0, background: isOver ? (isRejected ? '#FEF2F2' : '#F1F5F9') : (isRejected ? '#FFFBFB' : '#F8FAFC'), border: isOver ? `1px dashed ${isRejected ? '#DC2626' : '#6D28D9'}` : `1px solid ${isRejected ? '#FECACA' : '#E2E8F0'}`, borderRadius: 10, padding: '12px 10px', minHeight: 200, transition: 'background 0.15s, border 0.15s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: isRejected ? '#DC2626' : '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>{stage.name}</span>
        <span style={{ fontSize: 11, background: isRejected ? '#FEE2E2' : '#E2E8F0', color: isRejected ? '#DC2626' : '#64748B', padding: '1px 7px', borderRadius: 10, fontWeight: 600 }}>{stage.candidates.length}</span>
      </div>
      {stage.candidates.map((candidate) => (
        <CandidateCard key={candidate.id} candidate={candidate} stageNames={stageNames}
          onClick={() => onCandidateClick(candidate)}
          onMove={(toStage) => onMove(candidate.id, toStage)}
          onReject={onReject ? () => onReject(candidate) : undefined}
          onDelete={onDelete ? () => onDelete(candidate) : undefined} />
      ))}
      {stage.candidates.length === 0 && <div style={{ fontSize: 12, color: '#64748B', textAlign: 'center', paddingTop: 24 }}>{isRejected ? 'No rejected candidates' : 'Drop candidates here'}</div>}
    </div>
  )
}

function SummaryBar({ stages }: { stages: KanbanStage[] }) {
  const all = stages.filter((s) => s.name !== REJECTED_STAGE).flatMap((s) => s.candidates)
  const rejected = stages.find((s) => s.name === REJECTED_STAGE)?.candidates.length ?? 0
  const scored = all.filter((c) => c.aiScore != null)
  const avg = scored.length > 0 ? Math.round(scored.reduce((sum, c) => sum + (c.aiScore || 0), 0) / scored.length) : null
  const strongYes = all.filter((c) => c.aiRecommendation === 'strong_yes').length
  const Item = ({ children }: { children: React.ReactNode }) => <span style={{ fontSize: 13, color: '#475569' }}>{children}</span>
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16, padding: '10px 14px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10 }}>
      <Item><strong>{all.length}</strong> active</Item><span style={{ color: '#E2E8F0' }}>|</span>
      <Item><strong>{scored.length}</strong> scored</Item><span style={{ color: '#E2E8F0' }}>|</span>
      <Item>Avg score: <strong>{avg ?? '—'}</strong></Item><span style={{ color: '#E2E8F0' }}>|</span>
      <Item><strong>{strongYes}</strong> Strong Yes</Item><span style={{ color: '#E2E8F0' }}>|</span>
      <Item><strong style={{ color: rejected ? '#DC2626' : '#475569' }}>{rejected}</strong> rejected</Item>
    </div>
  )
}

export function KanbanBoard({ stages, onMove, onReject, onDelete, onCandidateClick }: KanbanBoardProps) {
  const [activeCandidate, setActiveCandidate] = useState<KanbanCandidate | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const stageNames = stages.map((s) => s.name)

  const handleDragStart = (event: DragStartEvent) => { setActiveCandidate((event.active.data.current?.candidate as KanbanCandidate) || null) }
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCandidate(null)
    const { active, over } = event
    if (!over) return
    const toStage = over.id as string
    const candidate = active.data.current?.candidate as KanbanCandidate | undefined
    const fromStage = candidate?.currentStage
    if (fromStage === toStage) return
    // Dropping into Rejected needs a reason — open the reject flow instead of moving.
    if (toStage === REJECTED_STAGE) { if (candidate && onReject) onReject(candidate); return }
    await onMove(active.id as string, toStage)
  }

  return (
    <div>
      <SummaryBar stages={stages} />
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
          {stages.map((stage) => (
            <StageColumn key={stage.name} stage={stage} stageNames={stageNames}
              onCandidateClick={onCandidateClick} onMove={onMove} onReject={onReject} onDelete={onDelete} />
          ))}
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
