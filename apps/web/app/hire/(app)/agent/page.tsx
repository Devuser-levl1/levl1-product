'use client'
import { useCallback, useEffect, useState } from 'react'
import { AgentApprovalCard, type AgentProposalView, type AgentOption } from '@/components/hire/agent-approval-card'

export default function AgentInboxPage() {
  const [proposals, setProposals] = useState<AgentProposalView[]>([])
  const [loaded, setLoaded] = useState(false)
  const [note, setNote] = useState('')

  const load = useCallback(() => {
    fetch('/api/hire/agent/proposals?status=pending')
      .then((r) => (r.ok ? r.json() : { proposals: [] }))
      .then((d) => { setProposals(d.proposals ?? []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])
  useEffect(() => { load() }, [load])

  async function approve(id: string, option: AgentOption) {
    setNote('')
    const res = await fetch(`/api/hire/agent/proposals/${id}/approve`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chosenOption: option }),
    })
    const d = await res.json().catch(() => ({}))
    setNote(res.ok ? (d.summary ?? 'Done.') : (d.error ?? 'Could not approve.'))
    load()
  }
  async function dismiss(id: string) {
    await fetch(`/api/hire/agent/proposals/${id}/reject`, { method: 'POST' }).catch(() => {})
    setNote('Dismissed.')
    load()
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Agent</h1>
      <div style={{ fontSize: 13.5, color: '#64748B', marginBottom: 16 }}>Actions the Levl1 Agent suggests. Nothing runs until you approve.</div>

      {note && <div style={{ fontSize: 13, color: '#059669', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.22)', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>{note}</div>}

      {!loaded ? <div style={{ color: '#475569' }}>Loading…</div>
        : proposals.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 28, textAlign: 'center', color: '#64748B', fontSize: 14 }}>
            No pending suggestions. When a résumé arrives in a connected mailbox, the agent will propose the best-fit jobs here.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {proposals.map((p) => <AgentApprovalCard key={p.id} proposal={p} onApprove={approve} onDismiss={dismiss} />)}
          </div>
        )}
    </div>
  )
}
