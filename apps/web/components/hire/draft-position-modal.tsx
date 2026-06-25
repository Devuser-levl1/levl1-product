'use client'
import { useEffect, useState } from 'react'
import { ClientPicker } from '@/components/hire/client-picker'

interface Brief { title: string; summary: string; responsibilities: string[]; mustHaveSkills: string[]; niceToHaveSkills: string[]; experience: string; screeningCriteria: string[]; suggestedInterviewFocus: string[] }
interface Hints { role: string | null; positions: number | null; billRate: number | null; currency: string | null; hoursPerWeek: number | null; durationValue: number | null; durationUnit: 'weeks' | 'months' | null; location: string | null }

const inp: React.CSSProperties = { padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff', width: '100%', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }

// Months→weeks (52/12) — matches the CRM deal-math feature exactly.
function dealSize(h: Hints): number | null {
  if (!(h.positions && h.billRate && h.hoursPerWeek && h.durationValue)) return null
  const weeks = h.durationUnit === 'months' ? h.durationValue * (52 / 12) : h.durationValue
  return Math.round(h.positions * h.billRate * h.hoursPerWeek * weeks)
}

// Shared "Create position from email" flow: generate-brief → review/edit →
// approve → create job (rubric/location pre-filled) + optional linked CRM deal +
// mark the source email drafted. Used by the Inbox tab and Settings → Mailbox.
export function DraftPositionModal({ messageId, onClose, onDone }: { messageId: string; onClose: () => void; onDone: () => void }) {
  const [phase, setPhase] = useState<'loading' | 'review' | 'saving' | 'error'>('loading')
  const [brief, setBrief] = useState<Brief | null>(null)
  const [title, setTitle] = useState('')
  const [hints, setHints] = useState<Hints | null>(null)
  const [client, setClient] = useState<{ id: string; name: string } | null>(null)
  const [clientId, setClientId] = useState('')
  const [makeDeal, setMakeDeal] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const detail = await fetch(`/api/hire/mailbox/messages/${messageId}`).then((r) => r.json())
        const senderCtx = `From: ${detail.fromName ? `${detail.fromName} ` : ''}<${detail.fromAddr}>\nSubject: ${detail.subject}\n\n${detail.bodyText?.slice(0, 6000) ?? ''}`
        const [briefRes, hintsRes] = await Promise.all([
          fetch('/api/hire/jobs/generate-brief', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: detail.subject?.replace(/^(re|fwd):\s*/i, '').trim() || 'New role', notes: senderCtx }) }),
          fetch(`/api/hire/mailbox/messages/${messageId}/hints`, { method: 'POST' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ])
        const d = await briefRes.json()
        if (!briefRes.ok) { setErr(d.error ?? 'Could not draft a brief'); setPhase('error'); return }
        setBrief(d.brief); setTitle(d.brief.title)
        if (hintsRes?.hints) { setHints(hintsRes.hints); setClient(hintsRes.client ?? null); if (hintsRes.client?.id) setClientId(hintsRes.client.id) }
        setPhase('review')
      } catch { setErr('Network error'); setPhase('error') }
    })()
  }, [messageId])

  async function createJob() {
    if (!brief) return
    setPhase('saving'); setErr('')
    const description = [brief.summary, brief.responsibilities?.length ? '\nResponsibilities:\n- ' + brief.responsibilities.join('\n- ') : '', brief.experience ? `\nExperience: ${brief.experience}` : ''].filter(Boolean).join('\n')
    const rubric = [
      ...(brief.mustHaveSkills ?? []).map((skill) => ({ skill, weight: 4, required: true })),
      ...(brief.niceToHaveSkills ?? []).map((skill) => ({ skill, weight: 2, required: false })),
    ]
    const res = await fetch('/api/hire/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description, mustHaveSkills: brief.mustHaveSkills, niceToHaveSkills: brief.niceToHaveSkills, screeningCriteria: brief.screeningCriteria, interviewFocus: brief.suggestedInterviewFocus, location: hints?.location ?? undefined, clientId: clientId || null, rubric, aiGenerated: true }) })
    const job = await res.json()
    if (!res.ok) { setErr(job.error ?? 'Failed to create job'); setPhase('review'); return }
    if (makeDeal && clientId && hints && dealSize(hints) != null) {
      await fetch('/api/hire/crm/deals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, title: `${title} — ${hints.positions} role${(hints.positions ?? 0) > 1 ? 's' : ''}`, jobIds: [job.id], positions: hints.positions, billRate: hints.billRate, hoursPerWeek: hints.hoursPerWeek, durationValue: hints.durationValue, durationUnit: hints.durationUnit ?? 'months' }) }).catch(() => {})
    }
    await fetch(`/api/hire/mailbox/messages/${messageId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'drafted', createdPositionId: job.id }) })
    window.location.href = `/hire/jobs/${job.id}`
    onDone()
  }

  const size = hints ? dealSize(hints) : null
  const econ = hints && (hints.positions || hints.billRate || hints.durationValue)

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 90, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 24, width: 580, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Create position from email</div>
        <div style={{ fontSize: 12.5, color: '#64748B', marginBottom: 16 }}>Review &amp; edit the AI-drafted position. Nothing is created until you approve.</div>
        {phase === 'loading' && <div style={{ color: '#475569', padding: '20px 0' }}>✨ Reading the email and drafting a position…</div>}
        {phase === 'error' && <div style={{ color: '#DC2626' }}>{err}</div>}
        {(phase === 'review' || phase === 'saving') && brief && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><label style={lbl}>Title</label><input style={inp} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><label style={lbl}>Client{client ? ' (matched from sender)' : ''}</label><ClientPicker value={clientId} onChange={(id) => setClientId(id)} /></div>
            <div><label style={lbl}>Summary</label><div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{brief.summary}</div></div>
            {brief.mustHaveSkills?.length > 0 && <div><label style={lbl}>Must-have skills → rubric</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{brief.mustHaveSkills.map((s) => <span key={s} style={{ fontSize: 11.5, background: '#F1F5F9', color: '#475569', borderRadius: 100, padding: '3px 9px' }}>{s}</span>)}</div></div>}
            {(brief.experience || hints?.location) && <div style={{ fontSize: 12.5, color: '#475569' }}>{brief.experience ? `Experience: ${brief.experience}` : ''}{brief.experience && hints?.location ? ' · ' : ''}{hints?.location ? `Location: ${hints.location}` : ''}</div>}
            {econ && (
              <div style={{ background: '#FBFAFF', border: '1px solid #EDE9FE', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#6D28D9', marginBottom: 6 }}>Detected from the email</div>
                <div style={{ fontSize: 12.5, color: '#475569' }}>
                  {[hints?.positions ? `${hints.positions} position${hints.positions > 1 ? 's' : ''}` : null, hints?.billRate ? `${hints.currency === 'USD' ? '$' : ''}${hints.billRate}/hr` : null, hints?.hoursPerWeek ? `${hints.hoursPerWeek} hrs/wk` : null, hints?.durationValue ? `${hints.durationValue} ${hints.durationUnit ?? 'months'}` : null].filter(Boolean).join(' · ')}
                  {size != null && <span style={{ fontWeight: 700, color: '#6D28D9' }}> → deal size ≈ ₹{size.toLocaleString('en-IN')}</span>}
                </div>
                {clientId && size != null
                  ? <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 12.5, color: '#475569', cursor: 'pointer' }}><input type="checkbox" checked={makeDeal} onChange={(e) => setMakeDeal(e.target.checked)} /> Also create a linked CRM deal for the selected client</label>
                  : size != null ? <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 8 }}>Select a client above to also create a linked CRM deal with these economics.</div> : null}
              </div>
            )}
            {err && <div style={{ color: '#DC2626', fontSize: 13 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={createJob} disabled={phase === 'saving'} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{phase === 'saving' ? 'Creating…' : 'Approve & create position'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
