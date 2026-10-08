'use client'
import { useEffect, useState, useCallback } from 'react'

interface Posting { id: string; status: string; externalUrl: string | null; postedAt: string | null; postedBy: string | null; error: string | null }
interface BoardRow {
  board: string
  label: string
  tier: 'A' | 'B'
  comingSoon: boolean
  enabled: boolean
  accountUrl: string | null
  postUrl: string | null
  assistedLabel: string
  posting: Posting | null
}
interface FormattedPost { fields: { label: string; value: string }[]; copyText: string }
interface AssistResult { board: string; label?: string; postingId?: string; status: string; postUrl?: string | null; formatted?: FormattedPost | null; error?: string }

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20 }
const btn: React.CSSProperties = { padding: '9px 14px', borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
const ghost: React.CSSProperties = { padding: '7px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }

function statusPill(status: string) {
  const map: Record<string, [string, string, string]> = {
    posted: ['Posted ✓', '#059669', 'rgba(5,150,105,0.1)'],
    manual_pending: ['In progress', '#D97706', 'rgba(245,158,11,0.12)'],
    failed: ['Failed', '#DC2626', 'rgba(220,38,38,0.08)'],
    expired: ['Removed', '#475569', '#F1F5F9'],
  }
  const [label, color, bg] = map[status] ?? [status, '#64748B', '#F1F5F9']
  return <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, borderRadius: 100, padding: '3px 10px' }}>{label}</span>
}

export function DistributePanel({ jobId }: { jobId: string }) {
  const [boards, setBoards] = useState<BoardRow[]>([])
  const [working, setWorking] = useState<string | null>(null)
  const [assist, setAssist] = useState<AssistResult | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(() => {
    fetch(`/api/hire/jobs/${jobId}/distribution`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.boards) setBoards(d.boards) }).catch(() => {})
  }, [jobId])
  useEffect(() => { load() }, [load])

  // Generate the formatted post + deep link for one board (no auto-posting).
  async function startPost(board: string) {
    setWorking(board); setAssist(null)
    try {
      const res = await fetch(`/api/hire/jobs/${jobId}/distribution`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ boards: [board] }) })
      const d = await res.json()
      const r: AssistResult | undefined = d?.results?.[0]
      if (r) setAssist(r)
      load()
    } finally { setWorking(null) }
  }

  // Recruiter confirms they posted it under their own account (+ optional URL).
  async function confirmPosted(postingId: string, withUrl: boolean) {
    const url = withUrl ? (prompt('Paste the live job URL from the board (optional):') ?? '') : ''
    await fetch(`/api/hire/jobs/${jobId}/distribution/${postingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'posted', externalUrl: url || undefined }) })
    setAssist(null); load()
  }
  async function remove(postingId: string) {
    if (!confirm('Mark this posting as removed?')) return
    await fetch(`/api/hire/jobs/${jobId}/distribution/${postingId}`, { method: 'DELETE' })
    load()
  }

  const live = boards.filter((b) => !b.comingSoon)
  const soon = boards.filter((b) => b.comingSoon)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>Post to job boards</div>
        <div style={{ fontSize: 12.5, color: '#475569', marginBottom: 14 }}>Levl1 formats the post and opens the board — you paste it and submit under your own account. Levl1 never auto-posts.</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {live.map((b) => (
            <div key={b.board} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', border: '1px solid #F1F5F9', borderRadius: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{b.label}</span>
                  {b.posting && statusPill(b.posting.status)}
                </div>
                <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
                  {!b.enabled ? <>Not enabled — <a href="/hire/settings/job-boards" style={{ color: '#6D28D9' }}>enable in settings</a></>
                    : b.posting?.status === 'posted'
                      ? <>Posted{b.posting.postedBy ? ` by ${b.posting.postedBy}` : ''}{b.posting.postedAt ? ` · ${new Date(b.posting.postedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}{b.posting.externalUrl ? <> · <a href={b.posting.externalUrl} target="_blank" rel="noreferrer" style={{ color: '#6D28D9' }}>view</a></> : ''}</>
                      : b.assistedLabel}
                </div>
              </div>
              {b.enabled && (
                <button onClick={() => startPost(b.board)} disabled={working === b.board} style={{ ...btn, opacity: working === b.board ? 0.6 : 1 }}>{working === b.board ? 'Preparing…' : b.posting?.status === 'posted' ? `Re-post to ${b.label}` : `Post to ${b.label}`}</button>
              )}
              {b.posting && b.posting.status !== 'expired' && <button onClick={() => remove(b.posting!.id)} style={{ ...ghost, color: '#DC2626' }}>Remove</button>}
            </div>
          ))}
        </div>

        {soon.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {soon.map((b) => <span key={b.board} style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', background: '#F8FAFC', border: '1px dashed #64748B', borderRadius: 100, padding: '4px 12px' }}>{b.label} · coming soon</span>)}
          </div>
        )}
      </div>

      {/* Assisted post: formatted fields + copy + open board + confirm */}
      {assist && assist.formatted && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Your {assist.label ?? assist.board} post is ready</div>
            {statusPill(assist.status)}
          </div>
          <div style={{ fontSize: 12.5, color: '#475569', marginBottom: 12 }}>1. Copy the post · 2. Open {assist.label ?? assist.board} and paste it under your own account · 3. Come back and confirm.</div>

          <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
            {assist.formatted.fields.map((f) => (
              <div key={f.label} style={{ display: 'flex', gap: 10, padding: '8px 12px', borderBottom: '1px solid #F1F5F9', fontSize: 12.5 }}>
                <span style={{ width: 130, flexShrink: 0, color: '#94A3B8', fontWeight: 700 }}>{f.label}</span>
                <span style={{ color: '#334155', whiteSpace: 'pre-wrap', minWidth: 0 }}>{f.value}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => { navigator.clipboard?.writeText(assist.formatted!.copyText).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }).catch(() => {}) }} style={btn}>{copied ? 'Copied ✓' : 'Copy formatted post'}</button>
            {assist.postUrl && <a href={assist.postUrl} target="_blank" rel="noreferrer" style={{ ...ghost, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Open {assist.label ?? assist.board} to post →</a>}
            {assist.postingId && <button onClick={() => confirmPosted(assist.postingId!, true)} style={{ ...ghost, color: '#059669', borderColor: 'rgba(5,150,105,0.3)' }}>I&apos;ve posted it — confirm</button>}
          </div>
        </div>
      )}

      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginBottom: 10 }}>Where this job is posted</div>
        {boards.filter((b) => b.posting).length === 0 ? (
          <div style={{ fontSize: 13, color: '#475569' }}>Not posted to any board yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {boards.filter((b) => b.posting).map((b) => (
              <div key={b.board} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid #F1F5F9', borderRadius: 10 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>{b.label}</span>
                {statusPill(b.posting!.status)}
                <span style={{ fontSize: 12, color: '#64748B' }}>
                  {b.posting!.postedBy ? `by ${b.posting!.postedBy}` : ''}
                  {b.posting!.postedAt ? ` · ${new Date(b.posting!.postedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}` : ''}
                </span>
                {b.posting!.externalUrl && <a href={b.posting!.externalUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: '#6D28D9' }}>View →</a>}
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  {b.posting!.status === 'manual_pending' && b.posting!.id && <button onClick={() => confirmPosted(b.posting!.id, true)} style={ghost}>Confirm posted</button>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
