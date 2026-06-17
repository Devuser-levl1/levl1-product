'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface JobRow { id: string; title: string; location: string | null; department: string | null; showOnCareers: boolean }
interface Config { companyName: string; logoUrl: string; careerSlug: string; suggestedSlug: string; careerEnabled: boolean; brandColor: string; careerTagline: string; careerDescription: string }
const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20 }
const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 13.5 }

export default function CareerPageBuilder() {
  const router = useRouter()
  const [cfg, setCfg] = useState<Config | null>(null)
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(() => {
    fetch('/api/hire/career-settings').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) return
      setCfg({ ...d.config, careerSlug: d.config.careerSlug || d.config.suggestedSlug })
      setJobs(d.jobs)
      setSelected(new Set(d.jobs.filter((j: JobRow) => j.showOnCareers).map((j: JobRow) => j.id)))
    }).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  const set = (patch: Partial<Config>) => setCfg((c) => (c ? { ...c, ...patch } : c))
  const toggleJob = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  async function save() {
    if (!cfg) return
    setSaving(true); setMsg('')
    const res = await fetch('/api/hire/career-settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        careerSlug: cfg.careerSlug, careerEnabled: cfg.careerEnabled, brandColor: cfg.brandColor,
        logoUrl: cfg.logoUrl, careerTagline: cfg.careerTagline, careerDescription: cfg.careerDescription,
        jobIds: Array.from(selected),
      }),
    })
    const d = await res.json().catch(() => ({}))
    setSaving(false)
    setMsg(res.ok ? 'Saved.' : (d.error ?? 'Save failed.'))
    if (res.ok) load()
  }

  if (!cfg) return <div style={{ color: '#475569' }}>Loading…</div>
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const publicUrl = `${origin}/careers/${cfg.careerSlug || cfg.suggestedSlug}`

  return (
    <div style={{ maxWidth: 760 }}>
      <button onClick={() => router.push('/hire/settings')} style={{ fontSize: 13, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8 }}>← Settings</button>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Career Page</h1>
      <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 18px' }}>A branded public page listing your open roles. Each role links to its application form.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Publish + URL */}
        <div style={card}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 12 }}>
            <input type="checkbox" checked={cfg.careerEnabled} onChange={(e) => set({ careerEnabled: e.target.checked })} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Publish career page</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: cfg.careerEnabled ? '#059669' : '#94A3B8', background: cfg.careerEnabled ? 'rgba(5,150,105,0.1)' : '#F1F5F9', borderRadius: 100, padding: '2px 10px' }}>{cfg.careerEnabled ? 'Live' : 'Draft'}</span>
          </label>
          <Field label="Public URL">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: '#94A3B8' }}>{origin}/careers/</span>
              <input value={cfg.careerSlug} onChange={(e) => set({ careerSlug: e.target.value })} style={{ ...input, width: 220 }} />
              {cfg.careerEnabled && <a href={publicUrl} target="_blank" rel="noopener" style={{ fontSize: 12.5, fontWeight: 700, color: '#6D28D9' }}>View page ↗</a>}
            </div>
          </Field>
        </div>

        {/* Branding */}
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>Branding</div>
          <Field label="Logo URL"><input value={cfg.logoUrl} onChange={(e) => set({ logoUrl: e.target.value })} placeholder="https://…/logo.png" style={input} /></Field>
          <Field label="Brand color">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(cfg.brandColor) ? cfg.brandColor : '#6D28D9'} onChange={(e) => set({ brandColor: e.target.value })} style={{ width: 44, height: 36, border: '1px solid #E2E8F0', borderRadius: 8, background: '#fff', cursor: 'pointer' }} />
              <input value={cfg.brandColor} onChange={(e) => set({ brandColor: e.target.value })} style={{ ...input, width: 120 }} />
            </div>
          </Field>
          <Field label="Tagline"><input value={cfg.careerTagline} onChange={(e) => set({ careerTagline: e.target.value })} placeholder={`Careers at ${cfg.companyName}`} style={input} /></Field>
          <Field label="Description"><textarea value={cfg.careerDescription} onChange={(e) => set({ careerDescription: e.target.value })} placeholder="A sentence or two about your company and why people love working here." style={{ ...input, minHeight: 90, fontFamily: 'inherit' }} /></Field>
        </div>

        {/* Job selection */}
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Jobs on the page</div>
          <div style={{ fontSize: 12.5, color: '#94A3B8', marginBottom: 12 }}>Only ACTIVE jobs you select appear publicly. {selected.size} selected.</div>
          {jobs.length === 0 ? <div style={{ fontSize: 13, color: '#94A3B8' }}>No active jobs yet.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {jobs.map((j) => (
                <label key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', border: '1px solid ' + (selected.has(j.id) ? '#DDD6FE' : '#F1F5F9'), background: selected.has(j.id) ? 'rgba(109,40,217,0.04)' : '#fff', borderRadius: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={selected.has(j.id)} onChange={() => toggleJob(j.id)} />
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A' }}>{j.title}</span>
                  <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 'auto' }}>{[j.department, j.location].filter(Boolean).join(' · ')}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={save} disabled={saving} style={{ padding: '10px 18px', borderRadius: 9, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>{saving ? 'Saving…' : 'Save career page'}</button>
          {msg && <span style={{ fontSize: 13, color: msg === 'Saved.' ? '#059669' : '#DC2626' }}>{msg}</span>}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 12 }}><div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 5 }}>{label}</div>{children}</div>
}
