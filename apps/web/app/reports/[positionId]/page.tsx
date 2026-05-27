'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Zap, ArrowLeft, Download, Sparkles, Loader2,
  AlertTriangle, CheckCircle2, TrendingUp, Users,
  Globe, Flag, ChevronRight, UserCheck, Share2,
} from 'lucide-react'
import { useAppStore, PositionReport } from '@/store/appStore'
import toast from 'react-hot-toast'

/* ─── Helpers ───────────────────────────────────────────────────── */
const REC_CFG = {
  strong_yes: { label: 'Strong Yes', short: 'Str Yes', color: '#059669', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.22)' },
  yes:        { label: 'Yes',        short: 'Yes',     color: '#4F46E5', bg: 'rgba(79,70,229,0.10)',  border: 'rgba(79,70,229,0.22)'  },
  maybe:      { label: 'Maybe',      short: 'Maybe',   color: '#D97706', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.22)' },
  no:         { label: 'No',         short: 'No',      color: '#DC2626', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.22)'  },
} as const

function scoreColor(s: number) {
  if (s >= 85) return '#10B981'
  if (s >= 70) return '#4F46E5'
  if (s >= 55) return '#F59E0B'
  return '#EF4444'
}

function rankEmoji(rank: number) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return null
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

/* ─── Mini score bar ─────────────────────────────────────────────── */
function MiniBar({ score, color }: { score: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 56, height: 5, borderRadius: 3, background: '#F1F5F9', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'var(--font-display)' }}>{score}</span>
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
      <polyline points={pts} fill="none" stroke="#7C3AED" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {scores.map((s, i) => {
        const x = (i / (scores.length - 1)) * w
        const y = h - ((s - min) / range) * h * 0.8 - h * 0.1
        return <circle key={i} cx={x} cy={y} r={2.5} fill="#7C3AED" />
      })}
    </svg>
  )
}

/* ─── Section title ─────────────────────────────────────────────── */
function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
      <div style={{ color: '#7C3AED' }}>{icon}</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0 }}>
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
      <div style={{ minHeight: '100vh', background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, color: '#4F46E5' }}>Position not found</h2>
          <button onClick={() => router.push('/dashboard')} style={{ marginTop: 16, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>← Back</button>
        </div>
      </div>
    )
  }

  const reportDate = posReport ? new Date(posReport.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFF', fontFamily: 'var(--font-sans)' }}>

      {/* ── Nav bar ── */}
      <header className="no-print" style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '0 32px', height: 56,
      }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#94A3B8', fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '6px 10px', borderRadius: 7 }}
          onMouseEnter={e => { e.currentTarget.style.color = '#4F46E5'; e.currentTarget.style.background = '#F1F5F9' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'none' }}
        >
          <ArrowLeft size={14} /> Dashboard
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={13} color="white" fill="white" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: '#4F46E5' }}>Levl1</span>
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => window.print()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)', borderRadius: 8, color: '#4F46E5', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '7px 14px' }}
        >
          <Download size={13} /> Export
        </button>
        <button
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid #E2E8F0', borderRadius: 8, color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '7px 14px' }}
        >
          <Share2 size={13} /> Share
        </button>
      </header>

      {/* ── Body ── */}
      <main style={{ maxWidth: 1040, margin: '0 auto', padding: '36px 24px 80px' }}>

        {/* ════ HEADER ════ */}
        <section style={{
          background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16,
          padding: '28px 36px', marginBottom: 24,
          boxShadow: '0 1px 4px rgba(79,70,229,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Position Report</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: '#1E293B', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                {position.title}
              </h1>
              <p style={{ fontSize: 14, color: '#7C3AED', fontWeight: 600, margin: '0 0 2px' }}>{position.company} · {position.department}</p>
              {reportDate && <p style={{ fontSize: 12, color: '#CBD5E1', margin: 0 }}>Generated: {reportDate}</p>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <Sparkline scores={completed.map(c => c.score ?? 0)} />
              {completed.length > 0 && <span style={{ fontSize: 11, color: '#94A3B8' }}>Score trend (ranked)</span>}
            </div>
          </div>

          {/* Stats strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: '#E2E8F0', borderRadius: 12, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
            {[
              { label: 'Interviewed',  value: completed.length },
              { label: 'Shortlisted',  value: shortlisted },
              { label: 'No Shows',     value: noShows },
              { label: 'Avg Score',    value: `${avgScore}` },
            ].map((s, i) => (
              <div key={s.label} style={{ background: '#fff', padding: '16px 20px', textAlign: 'center', borderRight: i < 3 ? '1px solid #E2E8F0' : 'none' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: '#4F46E5', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ════ CANDIDATE RANKINGS TABLE ════ */}
        <section style={{
          background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16,
          padding: '28px 36px', marginBottom: 24,
          boxShadow: '0 1px 4px rgba(79,70,229,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <SectionTitle icon={<TrendingUp size={15} />} label="Candidate Rankings" />
            <div style={{ display: 'flex', gap: 8 }} className="no-print">
              <button onClick={selectAll} style={{ fontSize: 12, color: '#7C3AED', background: 'none', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>Select All</button>
              <button onClick={clearAll} style={{ fontSize: 12, color: '#94A3B8', background: 'none', border: '1px solid #E2E8F0', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>Clear</button>
            </div>
          </div>

          {completed.length === 0 ? (
            <p style={{ fontSize: 14, color: '#94A3B8', textAlign: 'center', padding: '32px 0' }}>No completed interviews yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                    {['', '#', 'Candidate', 'Score', 'Technical', 'Behavioral', 'Recommendation', 'Actions'].map(h => (
                      <th key={h} style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textAlign: h === 'Score' || h === 'Technical' || h === 'Behavioral' ? 'center' : 'left', padding: '0 12px 12px', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {completed.map((c, idx) => {
                    const rank = idx + 1
                    const medal = rankEmoji(rank)
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
                          borderBottom: '1px solid #F1F5F9',
                          background: isSelected ? 'rgba(79,70,229,0.04)' : idx % 2 === 0 ? '#fff' : '#FAFAFA',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(79,70,229,0.03)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(79,70,229,0.04)' : idx % 2 === 0 ? '#fff' : '#FAFAFA' }}
                      >
                        {/* Checkbox */}
                        <td style={{ padding: '14px 12px', width: 36 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(c.id)}
                            style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#4F46E5' }}
                          />
                        </td>

                        {/* Rank */}
                        <td style={{ padding: '14px 12px', whiteSpace: 'nowrap' }}>
                          {medal
                            ? <span style={{ fontSize: 18 }}>{medal}</span>
                            : <span style={{ fontSize: 12, fontWeight: 700, color: '#CBD5E1', fontFamily: 'var(--font-display)' }}>#{rank}</span>
                          }
                        </td>

                        {/* Candidate */}
                        <td style={{ padding: '14px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 800, color: '#fff',
                            }}>
                              {initials(c.name)}
                            </div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B' }}>{c.name}</div>
                              <div style={{ fontSize: 12, color: '#94A3B8' }}>{c.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Overall score */}
                        <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                          <span style={{
                            fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800,
                            color: sColor,
                          }}>
                            {c.score}
                          </span>
                        </td>

                        {/* Technical */}
                        <td style={{ padding: '14px 12px' }}>
                          {techScore != null
                            ? <MiniBar score={techScore} color="#4F46E5" />
                            : <span style={{ fontSize: 12, color: '#CBD5E1' }}>—</span>}
                        </td>

                        {/* Behavioral */}
                        <td style={{ padding: '14px 12px' }}>
                          {behavScore != null
                            ? <MiniBar score={behavScore} color="#10B981" />
                            : <span style={{ fontSize: 12, color: '#CBD5E1' }}>—</span>}
                        </td>

                        {/* Recommendation */}
                        <td style={{ padding: '14px 12px' }}>
                          {rec && (
                            <span style={{
                              fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
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
                              <button
                                onClick={() => router.push(`/report/${c.interviewId}`)}
                                style={{
                                  fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 7,
                                  background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.2)',
                                  color: '#4F46E5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                View <ChevronRight size={11} />
                              </button>
                            )}
                            {(c.recommendation === 'strong_yes' || c.recommendation === 'yes') && (
                              <button
                                onClick={() => { updateCandidate(c.id, { status: 'scheduled' }); toast.success(`${c.name} pushed to L2`) }}
                                style={{
                                  fontSize: 12, fontWeight: 600, padding: '5px 10px', borderRadius: 7,
                                  background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.22)',
                                  color: '#059669', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <UserCheck size={11} /> L2
                              </button>
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
              background: 'rgba(79,70,229,0.06)', border: '1px solid rgba(79,70,229,0.2)',
              borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#4F46E5' }}>{selected.size} selected</span>
              <button
                onClick={pushSelectedToL2}
                style={{
                  fontSize: 13, fontWeight: 700, padding: '8px 16px', borderRadius: 8,
                  background: '#4F46E5', color: '#fff', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <UserCheck size={13} /> Push Selected to L2
              </button>
              <button
                style={{ fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 8, background: '#fff', border: '1px solid #E2E8F0', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={13} /> Export Selected Reports
              </button>
              <button onClick={clearAll} style={{ marginLeft: 'auto', fontSize: 12, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}>Clear selection</button>
            </div>
          )}
        </section>

        {/* ════ TALENT POOL INSIGHTS ════ */}
        <section style={{
          background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16,
          padding: '28px 36px', marginBottom: 24,
          boxShadow: '0 1px 4px rgba(79,70,229,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <SectionTitle icon={<Globe size={15} />} label="Talent Pool Insights" />
            <button
              onClick={generateSummary}
              disabled={generating || completed.length === 0}
              className="no-print"
              style={{
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700,
                padding: '8px 16px', borderRadius: 9,
                background: generating ? '#E2E8F0' : 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                color: generating ? '#94A3B8' : '#fff', border: 'none', cursor: generating ? 'not-allowed' : 'pointer',
                boxShadow: generating ? 'none' : '0 4px 14px rgba(124,58,237,0.3)',
                marginBottom: 18,
              }}
            >
              {generating
                ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
                : <><Sparkles size={13} /> {posReport ? 'Regenerate' : 'Generate Insights'}</>
              }
            </button>
          </div>

          {posReport ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Strengths */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <CheckCircle2 size={13} color="#10B981" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Common Strengths</span>
                </div>
                {posReport.poolStrengths.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', marginTop: 7, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{s}</span>
                  </div>
                ))}
              </div>
              {/* Gaps */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <AlertTriangle size={13} color="#F59E0B" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Common Gaps</span>
                </div>
                {posReport.poolGaps.map((g, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#F59E0B', marginTop: 7, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{g}</span>
                  </div>
                ))}
              </div>

              {/* Market observation */}
              {posReport.marketObservation && (
                <div style={{ gridColumn: '1 / -1', background: 'rgba(79,70,229,0.04)', border: '1px solid rgba(79,70,229,0.12)', borderRadius: 10, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Globe size={13} color="#7C3AED" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Market Observation</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, margin: 0 }}>{posReport.marketObservation}</p>
                </div>
              )}

              {/* Hiring recommendation */}
              {posReport.hiringRecommendation && (
                <div style={{ gridColumn: '1 / -1', background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 10, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <CheckCircle2 size={13} color="#10B981" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Hiring Recommendation</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.7, margin: 0 }}>{posReport.hiringRecommendation}</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#CBD5E1' }}>
              <Globe size={36} style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 14, color: '#94A3B8', margin: 0 }}>
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
            background: '#fff', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 16,
            padding: '28px 36px', marginBottom: 24,
            boxShadow: '0 1px 4px rgba(79,70,229,0.06)',
          }}>
            <SectionTitle icon={<Flag size={15} />} label="Question Health Flags" />
            <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 16, marginTop: -8 }}>
              {posReport.questionHealthFlags.length} question{posReport.questionHealthFlags.length > 1 ? 's' : ''} had consistently low response quality
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {posReport.questionHealthFlags.map((flag, i) => (
                <div key={i} style={{
                  background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: 10, padding: '16px 18px',
                }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <AlertTriangle size={14} color="#F59E0B" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#334155', margin: '0 0 6px' }}>
                        &ldquo;{flag.questionText}&rdquo;
                      </p>
                      <p style={{ fontSize: 13, color: '#94A3B8', margin: '0 0 8px' }}>{flag.reason}</p>
                      <p style={{ fontSize: 13, color: '#D97706', fontWeight: 600, margin: 0 }}>
                        → {flag.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="no-print"
              style={{
                marginTop: 18, display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: 9, color: '#D97706', fontSize: 13, fontWeight: 700,
                padding: '9px 16px', cursor: 'pointer',
              }}
              onClick={() => toast.success('Flagged questions sent to Tech Lead for review')}
            >
              <Flag size={13} /> Send to Tech Lead for Review
            </button>
          </section>
        )}

        {/* ════ USERS NOT YET INTERVIEWED ════ */}
        {allCandidates.filter(c => c.status === 'pending' || c.status === 'invited' || c.status === 'scheduled').length > 0 && (
          <section style={{
            background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16,
            padding: '24px 36px', marginBottom: 24,
            boxShadow: '0 1px 4px rgba(79,70,229,0.06)',
          }}>
            <SectionTitle icon={<Users size={15} />} label="Pending Interviews" />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {allCandidates.filter(c => ['pending', 'invited', 'scheduled'].includes(c.status)).map(c => (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: '#FAFAFA', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px',
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 6, background: 'rgba(79,70,229,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800, color: '#4F46E5',
                  }}>
                    {initials(c.name)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', textTransform: 'capitalize' }}>{c.status}</div>
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
