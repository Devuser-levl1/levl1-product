'use client'
import { useState } from 'react'

interface JobLite {
  id: string; title: string; location: string | null
  mustHaveSkills?: string[]; niceToHaveSkills?: string[]
  rubric?: { skill: string; weight: number; required?: boolean }[] | null
}
interface BoardStrings { key: string; label: string; boolean: string; filters: string[] }

const inp: React.CSSProperties = { padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13, background: '#fff', boxSizing: 'border-box' }
const lbl: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5 }

// Lightweight chip input: type + Enter to add, × to remove.
function ChipInput({ value, onChange, placeholder, accent = '#6D28D9' }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string; accent?: string }) {
  const [draft, setDraft] = useState('')
  const add = () => { const v = draft.trim(); if (v && !value.includes(v)) onChange([...value, v]); setDraft('') }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 6, border: '1px solid #E2E8F0', borderRadius: 8, background: '#fff' }}>
      {value.map((s) => (
        <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: accent, background: `${accent}12`, borderRadius: 100, padding: '3px 8px' }}>
          {s}<button onClick={() => onChange(value.filter((x) => x !== s))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: accent, fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
        </span>
      ))}
      <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} onBlur={add} placeholder={placeholder}
        style={{ flex: 1, minWidth: 120, border: 'none', outline: 'none', fontSize: 13, background: 'transparent' }} />
    </div>
  )
}

function CopyBox({ board }: { board: BoardStrings }) {
  const [text, setText] = useState(board.boolean)
  const [copied, setCopied] = useState(false)
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* ignore */ } }
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: '#0F172A' }}>{board.label}</span>
        <button onClick={copy} style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 7, border: 'none', background: copied ? '#059669' : '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>{copied ? '✓ Copied' : 'Copy'}</button>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false}
        style={{ width: '100%', boxSizing: 'border-box', minHeight: 72, padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12.5, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', lineHeight: 1.5, color: '#1E293B', resize: 'vertical' }} />
      {board.filters.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 4 }}>Suggested filters</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {board.filters.map((f, i) => <span key={i} style={{ fontSize: 11, color: '#475569', background: '#F1F5F9', borderRadius: 6, padding: '3px 8px' }}>{f}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}

export function SourcingTab({ job }: { job: JobLite }) {
  const [mustHave, setMustHave] = useState<string[]>(job.mustHaveSkills ?? [])
  const [niceTo, setNiceTo] = useState<string[]>(job.niceToHaveSkills ?? [])
  const [exclude, setExclude] = useState<string[]>([])
  const [extra, setExtra] = useState<string[]>([])
  const [location, setLocation] = useState(job.location ?? '')
  const [expMin, setExpMin] = useState('')
  const [expMax, setExpMax] = useState('')
  const [boards, setBoards] = useState<BoardStrings[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [genKey, setGenKey] = useState(0) // forces fresh CopyBox state on regenerate

  async function generate() {
    setBusy(true); setErr('')
    try {
      const res = await fetch(`/api/hire/jobs/${job.id}/search-strings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: job.title, mustHaveSkills: mustHave, niceToHaveSkills: niceTo, exclude, extraKeywords: extra, location, experienceMin: expMin, experienceMax: expMax }),
      })
      const d = await res.json()
      if (!res.ok) { setErr(d.error ?? 'Failed to generate'); return }
      setBoards(d.boards); setGenKey((k) => k + 1)
    } catch { setErr('Network error — please try again.') } finally { setBusy(false) }
  }

  const topWeighted = (job.rubric ?? []).filter((r) => r.skill).sort((a, b) => (b.weight || 0) - (a.weight || 0)).slice(0, 3)

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ fontSize: 13.5, color: '#475569', marginBottom: 16, lineHeight: 1.6 }}>
        Generate boolean search strings for this role, then paste them into each job board and search manually.
        {topWeighted.length > 0 && <> Higher-weighted rubric skills lead the query{topWeighted.length ? <> — currently <strong>{topWeighted.map((r) => r.skill).join(', ')}</strong></> : ''}.</>}
      </div>

      {/* Inputs */}
      <div style={{ background: '#FBFAFF', border: '1px solid #EDE9FE', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={lbl}>Must-have skills</label><ChipInput value={mustHave} onChange={setMustHave} placeholder="Add skill + Enter" /></div>
          <div><label style={lbl}>Nice-to-have skills</label><ChipInput value={niceTo} onChange={setNiceTo} placeholder="Add skill + Enter" accent="#2563EB" /></div>
          <div><label style={lbl}>Extra keywords</label><ChipInput value={extra} onChange={setExtra} placeholder="e.g. fintech + Enter" accent="#059669" /></div>
          <div><label style={lbl}>Exclude (NOT)</label><ChipInput value={exclude} onChange={setExclude} placeholder="e.g. intern + Enter" accent="#DC2626" /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
          <div><label style={lbl}>Location</label><input style={{ ...inp, width: '100%' }} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Bengaluru" /></div>
          <div><label style={lbl}>Experience min (yrs)</label><input style={{ ...inp, width: '100%' }} type="number" value={expMin} onChange={(e) => setExpMin(e.target.value)} placeholder="3" /></div>
          <div><label style={lbl}>Experience max (yrs)</label><input style={{ ...inp, width: '100%' }} type="number" value={expMax} onChange={(e) => setExpMax(e.target.value)} placeholder="6" /></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
          <button onClick={generate} disabled={busy} style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: busy ? 'default' : 'pointer' }}>
            {busy ? 'Generating…' : boards ? '↻ Regenerate' : '✨ Generate search strings'}
          </button>
          {err && <span style={{ color: '#DC2626', fontSize: 13 }}>{err}</span>}
        </div>
      </div>

      {/* Results */}
      {boards && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {boards.map((b) => <CopyBox key={`${genKey}-${b.key}`} board={b} />)}
        </div>
      )}

      {/* Chrome extension pairing note */}
      <div style={{ marginTop: 18, display: 'flex', gap: 10, alignItems: 'flex-start', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 14px' }}>
        <span style={{ fontSize: 16 }}>🧩</span>
        <div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.6 }}>
          <strong style={{ color: '#0F172A' }}>Pairs with the Levl1 Chrome extension.</strong> Run these searches on each board, then capture promising profiles with the extension — they flow straight into your candidate pool, ready to attach to this job.
        </div>
      </div>
    </div>
  )
}
