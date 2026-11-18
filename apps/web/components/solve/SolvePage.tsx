'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import { Page, PageHeader, Table, Badge, EmptyState, Select, type Column, type Tone } from '@/components/screen/ui'
import { SOLVE_STATUS_LABEL, DEFENSE_STATUS_LABEL } from '@/lib/screen/solve/config'
import { PRODUCTS } from '@/config/site'

// ── Solve (sidebar) — every take-home across positions ─────────────────────
// Setup + sending happen per position (Position → Solve tab); this is the
// pipeline view: who is invited, working, defending, evaluated.

interface Row {
  id: string; status: string; invitedAt: string; deadlineAt: string | null; submittedAt: string | null; autoSubmitted: boolean
  submissionQuality: string | null; defenseStatus: string; score: number | null; recommendation: string | null; reportStatus: string | null; isDemo: boolean
  candidate: { id: string; name: string; email: string }
  position: { id: string; title: string; company: string }
}
const REC: Record<string, { label: string; tone: Tone }> = {
  strong_yes: { label: 'Strong yes', tone: 'success' }, yes: { label: 'Yes', tone: 'brand' }, maybe: { label: 'Maybe', tone: 'warning' }, no: { label: 'No', tone: 'danger' },
}
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—')

export function SolvePage() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [positions, setPositions] = useState<{ id: string; title: string; company: string }[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/solve/submissions', { cache: 'no-store' })
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error ?? 'Couldn\'t load take-homes.'); return d })
      .then((d) => { setRows(d.submissions); setPositions(d.positions) })
      .catch((e) => { setError(e instanceof Error ? e.message : 'Couldn\'t load take-homes.'); setRows([]) })
  }, [])

  const shown = useMemo(() => (rows ?? []).filter((r) => filter === 'all' || r.status === filter || (filter === 'defending' && ['pending', 'in_progress'].includes(r.defenseStatus) && r.status === 'submitted')), [rows, filter])

  const columns: Column<Row>[] = [
    { key: 'c', header: 'Candidate', render: (r) => <div><div style={{ fontWeight: 600, color: 'var(--lv-text)' }}>{r.candidate.name}{r.isDemo && <span style={{ fontWeight: 400, color: 'var(--lv-text-muted)' }}> · demo</span>}</div><div style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>{r.candidate.email}</div></div> },
    { key: 'p', header: 'Position', render: (r) => <div><div style={{ color: 'var(--lv-text)' }}>{r.position.title}</div><div style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>{r.position.company}</div></div> },
    { key: 's', header: 'Status', render: (r) => (
      <div style={{ display: 'grid', gap: 3 }}>
        <Badge tone={r.status === 'completed' ? 'success' : r.status === 'expired' ? 'danger' : r.status === 'invited' ? 'neutral' : 'brand'}>{SOLVE_STATUS_LABEL[r.status] ?? r.status}</Badge>
        {r.status === 'submitted' && r.defenseStatus !== 'not_required' && <span style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>{DEFENSE_STATUS_LABEL[r.defenseStatus]}</span>}
        {r.reportStatus === 'failed' && <span style={{ fontSize: 12, color: 'var(--lv-danger)' }}>Report failed</span>}
      </div>
    ) },
    { key: 'd', header: 'Dates', render: (r) => <span style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>Sent {fmt(r.invitedAt)}{r.submittedAt ? ` · in ${fmt(r.submittedAt)}` : r.deadlineAt ? ` · due ${fmt(r.deadlineAt)}` : ''}</span> },
    { key: 'r', header: 'Result', render: (r) => r.status !== 'completed' ? <span style={{ color: 'var(--lv-text-muted)' }}>—</span>
      : !r.recommendation ? <Badge tone="neutral">Insufficient evidence</Badge>
      : <Badge tone={REC[r.recommendation]?.tone ?? 'neutral'}>{REC[r.recommendation]?.label}{r.score != null ? ` · ${r.score}` : ''}</Badge> },
  ]

  return (
    <Page>
      <PageHeader eyebrow={`Stage ${PRODUCTS.takeHome.stage}`} title={PRODUCTS.takeHome.name} description={`${PRODUCTS.takeHome.tagline}. Set it up and send it from a position's ${PRODUCTS.takeHome.name} tab.`}
        actions={<Select aria-label="Filter by status" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 'auto' }}>
          <option value="all">All</option><option value="invited">Invited</option><option value="started">In progress</option>
          <option value="defending">Defense pending</option><option value="completed">Evaluated</option><option value="expired">Expired</option>
        </Select>} />
      {error && <p role="alert" style={{ color: 'var(--lv-danger)', fontSize: 13 }}>{error}</p>}
      <Table<Row> caption="Take-home assessments" columns={columns} rows={shown} rowKey={(r) => r.id} loading={rows === null}
        onRowClick={(r) => router.push(r.status === 'invited' || r.status === 'expired' ? `/positions/${r.position.id}?tab=solve` : `/solve/report/${r.id}`)}
        empty={<EmptyState icon={<ClipboardList size={22} />} title="No take-homes yet"
          description={positions.length
            ? `${positions.length} position${positions.length === 1 ? ' uses' : 's use'} ${PRODUCTS.takeHome.name}. Open a position's ${PRODUCTS.takeHome.name} tab to send it to candidates.`
            : `Open a position and turn on ${PRODUCTS.takeHome.name} in its ${PRODUCTS.takeHome.name} tab: pick a task, set the window, and send it to candidates who passed ${PRODUCTS.screen.name}.`} />} />
    </Page>
  )
}
