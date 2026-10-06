'use client'
import { useCallback, useEffect, useState } from 'react'
import { VIZ } from '@/components/hire/viz'

interface OpenJob {
  id: string
  title: string
  clientName: string | null
  location: string | null
  candidateCount: number
  daysOpen: number
  assigneeId: string | null
  assigneeName: string | null
  mine: boolean
}

// Team → Open jobs. Lets any (non-viewer) member see every open job in the
// tenant and claim one for themselves. On claim the job appears instantly on
// their dashboard/lists (assignee scoping) — no admin action, no reload.
export function OpenJobs() {
  const [jobs, setJobs] = useState<OpenJob[] | null>(null)
  const [canSelfAssign, setCanSelfAssign] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'unclaimed'>('all')

  const load = useCallback(() => {
    fetch('/api/hire/jobs/open')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) { setJobs([]); return }
        setJobs(d.jobs)
        setCanSelfAssign(Boolean(d.canSelfAssign))
      })
      .catch(() => setJobs([]))
  }, [])
  useEffect(() => { load() }, [load])

  async function claim(job: OpenJob) {
    if (!canSelfAssign || busy) return
    setError(null)
    setBusy(job.id)
    // Optimistic: show it as mine immediately.
    setJobs((prev) => prev && prev.map((j) => (j.id === job.id ? { ...j, mine: true, assigneeId: 'me', assigneeName: 'You' } : j)))
    try {
      const res = await fetch(`/api/hire/jobs/${job.id}/self-assign`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        setError(d?.error ?? 'Could not take this job.')
        load() // revert to server truth
      } else {
        load() // refresh assignee name / counts
      }
    } catch {
      setError('Network error — please try again.')
      load()
    } finally {
      setBusy(null)
    }
  }

  if (jobs === null) return <div style={{ color: '#475569' }}>Loading…</div>

  const shown = filter === 'unclaimed' ? jobs.filter((j) => !j.assigneeId) : jobs
  const unclaimed = jobs.filter((j) => !j.assigneeId).length

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 13.5, color: VIZ.slate }}>
          Every open job in your workspace. Claim one to add it to your dashboard instantly.
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, background: '#F1F5F9', borderRadius: 100, padding: 3 }}>
          {([['all', `All (${jobs.length})`], ['unclaimed', `Unclaimed (${unclaimed})`]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 100, border: 'none', cursor: 'pointer', background: filter === k ? '#fff' : 'transparent', color: filter === k ? VIZ.primary : '#64748B', boxShadow: filter === k ? '0 1px 2px rgba(0,0,0,0.08)' : 'none' }}>{l}</button>
          ))}
        </div>
      </div>

      {error && <div style={{ fontSize: 12.5, color: VIZ.bad, background: VIZ.badSoft, border: `1px solid ${VIZ.bad}33`, borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shown.map((j) => (
          <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: `1px solid ${VIZ.line}`, borderRadius: 11, padding: '11px 14px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <a href={`/hire/jobs/${j.id}`} style={{ fontSize: 14, fontWeight: 700, color: VIZ.ink, textDecoration: 'none' }}>{j.title}</a>
              <div style={{ fontSize: 12, color: VIZ.faint, marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {j.clientName && <span>{j.clientName}</span>}
                {j.location && <span>· {j.location}</span>}
                <span>· {j.candidateCount} candidate{j.candidateCount === 1 ? '' : 's'}</span>
                <span>· {j.daysOpen}d open</span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: j.assigneeId ? VIZ.slate : VIZ.warn, width: 120, textAlign: 'right' }}>
              {j.mine ? <span style={{ fontWeight: 700, color: VIZ.good }}>Yours</span> : j.assigneeName ? j.assigneeName : 'Unassigned'}
            </div>
            {canSelfAssign && (
              j.mine ? (
                <span style={{ fontSize: 12, fontWeight: 700, color: VIZ.good, width: 110, textAlign: 'center' }}>✓ On your list</span>
              ) : (
                <button onClick={() => claim(j)} disabled={busy === j.id} style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', background: VIZ.primary, border: 'none', borderRadius: 8, padding: '7px 14px', cursor: busy === j.id ? 'wait' : 'pointer', width: 110, opacity: busy === j.id ? 0.6 : 1 }}>
                  {busy === j.id ? 'Taking…' : j.assigneeId ? 'Take over' : 'Assign to me'}
                </button>
              )
            )}
          </div>
        ))}
        {shown.length === 0 && <div style={{ fontSize: 13, color: VIZ.faint, padding: '14px 0' }}>No open jobs{filter === 'unclaimed' ? ' are unclaimed' : ''} right now.</div>}
      </div>
    </div>
  )
}
