'use client'

import { useState } from 'react'
import { Button } from '@/components/screen/ui'
import { useParams, useRouter } from 'next/navigation'
import {
  Zap, ArrowLeft, Download, Sparkles,
  AlertTriangle, CheckCircle2, TrendingUp, Users,
  Globe, Flag, ChevronRight, UserCheck, Share2,
} from 'lucide-react'
import { useAppStore, PositionReport } from '@/store/appStore'
import toast from 'react-hot-toast'

/* ─── Helpers ───────────────────────────────────────────────────── */
const REC_CFG = {
  strong_yes: { label: 'Strong Yes', short: 'Str Yes', color: 'var(--lv-success)', bg: 'color-mix(in srgb, var(--lv-success) 10%, transparent)', border: 'color-mix(in srgb, var(--lv-success) 22%, transparent)' },
  yes:        { label: 'Yes',        short: 'Yes',     color: 'var(--lv-brand)', bg: 'color-mix(in srgb, var(--lv-brand) 10%, transparent)',  border: 'color-mix(in srgb, var(--lv-brand) 22%, transparent)'  },
  maybe:      { label: 'Maybe',      short: 'Maybe',   color: 'var(--lv-warning)', bg: 'color-mix(in srgb, var(--lv-warning) 10%, transparent)', border: 'color-mix(in srgb, var(--lv-warning) 22%, transparent)' },
  no:         { label: 'No',         short: 'No',      color: 'var(--lv-danger)', bg: 'color-mix(in srgb, var(--lv-danger) 10%, transparent)',  border: 'color-mix(in srgb, var(--lv-danger) 22%, transparent)'  },
} as const

function scoreColor(s: number) {
  if (s >= 85) return 'var(--lv-success)'
  if (s >= 70) return 'var(--lv-brand)'
  if (s >= 55) return 'var(--lv-warning)'
  return 'var(--lv-danger)'
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

/* ─── Mini score bar ─────────────────────────────────────────────── */
function MiniBar({ score, color }: { score: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 56, height: 5, borderRadius: 3, background: 'var(--lv-surface-muted)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, fontFamily: 'var(--lv-font-display)' }}>{score}</span>
    </div>
  )
}

/* ─── Sparkline SVG ─────────────────────────────────────────────── */
function Sparkline({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null
  const w = 80, h = 28
  const min = Math.min(...scores), max = Math.max(...scores)
  const range = Math.max(max - min, 10)
  const pts = scores.map((s, i) => {
    const x = (i / (scores.length - 1)) * w
    const y = h - ((s - min) / range) * h * 0.8 - h * 0.1
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke="var(--lv-accent)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {scores.map((s, i) => {
        const x = (i / (scores.length - 1)) * w
        const y = h - ((s - min) / range) * h * 0.8 - h * 0.1
        return <circle key={i} cx={x} cy={y} r={2.5} fill="var(--lv-accent)" />
      })}
    </svg>
  )
}

/* ─── Section title ─────────────────────────────────────────────── */
function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
      <div style={{ color: 'var(--lv-accent)' }}>{icon}</div>
      <h2 style={{ fontFamily: 'var(--lv-font-display)', fontSize: 13, fontWeight: 600, color: 'var(--lv-text-body)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
        {label}
      </h2>
    </div>
  )
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function PositionRankingPage() {
  const params = useParams()
  const router = useRouter()
  const positionId = params?.positionId as string

  const { positions, candidates, reports, positionReports, addPositionReport, updateCandidate } = useAppStore()

  const position = positions.find(p => p.id === positionId)
  const allCandidates = candidates.filter(c => c.positionId === positionId)
  const completed = allCandidates
    .filter(c => c.status === 'completed' && c.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const noShows = allCandidates.filter(c => c.status === 'no_show').length
  const avgScore = completed.length
    ? Math.round(completed.reduce((s, c) => s + (c.score ?? 0), 0) / completed.length)
    : 0
  const shortlisted = completed.filter(c => c.recommendation === 'strong_yes' || c.recommendation === 'yes').length

  const posReport: PositionReport | undefined = positionReports[positionId]

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(completed.map(c => c.id)))
  }

  function clearAll() { setSelected(new Set()) }

  function pushSelectedToL2() {
    if (selected.size === 0) { toast.error('Select at least one candidate'); return }
    selected.forEach(id => updateCandidate(id, { status: 'scheduled' }))
    toast.success(`${selected.size} candidate(s) pushed to L2 shortlist`)
    setSelected(new Set())
  }

  async function generateSummary() {
    if (!position) return
    setGenerating(true)
    try {
      const payload = {
        position,
        completedCandidates: completed.map(c => {
          const r = c.interviewId ? reports[c.interviewId] : undefined
          return {
            id: c.id,
            name: c.name,
            score: c.score ?? 0,
            recommendation: c.recommendation ?? 'maybe',
            strengthAreas:   r?.strengthAreas   ?? [],
            concernAreas:    r?.concernAreas     ?? [],
            sectionScores:   r?.sectionScores    ?? {},
            professionalSummary: r?.professionalSummary ?? '',
          }
        }),
      }
      const res = await fetch('/api/generate-position-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      addPositionReport(positionId, { ...data, positionId })
      toast.success('Position insights generated')
    } catch {
      toast.error('Could not generate insights — check API key')
    } finally {
      setGenerating(false)
    }
  }

  if (!position) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--lv-surface-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--lv-font-sans)' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 18, color: 'var(--lv-brand)' }}>Position not found</h2>
          <div style={{ marginTop: 16 }}><Button variant="tertiary" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={() => router.push('/dashboard')}>Back</Button></div>
        </div>
      </div>
    )
  }

  const reportDate = posReport ? new Date(posReport.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

  return (
    <div style={{ minHeight: '100vh', background: 'var(--lv-surface-sunken)', fontFamily: 'var(--lv-font-sans)' }}>

      {/* ── Nav bar ── */}
      <header className="no-print" style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'color-mix(in srgb, var(--lv-surface) 95%, transparent)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--lv-border)',
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '0 clamp(12px, 3vw, 32px)', minHeight: 56, flexWrap: 'wrap',
      }}>
        <Button variant="tertiary" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={() => router.push('/dashboard')}>Dashboard</Button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: 'linear-gradient(135deg, var(--lv-brand) 0%, var(--lv-accent) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={14} color="white" fill="white" />
          </div>
          <span style={{ fontFamily: 'var(--lv-font-display)', fontSize: 14, fontWeight: 600, color: 'var(--lv-brand)' }}>Levl1</span>
        </div>

        <div style={{ flex: 1 }} />

        <Button variant="secondary" size="sm" leftIcon={<Download size={14} />} onClick={() => window.print()}>Export</Button>
        <Button variant="secondary" size="sm" leftIcon={<Share2 size={14} />}>Share</Button>
      </header>

      {/* ── Body ── */}
      <main style={{ maxWidth: 1040, margin: '0 auto', padding: '36px 24px 80px' }}>

        {/* ════ HEADER ════ */}
        <section style={{
          background: 'var(--lv-surface)', border: '1px solid var(--lv-border)', borderRadius: 8,
          padding: '28px 36px', marginBottom: 24,
          boxShadow: '0 1px 4px color-mix(in srgb, var(--lv-brand) 6%, transparent)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--lv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Position Report</div>
              <h1 style={{ fontFamily: 'var(--lv-font-display)', fontSize: 22, fontWeight: 600, color: 'var(--lv-text)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                {position.title}
              </h1>
              <p style={{ fontSize: 14, color: 'var(--lv-accent)', fontWeight: 600, margin: '0 0 2px' }}>{position.company} · {position.department}</p>
              {reportDate && <p style={{ fontSize: 12, color: 'var(--lv-text-muted)', margin: 0 }}>Generated: {reportDate}</p>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <Sparkline scores={completed.map(c => c.score ?? 0)} />
              {completed.length > 0 && <span style={{ fontSize: 11, color: 'var(--lv-text-muted)' }}>Score trend (ranked)</span>}
            </div>
          </div>

          {/* Stats strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--lv-border)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--lv-border)' }}>
            {[
              { label: 'Interviewed',  value: completed.length },
              { label: 'Shortlisted',  value: shortlisted },
              { label: 'No Shows',     value: noShows },
              { label: 'Avg Score',    value: `${avgScore}` },
            ].map((s, i) => (
              <div key={s.label} style={{ background: 'var(--lv-surface)', padding: '16px 20px', textAlign: 'center', borderRight: i < 3 ? '1px solid var(--lv-border)' : 'none' }}>
                <div style={{ fontFamily: 'var(--lv-font-display)', fontSize: 22, fontWeight: 600, color: 'var(--lv-brand)', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: 'var(--lv-text-muted)', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ════ CANDIDATE RANKINGS TABLE ════ */}
        <section style={{
          background: 'var(--lv-surface)', border: '1px solid var(--lv-border)', borderRadius: 8,
          padding: '28px 36px', marginBottom: 24,
          boxShadow: '0 1px 4px color-mix(in srgb, var(--lv-brand) 6%, transparent)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <SectionTitle icon={<TrendingUp size={16} />} label="Candidate Rankings" />
            <div style={{ display: 'flex', gap: 8 }} className="no-print">
              <Button variant="tertiary" size="sm" onClick={selectAll}>Select All</Button>
              <Button variant="tertiary" size="sm" onClick={clearAll}>Clear</Button>
            </div>
          </div>

          {completed.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--lv-text-muted)', textAlign: 'center', padding: '32px 0' }}>No completed interviews yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--lv-border)' }}>
                    {['', '#', 'Candidate', 'Score', 'Technical', 'Behavioral', 'Recommendation', 'Actions'].map(h => (
                      <th key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--lv-text-muted)', textAlign: h === 'Score' || h === 'Technical' || h === 'Behavioral' ? 'center' : 'left', padding: '0 12px 12px', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {completed.map((c, idx) => {
                    const rank = idx + 1
                    const rec = c.recommendation ? REC_CFG[c.recommendation] : null
                    const report = c.interviewId ? reports[c.interviewId] : undefined
                    const techScore = report?.sectionScores?.technical?.score
                    const behavScore = report?.sectionScores?.behavioral?.score
                    const sColor = scoreColor(c.score ?? 0)
                    const isSelected = selected.has(c.id)

                    return (
                      <tr
                        key={c.id}
                        style={{
                          borderBottom: '1px solid var(--lv-surface-muted)',
                          background: isSelected ? 'color-mix(in srgb, var(--lv-brand) 4%, transparent)' : idx % 2 === 0 ? 'var(--lv-surface)' : 'var(--lv-surface-sunken)',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'color-mix(in srgb, var(--lv-brand) 3%, transparent)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'color-mix(in srgb, var(--lv-brand) 4%, transparent)' : idx % 2 === 0 ? 'var(--lv-surface)' : 'var(--lv-surface-sunken)' }}
                      >
                        {/* Checkbox */}
                        <td style={{ padding: '14px 12px', width: 36 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(c.id)}
                            style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--lv-brand)' }}
                          />
                        </td>

                        {/* Rank */}
                        <td style={{ padding: '14px 12px', whiteSpace: 'nowrap' }}>
                          <span style={{ fontSize: 12, fontWeight: rank <= 3 ? 600 : 500, color: rank <= 3 ? 'var(--lv-text)' : 'var(--lv-text-muted)', fontVariantNumeric: 'tabular-nums' }}>#{rank}</span>
                        </td>

                        {/* Candidate */}
                        <td style={{ padding: '14px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                              background: 'linear-gradient(135deg, var(--lv-brand) 0%, var(--lv-accent) 100%)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 600, color: '#FFFFFF',
                            }}>
                              {initials(c.name)}
                            </div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--lv-text)' }}>{c.name}</div>
                              <div style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>{c.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Overall score */}
                        <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                          <span style={{
                            fontFamily: 'var(--lv-font-display)', fontSize: 18, fontWeight: 600,
                            color: sColor,
                          }}>
                            {c.score}
                          </span>
                        </td>

                        {/* Technical */}
                        <td style={{ padding: '14px 12px' }}>
                          {techScore != null
                            ? <MiniBar score={techScore} color="var(--lv-brand)" />
                            : <span style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>—</span>}
                        </td>

                        {/* Behavioral */}
                        <td style={{ padding: '14px 12px' }}>
                          {behavScore != null
                            ? <MiniBar score={behavScore} color="var(--lv-success)" />
                            : <span style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>—</span>}
                        </td>

                        {/* Recommendation */}
                        <td style={{ padding: '14px 12px' }}>
                          {rec && (
                            <span style={{
                              fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
                              background: rec.bg, color: rec.color, border: `1px solid ${rec.border}`,
                              whiteSpace: 'nowrap',
                            }}>
                              {rec.short}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '14px 12px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {c.interviewId && report && (
                              <Button variant="secondary" size="sm" rightIcon={<ChevronRight size={14} />} aria-label={`View report for ${c.name}`} onClick={() => router.push(`/report/${c.interviewId}`)}>View</Button>
                            )}
                            {(c.recommendation === 'strong_yes' || c.recommendation === 'yes') && (
                              <Button variant="secondary" size="sm" leftIcon={<UserCheck size={14} />} aria-label={`Push ${c.name} to L2`} style={{ color: 'var(--lv-success)' }}
                                onClick={() => { updateCandidate(c.id, { status: 'scheduled' }); toast.success(`${c.name} pushed to L2`) }}>L2</Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Bulk actions */}
          {selected.size > 0 && (
            <div className="no-print" style={{
              marginTop: 16, padding: '12px 16px',
              background: 'color-mix(in srgb, var(--lv-brand) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--lv-brand) 20%, transparent)',
              borderRadius: 6, display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-brand)' }}>{selected.size} selected</span>
              <Button size="sm" leftIcon={<UserCheck size={14} />} onClick={pushSelectedToL2}>Push Selected to L2</Button>
              <Button variant="secondary" size="sm" leftIcon={<Download size={14} />}>Export Selected Reports</Button>
              <Button variant="tertiary" size="sm" style={{ marginLeft: 'auto' }} onClick={clearAll}>Clear selection</Button>
            </div>
          )}
        </section>

        {/* ════ TALENT POOL INSIGHTS ════ */}
        <section style={{
          background: 'var(--lv-surface)', border: '1px solid var(--lv-border)', borderRadius: 8,
          padding: '28px 36px', marginBottom: 24,
          boxShadow: '0 1px 4px color-mix(in srgb, var(--lv-brand) 6%, transparent)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <SectionTitle icon={<Globe size={16} />} label="Talent Pool Insights" />
            <span className="no-print" style={{ marginBottom: 18 }}><Button size="sm" onClick={generateSummary} disabled={completed.length === 0} loading={generating} leftIcon={<Sparkles size={14} />}>
              {generating ? 'Generating…' : posReport ? 'Regenerate' : 'Generate Insights'}
            </Button></span>
          </div>

          {posReport ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Strengths */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <CheckCircle2 size={14} color="var(--lv-success)" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-success)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Common Strengths</span>
                </div>
                {posReport.poolStrengths.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--lv-success)', marginTop: 7, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--lv-text-body)', lineHeight: 1.6 }}>{s}</span>
                  </div>
                ))}
              </div>
              {/* Gaps */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <AlertTriangle size={14} color="var(--lv-warning)" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-warning)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Common Gaps</span>
                </div>
                {posReport.poolGaps.map((g, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--lv-warning)', marginTop: 7, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--lv-text-body)', lineHeight: 1.6 }}>{g}</span>
                  </div>
                ))}
              </div>

              {/* Market observation */}
              {posReport.marketObservation && (
                <div style={{ gridColumn: '1 / -1', background: 'color-mix(in srgb, var(--lv-brand) 4%, transparent)', border: '1px solid color-mix(in srgb, var(--lv-brand) 12%, transparent)', borderRadius: 6, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Globe size={14} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--lv-accent)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Market Observation</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--lv-text-body)', lineHeight: 1.7, margin: 0 }}>{posReport.marketObservation}</p>
                </div>
              )}

              {/* Hiring recommendation */}
              {posReport.hiringRecommendation && (
                <div style={{ gridColumn: '1 / -1', background: 'color-mix(in srgb, var(--lv-success) 4%, transparent)', border: '1px solid color-mix(in srgb, var(--lv-success) 18%, transparent)', borderRadius: 6, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <CheckCircle2 size={14} color="var(--lv-success)" />
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--lv-success)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Hiring Recommendation</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--lv-text-body)', lineHeight: 1.7, margin: 0 }}>{posReport.hiringRecommendation}</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--lv-text-muted)' }}>
              <Globe size={36} style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 14, color: 'var(--lv-text-muted)', margin: 0 }}>
                {completed.length === 0
                  ? 'No completed interviews yet — insights will appear once interviews are finished.'
                  : 'Click "Generate Insights" to get AI-powered talent pool analysis.'}
              </p>
            </div>
          )}
        </section>

        {/* ════ QUESTION HEALTH FLAGS ════ */}
        {posReport && posReport.questionHealthFlags.length > 0 && (
          <section style={{
            background: 'var(--lv-surface)', border: '1px solid color-mix(in srgb, var(--lv-warning) 25%, transparent)', borderRadius: 8,
            padding: '28px 36px', marginBottom: 24,
            boxShadow: '0 1px 4px color-mix(in srgb, var(--lv-brand) 6%, transparent)',
          }}>
            <SectionTitle icon={<Flag size={16} />} label="Question Health Flags" />
            <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', marginBottom: 16, marginTop: -8 }}>
              {posReport.questionHealthFlags.length} question{posReport.questionHealthFlags.length > 1 ? 's' : ''} had consistently low response quality
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {posReport.questionHealthFlags.map((flag, i) => (
                <div key={i} style={{
                  background: 'color-mix(in srgb, var(--lv-warning) 5%, transparent)', border: '1px solid color-mix(in srgb, var(--lv-warning) 20%, transparent)',
                  borderRadius: 6, padding: '16px 18px',
                }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <AlertTriangle size={14} color="var(--lv-warning)" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--lv-text-body)', margin: '0 0 6px' }}>
                        &ldquo;{flag.questionText}&rdquo;
                      </p>
                      <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', margin: '0 0 8px' }}>{flag.reason}</p>
                      <p style={{ fontSize: 13, color: 'var(--lv-warning)', fontWeight: 600, margin: 0 }}>
                        → {flag.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <span className="no-print" style={{ display: 'inline-block', marginTop: 18 }}><Button variant="secondary" leftIcon={<Flag size={14} />} style={{ color: 'var(--lv-warning)' }}
              onClick={() => toast.success('Flagged questions sent to Tech Lead for review')}>Send to Tech Lead for Review</Button></span>
          </section>
        )}

        {/* ════ USERS NOT YET INTERVIEWED ════ */}
        {allCandidates.filter(c => c.status === 'pending' || c.status === 'invited' || c.status === 'scheduled').length > 0 && (
          <section style={{
            background: 'var(--lv-surface)', border: '1px solid var(--lv-border)', borderRadius: 8,
            padding: '24px 36px', marginBottom: 24,
            boxShadow: '0 1px 4px color-mix(in srgb, var(--lv-brand) 6%, transparent)',
          }}>
            <SectionTitle icon={<Users size={16} />} label="Pending Interviews" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {allCandidates.filter(c => ['pending', 'invited', 'scheduled'].includes(c.status)).map(c => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--lv-surface-sunken)', border: '1px solid var(--lv-border)', borderRadius: 8, padding: '8px 12px',
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 6, background: 'color-mix(in srgb, var(--lv-brand) 10%, transparent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 600, color: 'var(--lv-brand)',
                  }}>
                    {initials(c.name)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text-body)' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--lv-text-muted)', textTransform: 'capitalize' }}>{c.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
    </div>
  )
}
