'use client'
import { useEffect, useState, useCallback } from 'react'

interface BoardRow {
  board: string
  label: string
  tier: 'A' | 'B'
  mode: 'api' | 'assisted'
  comingSoon: boolean
  connected: boolean
  hasCredentials: boolean
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20 }
const ghost: React.CSSProperties = { padding: '7px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }
const btn: React.CSSProperties = { padding: '7px 12px', borderRadius: 8, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }

export default function JobBoardsSettings() {
  const [boards, setBoards] = useState<BoardRow[]>([])
  const [credFor, setCredFor] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch('/api/hire/settings/job-boards').then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.boards) setBoards(d.boards) }).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  async function save(board: string, payload: Record<string, unknown>) {
    await fetch('/api/hire/settings/job-boards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ board, ...payload }) })
    load()
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Job Boards</h1>
      <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px' }}>Connect boards once, then post any job to them from the job&apos;s Distribute tab. Assisted boards work today; API mode posts live once you add credentials.</p>

      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {boards.map((b) => (
          <div key={b.board} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 4px', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>{b.label}</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B', background: '#F1F5F9', borderRadius: 100, padding: '2px 8px' }}>{b.mode === 'api' ? 'API' : 'Assisted'}</span>
                {b.tier === 'B' && <span style={{ fontSize: 10.5, fontWeight: 700, color: '#475569' }}>Tier B</span>}
              </div>
              <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                {b.comingSoon ? 'Coming soon' : b.connected ? (b.hasCredentials ? 'Connected · credentials stored' : 'Connected') : 'Not connected'}
              </div>
            </div>

            {b.comingSoon ? (
              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', background: '#F8FAFC', border: '1px dashed #64748B', borderRadius: 100, padding: '4px 12px' }}>Coming soon</span>
            ) : b.connected ? (
              <>
                <button style={ghost} onClick={() => setCredFor(credFor === b.board ? null : b.board)}>API creds</button>
                <button style={{ ...ghost, color: '#DC2626' }} onClick={() => save(b.board, { active: false })}>Disconnect</button>
              </>
            ) : (
              <button style={btn} onClick={() => save(b.board, { active: true })}>Connect</button>
            )}

            {credFor === b.board && <CredForm board={b.board} onSave={(creds) => { save(b.board, { mode: 'api', active: true, credentials: creds }); setCredFor(null) }} onCancel={() => setCredFor(null)} />}
          </div>
        ))}
      </div>
    </div>
  )
}

function CredForm({ board, onSave, onCancel }: { board: string; onSave: (creds: Record<string, string>) => void; onCancel: () => void }) {
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const inp: React.CSSProperties = { padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, width: '100%', boxSizing: 'border-box' }
  return (
    <div style={{ flexBasis: '100%', marginTop: 10, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#475569', marginBottom: 8 }}>Enter {board} API credentials (encrypted at rest)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input style={inp} placeholder="API key / client id" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
        <input style={inp} placeholder="API secret / client secret" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} type="password" />
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btn} disabled={!apiKey} onClick={() => onSave({ apiKey, apiSecret })}>Save credentials</button>
          <button style={ghost} onClick={onCancel}>Cancel</button>
        </div>
        <div style={{ fontSize: 11, color: '#475569' }}>Stored with AES-256-GCM. Live API posting for this board activates once our connector for it ships.</div>
      </div>
    </div>
  )
}
