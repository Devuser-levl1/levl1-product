'use client'
import { useEffect, useState, useCallback } from 'react'

interface Row { userId: string; name: string; candidatesAdded: number; advanced: number; interviews: number; placements: number; score: number }
const PRESETS = [['This week', 7], ['This month', 30], ['This quarter', 90]] as const
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20 }

export function Leaderboard() {
  const [preset, setPreset] = useState<number>(30)
  const [custom, setCustom] = useState<{ from: string; to: string } | null>(null)
  const [draft, setDraft] = useState<{ from: string; to: string }>({ from: '', to: '' })
  const [rows, setRows] = useState<Row[] | null>(null)
  const [teamSize, setTeamSize] = useState<number | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  const load = useCallback(() => {
    setStatus('loading')
    let from: string, to: string
    if (custom) { from = new Date(custom.from).toISOString(); to = new Date(custom.to + 'T23:59:59').toISOString() }
    else { to = new Date().toISOString(); from = new Date(Date.now() - preset * 86400000).toISOString() }
    fetch(`/api/hire/leaderboard?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setRows(d.rows); setTeamSize(d.teamSize); setStatus('ready') } else setStatus('error') })
      .catch(() => setStatus('error'))
  }, [preset, custom])
  useEffect(() => { load() }, [load])

  const activePreset = custom ? null : preset
  const maxScore = Math.max(...(rows ?? []).map((r) => r.score), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: '#F1F5F9', borderRadius: 8, padding: 3 }}>
          {PRESETS.map(([label, d]) => (
            <button key={label} onClick={() => { setCustom(null); setPreset(d) }}
              style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: activePreset === d ? '#fff' : 'transparent', color: activePreset === d ? '#6D28D9' : '#64748B', boxShadow: activePreset === d ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>{label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="date" value={draft.from} onChange={(e) => setDraft((s) => ({ ...s, from: e.target.value }))} style={dateInput} />
          <span style={{ color: '#94A3B8', fontSize: 12 }}>→</span>
          <input type="date" value={draft.to} onChange={(e) => setDraft((s) => ({ ...s, to: e.target.value }))} style={dateInput} />
          <button disabled={!draft.from || !draft.to} onClick={() => setCustom({ from: draft.from, to: draft.to })}
            style={{ fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: custom ? 'rgba(109,40,217,0.08)' : '#fff', color: '#6D28D9', cursor: draft.from && draft.to ? 'pointer' : 'default' }}>Custom</button>
        </div>
      </div>

      {status === 'loading' && !rows && <div style={{ color: '#475569' }}>Loading…</div>}
      {status === 'error' && <div style={{ ...card, color: '#B91C1C' }}>Couldn&apos;t load the leaderboard. <button onClick={load} style={{ marginLeft: 8, color: '#6D28D9', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Retry</button></div>}

      {status !== 'error' && teamSize !== null && teamSize <= 1 && (
        <div style={{ ...card, textAlign: 'center', padding: '56px 24px' }}>
          <div style={{ fontSize: 38, marginBottom: 10 }}>🏆</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#475569' }}>Invite your team to see the leaderboard</div>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 4, maxWidth: 380, marginInline: 'auto' }}>The leaderboard ranks recruiters by productivity. Add teammates to start comparing.</div>
          <a href="/hire/settings" style={{ display: 'inline-block', marginTop: 16, padding: '9px 18px', borderRadius: 9, background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Invite teammates</a>
        </div>
      )}

      {status !== 'error' && teamSize !== null && teamSize > 1 && rows && (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: '#475569', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.04em', background: '#F8FAFC' }}>
                <th style={{ ...th, width: 44 }}>#</th>
                <th style={th}>Recruiter</th>
                <th style={thN}>Added</th>
                <th style={thN}>Advanced</th>
                <th style={thN}>Interviews</th>
                <th style={thN}>Placements</th>
                <th style={{ ...thN, paddingRight: 16 }}>Activity score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const top = i === 0 && r.score > 0
                return (
                  <tr key={r.userId} style={{ borderTop: '1px solid #F1F5F9', background: top ? 'rgba(109,40,217,0.05)' : undefined }}>
                    <td style={{ ...td, fontWeight: 800, color: top ? '#6D28D9' : '#94A3B8' }}>{top ? '🏆' : i + 1}</td>
                    <td style={{ ...td, fontWeight: 700, color: '#0F172A' }}>{r.name}{top && <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 700, color: '#6D28D9', background: 'rgba(109,40,217,0.1)', borderRadius: 100, padding: '2px 8px' }}>Top performer</span>}</td>
                    <td style={tdN}>{r.candidatesAdded}</td>
                    <td style={tdN}>{r.advanced}</td>
                    <td style={tdN}>{r.interviews}</td>
                    <td style={tdN}>{r.placements}</td>
                    <td style={{ ...tdN, paddingRight: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        <div style={{ width: 70, height: 7, borderRadius: 4, background: '#F1F5F9', overflow: 'hidden' }}><div style={{ width: `${(r.score / maxScore) * 100}%`, height: '100%', background: top ? '#6D28D9' : '#A78BFA' }} /></div>
                        <span style={{ fontWeight: 800, color: '#0F172A', minWidth: 24, textAlign: 'right' }}>{r.score}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ fontSize: 11, color: '#94A3B8', padding: '10px 16px', borderTop: '1px solid #F1F5F9' }}>
            Activity score = candidates added ×1 + advanced ×2 + interviews ×3 + placements ×5, over the selected range.
          </div>
        </div>
      )}
    </div>
  )
}

const dateInput: React.CSSProperties = { padding: '6px 8px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12.5, color: '#334155' }
const th: React.CSSProperties = { textAlign: 'left', padding: '10px 8px', fontWeight: 700, paddingLeft: 16 }
const thN: React.CSSProperties = { textAlign: 'right', padding: '10px 8px', fontWeight: 700 }
const td: React.CSSProperties = { padding: '11px 8px', paddingLeft: 16 }
const tdN: React.CSSProperties = { padding: '11px 8px', textAlign: 'right', color: '#334155' }
