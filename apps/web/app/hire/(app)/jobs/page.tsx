'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Job { id: string; title: string; department: string | null; status: string; createdAt: string; assigneeId: string | null; _count: { candidates: number }; client: { id: string; name: string } | null }
interface Usage { trialActive: boolean; limits: { activeJobs: number }; usage: { activeJobs: number } }
const STATUS_COLORS: Record<string, string> = { ACTIVE: '#10B981', PAUSED: '#F59E0B', CLOSED: '#475569' }

export default function JobsListPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [team, setTeam] = useState<Record<string, string>>({})
  const [usage, setUsage] = useState<Usage | null>(null)
  const [filter, setFilter] = useState('ALL')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch('/api/hire/jobs').then((r) => (r.ok ? r.json() : [])).then((d) => Array.isArray(d) && setJobs(d)).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { fetch('/api/hire/team').then((r) => (r.ok ? r.json() : [])).then((d) => Array.isArray(d) && setTeam(Object.fromEntries(d.map((u: { id: string; name: string }) => [u.id, u.name])))).catch(() => {}) }, [])
  useEffect(() => { fetch('/api/hire/billing/status').then((r) => (r.ok ? r.json() : null)).then(setUsage).catch(() => {}) }, [jobs.length])

  const atLimit = usage ? usage.usage.activeJobs >= usage.limits.activeJobs : false

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch(`/api/hire/jobs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setMenuOpen(null); load()
  }
  async function duplicate(id: string) {
    await fetch(`/api/hire/jobs/${id}/duplicate`, { method: 'POST' }); setMenuOpen(null); load()
  }
  async function del(id: string) {
    if (!confirm('Delete this job? Candidates will be detached.')) return
    await fetch(`/api/hire/jobs/${id}`, { method: 'DELETE' }); setMenuOpen(null); load()
  }

  const counts = { ALL: jobs.length, ACTIVE: jobs.filter((j) => j.status === 'ACTIVE').length, PAUSED: jobs.filter((j) => j.status === 'PAUSED').length, CLOSED: jobs.filter((j) => j.status === 'CLOSED').length }
  const shown = filter === 'ALL' ? jobs : jobs.filter((j) => j.status === filter)

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Jobs</h1>
        {usage && (
          <span style={{ fontSize: 12.5, fontWeight: 600, color: atLimit ? '#B45309' : '#64748B', background: atLimit ? 'rgba(245,158,11,0.12)' : '#F1F5F9', borderRadius: 100, padding: '4px 11px' }}>
            Jobs: {usage.usage.activeJobs} of {usage.limits.activeJobs} used{usage.trialActive ? ' (trial)' : ''}
          </span>
        )}
        <button onClick={() => router.push('/hire/jobs/new')} style={{ marginLeft: 'auto', padding: '10px 16px', borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>+ New Job</button>
      </div>

      {atLimit && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <span style={{ fontSize: 13.5, color: '#92400E' }}>
            You&apos;ve reached your {usage?.trialActive ? 'trial ' : ''}limit of {usage?.limits.activeJobs} jobs.
          </span>
          <a href="/hire/settings/billing" style={{ marginLeft: 'auto', fontSize: 13.5, fontWeight: 700, color: '#6D28D9', textDecoration: 'none' }}>Upgrade to add more →</a>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['ALL', 'ACTIVE', 'PAUSED', 'CLOSED'] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} style={{ fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 100, border: '1px solid ' + (filter === s ? '#6D28D9' : '#E2E8F0'), background: filter === s ? 'rgba(109,40,217,0.08)' : '#fff', color: filter === s ? '#6D28D9' : '#64748B', cursor: 'pointer' }}>
            {s.charAt(0) + s.slice(1).toLowerCase()} ({counts[s]})
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'visible' }}>
        {shown.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#475569' }}>No jobs yet. Create your first one.</div>}
        {shown.map((j, idx) => (
          <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: idx < shown.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{j.title}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLORS[j.status], background: `${STATUS_COLORS[j.status]}1A`, padding: '2px 8px', borderRadius: 100 }}>{j.status.charAt(0) + j.status.slice(1).toLowerCase()}</span>
              </div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{[j.client?.name, j.department].filter(Boolean).join(' · ') || '—'}</div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{j._count.candidates} candidate{j._count.candidates !== 1 ? 's' : ''} · Created {new Date(j.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {j.assigneeId ? `Owner: ${team[j.assigneeId] ?? '…'}` : 'Unassigned'}</div>
            </div>
            <button onClick={() => router.push(`/hire/jobs/${j.id}`)} style={ghost}>View</button>
            <button onClick={() => router.push(`/hire/jobs/${j.id}?tab=settings`)} style={ghost}>Edit</button>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setMenuOpen(menuOpen === j.id ? null : j.id)} style={{ ...ghost, padding: '6px 10px' }}>⋯</button>
              {menuOpen === j.id && (
                <div style={{ position: 'absolute', right: 0, top: '110%', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, boxShadow: '0 4px 16px rgba(15,23,42,0.1)', zIndex: 10, minWidth: 130 }}>
                  {j.status !== 'PAUSED' && <MenuItem onClick={() => patch(j.id, { status: 'PAUSED' })}>Pause</MenuItem>}
                  {j.status === 'PAUSED' && <MenuItem onClick={() => patch(j.id, { status: 'ACTIVE' })}>Resume</MenuItem>}
                  <MenuItem onClick={() => duplicate(j.id)}>Duplicate</MenuItem>
                  {j.status !== 'CLOSED' && <MenuItem onClick={() => patch(j.id, { status: 'CLOSED' })}>Close</MenuItem>}
                  <MenuItem onClick={() => del(j.id)} danger>Delete</MenuItem>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const ghost: React.CSSProperties = { fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', cursor: 'pointer' }
function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return <button onClick={onClick} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', color: danger ? '#DC2626' : '#334155' }}>{children}</button>
}
