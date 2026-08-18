'use client'
import { useState } from 'react'

// Generic agent approval card — renders ANY AgentProposal (not résumé-specific):
// title, summary, a set of choosable options, and Approve/Dismiss. A future
// agent (e.g. sourcing) reuses this unchanged by emitting options with a
// `label` (+ optional `sublabel`); the rest of each option object is passed back
// verbatim as the chosen option.
export interface AgentOption { label: string; sublabel?: string; [k: string]: unknown }
export interface AgentProposalView {
  id: string
  agent: string
  status: string
  title: string
  summary?: string | null
  options?: AgentOption[] | null
}

export function AgentApprovalCard({ proposal, onApprove, onDismiss }: {
  proposal: AgentProposalView
  onApprove: (id: string, option: AgentOption) => Promise<void>
  onDismiss: (id: string) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)
  const options = proposal.options ?? []
  const done = proposal.status !== 'pending'

  async function approve(i: number, opt: AgentOption) {
    if (busy) return
    setBusy(true); setPicked(i)
    try { await onApprove(proposal.id, opt) } finally { setBusy(false); setPicked(null) }
  }
  async function dismiss() {
    if (busy) return
    setBusy(true)
    try { await onDismiss(proposal.id) } finally { setBusy(false) }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 18, opacity: done ? 0.6 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#6D28D9', background: 'rgba(109,40,217,0.1)', borderRadius: 100, padding: '2px 9px' }}>✨ {proposal.agent}</span>
        {done && <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'capitalize' }}>{proposal.status}</span>}
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{proposal.title}</div>
      {proposal.summary && <div style={{ fontSize: 13, color: '#475569', marginTop: 4, lineHeight: 1.5 }}>{proposal.summary}</div>}

      {!done && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
            {options.map((opt, i) => (
              <button key={i} onClick={() => approve(i, opt)} disabled={busy}
                style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid #E2E8F0', background: picked === i ? 'rgba(109,40,217,0.06)' : '#fff', cursor: busy ? 'default' : 'pointer' }}>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>{opt.label}</span>
                  {opt.sublabel && <span style={{ display: 'block', fontSize: 12, color: '#64748B', marginTop: 1 }}>{opt.sublabel}</span>}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#6D28D9' }}>{picked === i && busy ? '…' : 'Approve →'}</span>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 10 }}>
            <button onClick={dismiss} disabled={busy} style={{ fontSize: 13, fontWeight: 600, color: '#64748B', background: 'none', border: 'none', cursor: busy ? 'default' : 'pointer', padding: 0 }}>Dismiss</button>
          </div>
        </>
      )}
    </div>
  )
}
