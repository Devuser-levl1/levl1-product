'use client'
import { useEffect, useState, useCallback } from 'react'

interface Profile { currentTitle: string | null; currentEmployer: string | null; yearsExperience: number | null; location: string | null; skills: string[]; education: string[]; certifications: string[] }
interface Company { name: string; industry: string | null; sizeBand: string | null; location: string | null }
interface Pinned { name: string; stars: number; language: string | null; url: string; description: string | null }
interface Github { handle: string; profileUrl: string; publicRepos: number; followers: number; topLanguages: string[]; totalStars: number; lastActiveAt: string | null; pinned: Pinned[] }
interface Links { linkedin?: string; website?: string; portfolio?: string; twitter?: string; github?: string; behance?: string; dribbble?: string; other?: string[] }
interface Enrichment { roleFamily: string | null; profile: Profile | null; company: Company | null; github: Github | null; links: Links | null; summary: string | null; status: string; sources: string[]; enrichedAt: string | null }

const purple = '#6D28D9'
const chip: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#4F46E5', background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.18)', borderRadius: 100, padding: '3px 9px' }
const muted: React.CSSProperties = { fontSize: 12, color: '#94A3B8' }

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 12 }}><div style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{title}</div>{children}</div>
}

export function EnrichmentPanel({ candidateId }: { candidateId: string }) {
  const [e, setE] = useState<Enrichment | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [running, setRunning] = useState(false)

  const load = useCallback(() => {
    fetch(`/api/hire/candidates/${candidateId}/enrich`).then((r) => (r.ok ? r.json() : null)).then((d) => { setE(d?.enrichment ?? null); setLoaded(true) }).catch(() => setLoaded(true))
  }, [candidateId])
  useEffect(() => { load() }, [load])

  async function run() {
    setRunning(true)
    try {
      const res = await fetch(`/api/hire/candidates/${candidateId}/enrich`, { method: 'POST' })
      const d = await res.json()
      if (res.ok) setE(d.enrichment)
    } finally { setRunning(false) }
  }

  const isEng = e?.roleFamily === 'engineering'

  // Ordered blocks — emphasis by role family (engineering leads with GitHub +
  // skills; everyone else leads with company context + certifications).
  const ProfileBlock = e?.profile && (
    <Block title="Profile">
      <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
        {[e.profile.currentTitle, e.profile.currentEmployer].filter(Boolean).join(' · ') || <span style={muted}>Title not found</span>}
        {(e.profile.yearsExperience != null || e.profile.location) && <div style={muted}>{[e.profile.yearsExperience != null ? `${e.profile.yearsExperience} yrs exp` : null, e.profile.location].filter(Boolean).join(' · ')}</div>}
      </div>
      {e.profile.skills.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>{e.profile.skills.slice(0, 18).map((s) => <span key={s} style={chip}>{s}</span>)}</div>}
      {e.profile.education.length > 0 && <div style={{ fontSize: 12, color: '#475569', marginTop: 8 }}><strong>Education:</strong> {e.profile.education.join('; ')}</div>}
      {e.profile.certifications.length > 0 && <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}><strong>Certifications:</strong> {e.profile.certifications.join('; ')}</div>}
    </Block>
  )

  const CompanyBlock = e?.company && (
    <Block title="Employer context">
      <div style={{ fontSize: 13, color: '#334155' }}>{e.company.name}</div>
      {(e.company.industry || e.company.sizeBand || e.company.location) ? (
        <div style={muted}>{[e.company.industry, e.company.sizeBand && `${e.company.sizeBand} employees`, e.company.location].filter(Boolean).join(' · ')}</div>
      ) : <div style={muted}>No public company data found.</div>}
    </Block>
  )

  const GithubBlock = e?.github && (
    <Block title="GitHub">
      <div style={{ display: 'flex', gap: 12, fontSize: 12.5, color: '#334155', flexWrap: 'wrap' }}>
        <a href={e.github.profileUrl} target="_blank" rel="noreferrer" style={{ color: purple, fontWeight: 700 }}>@{e.github.handle}</a>
        <span>{e.github.publicRepos} repos</span><span>★ {e.github.totalStars}</span><span>{e.github.followers} followers</span>
        {e.github.lastActiveAt && <span style={muted}>active {new Date(e.github.lastActiveAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>}
      </div>
      {e.github.topLanguages.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>{e.github.topLanguages.map((l) => <span key={l} style={chip}>{l}</span>)}</div>}
      {e.github.pinned.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {e.github.pinned.map((p) => <a key={p.url} href={p.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#475569', textDecoration: 'none' }}>▸ {p.name} {p.stars > 0 ? `· ★${p.stars}` : ''}{p.language ? ` · ${p.language}` : ''}</a>)}
        </div>
      )}
    </Block>
  )

  const LinksBlock = e?.links && Object.keys(e.links).length > 0 && (
    <Block title="Links">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {(['linkedin', 'github', 'website', 'portfolio', 'twitter', 'behance', 'dribbble'] as const).map((k) => e!.links![k] ? <a key={k} href={e!.links![k]} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: purple, textDecoration: 'none', textTransform: 'capitalize' }}>{k}: {e!.links![k]}</a> : null)}
        {e.links.other?.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: purple, textDecoration: 'none' }}>{u}</a>)}
      </div>
    </Block>
  )

  const SummaryBlock = e?.summary && (
    <Block title="Summary">
      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#B45309', background: 'rgba(245,158,11,0.12)', borderRadius: 6, padding: '2px 8px', display: 'inline-block', marginBottom: 6 }}>AI-generated — verify before relying</div>
      <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, margin: 0 }}>{e.summary}</p>
    </Block>
  )

  const ordered = isEng
    ? [GithubBlock, ProfileBlock, LinksBlock, CompanyBlock, SummaryBlock]
    : [ProfileBlock, CompanyBlock, LinksBlock, GithubBlock, SummaryBlock]

  return (
    <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Enrichment{e?.roleFamily ? ` · ${e.roleFamily}` : ''}</div>
        <button onClick={run} disabled={running} style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: '#fff', background: purple, border: 'none', borderRadius: 8, padding: '6px 12px', cursor: running ? 'default' : 'pointer' }}>
          {running ? 'Enriching…' : e ? 'Re-enrich' : 'Enrich'}
        </button>
      </div>

      {!loaded ? <div style={muted}>Loading…</div>
        : !e ? <div style={muted}>Not enriched yet. Pull public profile signals — works for every role.</div>
        : (
          <div>
            {e.status === 'partial' && <div style={{ fontSize: 11.5, color: '#B45309', marginBottom: 8 }}>Partial — one or more sources were slow or unavailable.</div>}
            {ordered.filter(Boolean)}
            {!e.profile && !e.company && !e.github && !e.summary && (e.links == null || Object.keys(e.links).length === 0) && (
              <div style={muted}>No public signals found for this candidate.</div>
            )}
            {e.sources.length > 0 && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 10, paddingTop: 8, borderTop: '1px dashed #E2E8F0' }}>Data from: {e.sources.join(', ')}</div>}
          </div>
        )}
    </div>
  )
}
