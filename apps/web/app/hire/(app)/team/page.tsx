'use client'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core'
import { VIZ, CountUp } from '@/components/hire/viz'
import { ROLE_LABEL } from '@/lib/hire/roles'
import { ClientAssignments } from '@/components/hire/client-assignments'

interface Member { id: string; name: string; email: string; role: string; activeJobs: number; candidatesInProgress: number; totalCandidates: number; placements: number; avgTimeToFill: number | null; activity30d: number; stalledJobs: number }
interface JobRow { id: string; title: string; assigneeId: string | null; daysOpen: number; pipelineCount: number; lastActivityAt: string; daysSinceActivity: number; stalled: boolean; ageSeverity: string; topStage: string | null }
interface Oversight { members: Member[]; jobs: JobRow[]; metrics: { openJobs: number; placements: number; avgTimeToFill: number | null; fillRate: number; unassignedJobs: number; stalledJobs: number }; thresholds: { ageWarn: number; ageBad: number; stallDays: number } }

const card: React.CSSProperties = { background: '#fff', border: `1px solid ${VIZ.line}`, borderRadius: 14, padding: 18 }
const ageColor = (s: string) => (s === 'bad' ? VIZ.bad : s === 'warn' ? VIZ.warn : VIZ.slate)

export default function TeamPage() {
  const [role, setRole] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [data, setData] = useState<Oversight | null>(null)
  const [tab, setTab] = useState<'oversight' | 'board' | 'clients'>('oversight')
  const [member, setMember] = useState<string | null>(null)

  useEffect(() => { fetch('/api/hire/auth/me').then((r) => (r.ok ? r.json() : null)).then((d) => { setRole(d?.user?.role ?? null); setReady(true) }).catch(() => setReady(true)) }, [])
  const load = useCallback(() => { fetch('/api/hire/team/oversight').then((r) => (r.ok ? r.json() : null)).then(setData).catch(() => {}) }, [])
  useEffect(() => { if (role === 'ADMIN' || role === 'MANAGER') load() }, [role, load])

  if (!ready) return <div style={{ color: '#475569' }}>Loading…</div>
  if (role !== 'ADMIN' && role !== 'MANAGER') return (
    <div style={{ maxWidth: 520, padding: '32px 0' }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Access restricted</div>
      <div style={{ fontSize: 13.5, color: '#64748B', marginTop: 6 }}>Team oversight is available to managers and admins. You can see your own assigned work across the app.</div>
    </div>
  )

  const memberName = (id: string | null) => id ? (data?.members.find((m) => m.id === id)?.name ?? 'Unknown') : 'Unassigned'

  return (
    <div style={{ maxWidth: 1180 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: VIZ.ink, margin: '0 0 4px' }}>Team</h1>
      <div style={{ fontSize: 13.5, color: VIZ.slate, marginBottom: 16 }}>Oversight of who&apos;s working on what, ageing positions, and workload — drag jobs to reassign.</div>

      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${VIZ.line}`, marginBottom: 16 }}>
        {([['oversight', 'Oversight'], ['board', 'Assignment board'], ['clients', 'Client assignments']] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} style={{ padding: '9px 14px', fontSize: 13.5, fontWeight: 600, background: 'none', border: 'none', borderBottom: '2px solid ' + (tab === k ? VIZ.primary : 'transparent'), color: tab === k ? VIZ.primary : '#64748B', cursor: 'pointer' }}>{l}</button>)}
      </div>

      {tab === 'clients' ? <ClientAssignments /> : !data ? <div style={{ color: '#475569' }}>Loading…</div> : tab === 'oversight' ? (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 16 }}>
            <Kpi label="Open jobs" value={data.metrics.openJobs} />
            <Kpi label="Placements" value={data.metrics.placements} accent={VIZ.good} />
            <Kpi label="Avg time-to-fill" value={data.metrics.avgTimeToFill ?? 0} suffix={data.metrics.avgTimeToFill != null ? 'd' : ''} raw={data.metrics.avgTimeToFill == null ? '—' : undefined} />
            <Kpi label="Fill rate" value={data.metrics.fillRate} suffix="%" />
            <Kpi label="Stalled jobs" value={data.metrics.stalledJobs} accent={data.metrics.stalledJobs ? VIZ.bad : VIZ.slate} />
            <Kpi label="Unassigned" value={data.metrics.unassignedJobs} accent={data.metrics.unassignedJobs ? VIZ.warn : VIZ.slate} />
          </div>

          {/* Workload by member */}
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: VIZ.ink, marginBottom: 10 }}>Workload by recruiter</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ color: VIZ.slate }}>{['Member', 'Role', 'Active jobs', 'In progress', 'Placements', 'Avg TTF', 'Activity 30d', 'Stalled'].map((h) => <th key={h} style={{ textAlign: h === 'Member' || h === 'Role' ? 'left' : 'right', padding: '7px 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>)}</tr></thead>
              <tbody>
                {data.members.map((m) => {
                  const max = Math.max(...data.members.map((x) => x.activeJobs), 1)
                  const overloaded = m.activeJobs >= max && max > 2
                  return (
                    <tr key={m.id} onClick={() => setMember(member === m.id ? null : m.id)} style={{ borderTop: `1px solid ${VIZ.track}`, cursor: 'pointer', background: member === m.id ? '#F5F3FF' : 'transparent' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: VIZ.ink }}>{m.name}{overloaded && <span title="Heaviest load" style={{ color: VIZ.warn }}> ⚠</span>}</td>
                      <td style={{ padding: '8px 10px', color: VIZ.slate }}>{ROLE_LABEL[m.role] ?? m.role}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{m.activeJobs}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{m.candidatesInProgress}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{m.placements}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>{m.avgTimeToFill != null ? `${m.avgTimeToFill}d` : '—'}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: m.activity30d ? VIZ.ink : VIZ.faint }}>{m.activity30d}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', color: m.stalledJobs ? VIZ.bad : VIZ.faint, fontWeight: m.stalledJobs ? 700 : 400 }}>{m.stalledJobs || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Ageing positions */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: VIZ.ink }}>Ageing positions{member ? ` · ${memberName(member)}` : ''}</div>
              {member && <button onClick={() => setMember(null)} style={{ marginLeft: 'auto', fontSize: 12, color: VIZ.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Clear filter</button>}
            </div>
            <div style={{ fontSize: 11.5, color: VIZ.faint, marginBottom: 10 }}>Ranked by days open · amber &gt;{data.thresholds.ageWarn}d, red &gt;{data.thresholds.ageBad}d · stalled = no activity in {data.thresholds.stallDays}+ days</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.jobs.filter((j) => !member || j.assigneeId === member).map((j) => (
                <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${VIZ.track}`, borderRadius: 9, padding: '9px 12px' }}>
                  <a href={`/hire/jobs/${j.id}`} style={{ fontSize: 13.5, fontWeight: 700, color: VIZ.ink, textDecoration: 'none', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</a>
                  {j.stalled && <span style={{ fontSize: 10, fontWeight: 800, color: VIZ.bad, background: VIZ.badSoft, borderRadius: 100, padding: '2px 8px' }}>STALLED {j.daysSinceActivity}d</span>}
                  <span style={{ fontSize: 12, color: VIZ.faint, width: 90, textAlign: 'right' }}>{j.pipelineCount} in pipe</span>
                  <span style={{ fontSize: 12, color: VIZ.faint, width: 80 }}>{memberName(j.assigneeId)}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: ageColor(j.ageSeverity), width: 70, textAlign: 'right' }}>{j.daysOpen}d open</span>
                </div>
              ))}
              {data.jobs.filter((j) => !member || j.assigneeId === member).length === 0 && <div style={{ fontSize: 13, color: VIZ.faint, padding: '10px 0' }}>No open positions.</div>}
            </div>
          </div>
        </>
      ) : (
        <AssignmentBoard data={data} onReassigned={load} />
      )}
    </div>
  )
}

function Kpi({ label, value, suffix = '', accent, raw }: { label: string; value: number; suffix?: string; accent?: string; raw?: string }) {
  return <div style={card}><div style={{ fontSize: 11, color: VIZ.slate, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div><div style={{ fontSize: 24, fontWeight: 800, color: accent ?? VIZ.ink, marginTop: 4 }}>{raw ?? <><CountUp value={value} />{suffix}</>}</div></div>
}

function AssignmentBoard({ data, onReassigned }: { data: Oversight; onReassigned: () => void }) {
  const [jobs, setJobs] = useState<JobRow[]>(data.jobs)
  useEffect(() => { setJobs(data.jobs) }, [data.jobs])
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const columns = useMemo(() => {
    const cols: { id: string; name: string }[] = [{ id: 'unassigned', name: 'Unassigned' }, ...data.members.map((m) => ({ id: m.id, name: m.name }))]
    return cols.map((c) => ({ ...c, jobs: jobs.filter((j) => (c.id === 'unassigned' ? !j.assigneeId : j.assigneeId === c.id)) }))
  }, [jobs, data.members])

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over) return
    const jobId = String(active.id)
    const toCol = String(over.id)
    const toAssignee = toCol === 'unassigned' ? null : toCol
    const job = jobs.find((j) => j.id === jobId)
    if (!job || job.assigneeId === toAssignee) return
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, assigneeId: toAssignee } : j))) // optimistic
    const res = await fetch(`/api/hire/jobs/${jobId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assigneeId: toAssignee }) })
    if (!res.ok) { setJobs(data.jobs); alert('Reassign failed — you may not have permission.') } else onReassigned()
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
        {columns.map((col) => <BoardColumn key={col.id} col={col} />)}
      </div>
    </DndContext>
  )
}

function BoardColumn({ col }: { col: { id: string; name: string; jobs: JobRow[] } }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })
  return (
    <div ref={setNodeRef} style={{ width: 230, flexShrink: 0, background: isOver ? '#F1F5F9' : '#F8FAFC', border: isOver ? `1px dashed ${VIZ.primary}` : `1px solid ${VIZ.line}`, borderRadius: 12, padding: 12, minHeight: 200 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: col.id === 'unassigned' ? VIZ.warn : VIZ.slate, textTransform: 'uppercase', letterSpacing: 0.4 }}>{col.name}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: VIZ.faint, background: '#fff', border: `1px solid ${VIZ.line}`, borderRadius: 100, padding: '1px 8px' }}>{col.jobs.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {col.jobs.map((j) => <JobCard key={j.id} job={j} />)}
        {col.jobs.length === 0 && <div style={{ fontSize: 12, color: VIZ.faint, textAlign: 'center', padding: '14px 0' }}>—</div>}
      </div>
    </div>
  )
}

function JobCard({ job }: { job: JobRow }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: job.id })
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ background: '#fff', border: `1px solid ${VIZ.line}`, borderRadius: 9, padding: '10px 11px', cursor: 'grab', opacity: isDragging ? 0.4 : 1, transform: transform ? `translate(${transform.x}px,${transform.y}px)` : undefined, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: VIZ.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
        <span style={{ fontSize: 11, color: ageColor(job.ageSeverity), fontWeight: 600 }}>{job.daysOpen}d</span>
        <span style={{ fontSize: 11, color: VIZ.faint }}>· {job.pipelineCount} in pipe</span>
        {job.stalled && <span style={{ fontSize: 9.5, fontWeight: 800, color: VIZ.bad }}>STALLED</span>}
      </div>
    </div>
  )
}
