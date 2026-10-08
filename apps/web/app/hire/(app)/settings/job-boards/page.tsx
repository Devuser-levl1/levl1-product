'use client'
import { useEffect, useState, useCallback } from 'react'

interface BoardRow {
  board: string
  label: string
  tier: 'A' | 'B'
  comingSoon: boolean
  enabled: boolean
  accountUrl: string | null
  postUrl: string | null
  assistedLabel: string
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20 }
const ghost: React.CSSProperties = { padding: '7px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }
const btn: React.CSSProperties = { padding: '7px 12px', borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }
const inp: React.CSSProperties = { padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, width: '100%', boxSizing: 'border-box' }

export default function JobBoardsSettings() {
  const [boards, setBoards] = useState<BoardRow[]>([])
  const [editFor, setEditFor] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch('/api/hire/settings/job-boards').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.boards) setBoards(d.boards) }).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  async function save(board: string, payload: Record<string, unknown>) {
    await fetch('/api/hire/settings/job-boards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ board, ...payload }) })
    setEditFor(null)
    load()
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Job Boards</h1>
      <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 8px' }}>Enable the boards your agency has accounts on. From a job&apos;s <strong>Distribute</strong> tab, Levl1 formats the post and opens the board — you paste and submit under your own account.</p>
      <div style={{ fontSize: 12, color: '#475569', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px', marginBottom: 20 }}>
        Levl1 does not auto-post or log into boards on your behalf. It assists — posts always go out under your own board account.
      </div>

      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {boards.map((b) => (
          <div key={b.board} style={{ padding: '14px 4px', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>{b.label}</span>
                  {!b.comingSoon && <span style={{ fontSize: 10.5, fontWeight: 700, color: '#6D28D9', background: 'rgba(109,40,217,0.08)', borderRadius: 100, padding: '2px 8px' }}>Assisted</span>}
                  {b.enabled && <span style={{ fontSize: 10.5, fontWeight: 700, color: '#059669', background: 'rgba(5,150,105,0.1)', borderRadius: 100, padding: '2px 8px' }}>Enabled</span>}
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>
                  {b.comingSoon ? 'Coming soon' : b.assistedLabel}
                </div>
                {b.enabled && b.accountUrl && (
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>Your account: <a href={b.accountUrl} target="_blank" rel="noreferrer" style={{ color: '#6D28D9' }}>{b.accountUrl}</a></div>
                )}
              </div>

              {b.comingSoon ? (
                <span style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', background: '#F8FAFC', border: '1px dashed #64748B', borderRadius: 100, padding: '4px 12px' }}>Coming soon</span>
              ) : b.enabled ? (
                <>
                  <button style={ghost} onClick={() => setEditFor(editFor === b.board ? null : b.board)}>Edit account</button>
                  <button style={{ ...ghost, color: '#DC2626' }} onClick={() => save(b.board, { enabled: false })}>Disable</button>
                </>
              ) : (
                <button style={btn} onClick={() => setEditFor(b.board)}>Enable</button>
              )}
            </div>

            {editFor === b.board && !b.comingSoon && (
              <AccountForm board={b} onSave={(accountUrl) => save(b.board, { enabled: true, accountUrl })} onCancel={() => setEditFor(null)} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function AccountForm({ board, onSave, onCancel }: { board: BoardRow; onSave: (accountUrl: string) => void; onCancel: () => void }) {
  const [url, setUrl] = useState(board.accountUrl ?? '')
  return (
    <div style={{ marginTop: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Your {board.label} employer-account URL <span style={{ fontWeight: 400, color: '#94A3B8' }}>(optional)</span></div>
      <input style={inp} placeholder={board.postUrl ?? `https://…/${board.board}`} value={url} onChange={(e) => setUrl(e.target.value)} />
      <div style={{ fontSize: 11, color: '#64748B', margin: '6px 0 10px' }}>We store a reference to your own account so posts are attributed correctly. No passwords or API keys — Levl1 never logs in for you.</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={btn} onClick={() => onSave(url.trim())}>{board.enabled ? 'Save' : 'Enable board'}</button>
        <button style={ghost} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
