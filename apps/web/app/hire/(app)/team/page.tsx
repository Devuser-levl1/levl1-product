'use client'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from '@dnd-kit/core'
import { VIZ, CountUp } from '@/components/hire/viz'
import { ROLE_LABEL } from '@/lib/hire/roles'
import { ClientAssignments } from '@/components/hire/client-assignments'
import { TeamMembers } from '@/components/hire/team-members'
import { OpenJobs } from '@/components/hire/open-jobs'
import { isAdmin as roleIsAdmin } from '@/lib/hire/permissions'

interface Member { id: string; name: string; email: string; role: string; activeJobs: number; candidatesInProgress: number; totalCandidates: number; placements: number; avgTimeToFill: number | null; activity30d: number; stalledJobs: number }
interface JobRow { id: string; title: string; assigneeId: string | null; assigneeIds: string[]; daysOpen: number; pipelineCount: number; lastActivityAt: string; daysSinceActivity: number; stalled: boolean; ageSeverity: string; topStage: string | null }

// Deterministic avatar color + initials from a name.
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?'
}
const AVATAR_COLORS = ['#6D28D9', '#2563EB', '#059669', '#D97706', '#DC2626', '#0891B2', '#7C3AED', '#DB2777']
function avatarColor(id: string): string { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return AVATAR_COLORS[h % AVATAR_COLORS.length] }
interface Oversight { members: Member[]; jobs: JobRow[]; metrics: { openJobs: number; placements: number; avgTimeToFill: number | null; fillRate: number; unassignedJobs: number; stalledJobs: number }; thresholds: { ageWarn: number; ageBad: number; stallDays: number } }

const card: React.CSSProperties = { background: '#fff', border: `1px solid ${VIZ.line}`, borderRadius: 14, padding: 18 }
const ageColor = (s: string) => (s === 'bad' ? VIZ.bad : s === 'warn' ? VIZ.warn : VIZ.slate)

export default function TeamPage() {
  const [role, setRole] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [data, setData] = useState<Oversight | null>(null)
  const [tab, setTab] = useState<'oversight' | 'board' | 'clients' | 'members' | 'openjobs'>('oversight')
  const [member, setMember] = useState<string | null>(null)

  useEffect(() => { fetch('/api/hire/auth/me').then((r) => (r.ok ? r.json() : null)).then((d) => { const r = d?.user?.role ?? null; setRole(r); if (r !== 'ADMIN' && r !== 'MANAGER') setTab('openjobs'); setReady(true) }).catch(() => setReady(true)) }, [])
  const load = useCallback(() => { fetch('/api/hire/team/oversight').then((r) => (r.ok ? r.json() : null)).then(setData).catch(() => {}) }, [])
  useEffect(() => { if (role === 'ADMIN' || role === 'MANAGER') load() }, [role, load])

  if (!ready) return <div style={{ color: '#475569' }}>Loading…</div>

  const isMgr = role === 'ADMIN' || role === 'MANAGER'
  // Managers/admins get full oversight; everyone else gets the Open-jobs
  // self-assign view only (so a new recruiter can claim work themselves).
  const tabs: [typeof tab, string][] = isMgr
    ? [['oversight', 'Oversight'], ['board', 'Assignment board'], ['clients', 'Client assignments'], ['members', 'Members'], ['openjobs', 'Open jobs']]
    : [['openjobs', 'Open jobs']]

  const memberName = (id: string | null) => id ? (data?.members.find((m) => m.id === id)?.name ?? 'Unknown') : 'Unassigned'

  return (
    <div style={{ maxWidth: 1180 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: VIZ.ink, margin: '0 0 4px' }}>Team</h1>
      <div style={{ fontSize: 13.5, color: VIZ.slate, marginBottom: 16 }}>{isMgr ? 'Oversight of who’s working on what, ageing positions, and workload — drag jobs to reassign.' : 'Browse every open job in your workspace and claim the ones you want to work on.'}</div>

      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${VIZ.line}`, marginBottom: 16 }}>
        {tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} style={{ padding: '9px 14px', fontSize: 13.5, fontWeight: 600, background: 'none', border: 'none', borderBottom: '2px solid ' + (tab === k ? VIZ.primary : 'transparent'), color: tab === k ? VIZ.primary : '#64748B', cursor: 'pointer' }}>{l}</button>)}
      </div>

      {tab === 'openjobs' ? <OpenJobs /> : tab === 'members' ? <TeamMembers isAdmin={roleIsAdmin(role)} /> : tab === 'clients' ? <ClientAssignments /> : !data ? <div style={{ color: '#475569' }}>Loading…</div> : tab === 'oversight' ? (
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

  const memberList = data.members.map((m) => ({ id: m.id, name: m.name }))
  const memberMap = useMemo(() => Object.fromEntries(data.members.map((m) => [m.id, m.name])), [data.members])

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div style={{ fontSize: 12, color: VIZ.faint, marginBottom: 10 }}>Drag a card to set its lead owner · use <strong>Tag</strong> to assign multiple recruiters (they&apos;re emailed).</div>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
        {columns.map((col) => <BoardColumn key={col.id} col={col} members={memberList} memberMap={memberMap} onTagged={onReassigned} />)}
      </div>
    </DndContext>
  )
}

function BoardColumn({ col, members, memberMap, onTagged }: { col: { id: string; name: string; jobs: JobRow[] }; members: { id: string; name: string }[]; memberMap: Record<string, string>; onTagged: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })
  return (
    <div ref={setNodeRef} style={{ width: 230, flexShrink: 0, background: isOver ? '#F1F5F9' : '#F8FAFC', border: isOver ? `1px dashed ${VIZ.primary}` : `1px solid ${VIZ.line}`, borderRadius: 12, padding: 12, minHeight: 200 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: col.id === 'unassigned' ? VIZ.warn : VIZ.slate, textTransform: 'uppercase', letterSpacing: 0.4 }}>{col.name}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: VIZ.faint, background: '#fff', border: `1px solid ${VIZ.line}`, borderRadius: 100, padding: '1px 8px' }}>{col.jobs.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {col.jobs.map((j) => <JobCard key={j.id} job={j} members={members} memberMap={memberMap} onTagged={onTagged} />)}
        {col.jobs.length === 0 && <div style={{ fontSize: 12, color: VIZ.faint, textAlign: 'center', padding: '14px 0' }}>—</div>}
      </div>
    </div>
  )
}

function JobCard({ job, members, memberMap, onTagged }: { job: JobRow; members: { id: string; name: string }[]; memberMap: Record<string, string>; onTagged: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: job.id })
  const [tagging, setTagging] = useState(false)
  const assignees = (job.assigneeIds ?? []).filter((id) => memberMap[id])

  return (
    <div ref={setNodeRef} style={{ position: 'relative', background: '#fff', border: `1px solid ${VIZ.line}`, borderRadius: 9, padding: '10px 11px', opacity: isDragging ? 0.4 : 1, transform: transform ? `translate(${transform.x}px,${transform.y}px)` : undefined, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      {/* Drag handle = the title/meta area; the Tag button is excluded so it stays clickable. */}
      <div {...listeners} {...attributes} style={{ cursor: 'grab' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: VIZ.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
          <span style={{ fontSize: 11, color: ageColor(job.ageSeverity), fontWeight: 600 }}>{job.daysOpen}d</span>
          <span style={{ fontSize: 11, color: VIZ.faint }}>· {job.pipelineCount} in pipe</span>
          {job.stalled && <span style={{ fontSize: 9.5, fontWeight: 800, color: VIZ.bad }}>STALLED</span>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <div style={{ display: 'flex' }}>
          {assignees.slice(0, 4).map((id, i) => (
            <span key={id} title={memberMap[id]} style={{ width: 22, height: 22, borderRadius: '50%', background: avatarColor(id), color: '#fff', fontSize: 9.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #fff', marginLeft: i === 0 ? 0 : -7 }}>{initialsOf(memberMap[id])}</span>
          ))}
          {assignees.length > 4 && <span style={{ width: 22, height: 22, borderRadius: '50%', background: VIZ.faint, color: '#fff', fontSize: 9.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #fff', marginLeft: -7 }}>+{assignees.length - 4}</span>}
          {assignees.length === 0 && <span style={{ fontSize: 10.5, color: VIZ.faint }}>No one assigned</span>}
        </div>
        <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setTagging((v) => !v)} style={{ marginLeft: 'auto', fontSize: 10.5, fontWeight: 700, color: VIZ.primary, background: '#F5F3FF', border: `1px solid ${VIZ.primary}33`, borderRadius: 7, padding: '2px 8px', cursor: 'pointer' }}>Tag</button>
      </div>
      {tagging && <TagPopover job={job} members={members} current={assignees} onClose={() => setTagging(false)} onSaved={() => { setTagging(false); onTagged() }} />}
    </div>
  )
}

function TagPopover({ job, members, current, onClose, onSaved }: { job: JobRow; members: { id: string; name: string }[]; current: string[]; onClose: () => void; onSaved: () => void }) {
  const [sel, setSel] = useState<Set<string>>(new Set(current))
  const [saving, setSaving] = useState(false)
  const toggle = (id: string) => setSel((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/hire/jobs/${job.id}/assignees`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assigneeIds: Array.from(sel) }) })
    setSaving(false)
    if (res.ok) onSaved(); else alert('Could not update assignees — you may not have permission.')
  }

  return (
    <div onPointerDown={(e) => e.stopPropagation()} style={{ position: 'absolute', zIndex: 20, top: '100%', right: 0, marginTop: 4, width: 220, background: '#fff', border: `1px solid ${VIZ.line}`, borderRadius: 10, boxShadow: '0 12px 32px -8px rgba(0,0,0,0.25)', padding: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: VIZ.slate, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>Assign recruiters</div>
      <div style={{ maxHeight: 190, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {members.map((m) => (
          <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: VIZ.ink, padding: '4px 4px', borderRadius: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={sel.has(m.id)} onChange={() => toggle(m.id)} />
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: avatarColor(m.id), color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{initialsOf(m.name)}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <button onClick={save} disabled={saving} style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#fff', background: VIZ.primary, border: 'none', borderRadius: 7, padding: '6px 0', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
        <button onClick={onClose} style={{ fontSize: 12, fontWeight: 700, color: VIZ.slate, background: '#F1F5F9', border: 'none', borderRadius: 7, padding: '6px 12px', cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  )
}
