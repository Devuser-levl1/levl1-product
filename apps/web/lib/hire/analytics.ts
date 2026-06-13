// Pure analytics helpers — all input is already tenant-scoped by the caller.

export interface AnaCandidate { id: string; currentStage: string; aiScore: number | null; interviewScore: number | null; source: string | null; createdAt: Date; jobId: string | null }
export interface AnaActivity { id: string; type: string; fromStage: string | null; toStage: string | null; userId: string | null; createdAt: Date; candidateId: string }
export interface AnaDeal { id: string; value: number; stage: string; closedAt: Date | null; createdAt: Date }
export interface AnaHire { id: string; createdAt: Date; updatedAt: Date }

export function avg(nums: (number | null | undefined)[]): number | null {
  const valid = nums.filter((n): n is number => typeof n === 'number')
  return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null
}

function canonicalStage(stage: string): 'Sourced' | 'Screening' | 'Interview' | 'Offer' | 'Hired' | 'Other' {
  const s = (stage || '').toLowerCase()
  if (s.includes('sourc')) return 'Sourced'
  if (s.includes('screen')) return 'Screening'
  if (s.includes('interview') || s.includes('technical') || s.includes('round')) return 'Interview'
  if (s.includes('offer') || s.includes('verbal')) return 'Offer'
  if (s.includes('hire')) return 'Hired'
  return 'Other'
}

export function computeFunnel(candidates: AnaCandidate[]) {
  const buckets: Record<string, number> = { Sourced: 0, Screening: 0, Interview: 0, Offer: 0, Hired: 0, Other: 0 }
  candidates.forEach((c) => { buckets[canonicalStage(c.currentStage)]++ })
  const order = ['Sourced', 'Screening', 'Interview', 'Offer', 'Hired']
  return order.map((name, i) => ({
    name,
    count: buckets[name],
    conversionFromPrev: i > 0 && buckets[order[i - 1]] > 0 ? Math.round((buckets[name] / buckets[order[i - 1]]) * 100) : null,
  }))
}

export function computeSourceEffectiveness(candidates: AnaCandidate[]) {
  const bySource: Record<string, { source: string; total: number; scores: number[]; advanced: number }> = {}
  candidates.forEach((c) => {
    const src = c.source || 'Unknown'
    bySource[src] ??= { source: src, total: 0, scores: [], advanced: 0 }
    bySource[src].total++
    if (typeof c.aiScore === 'number') bySource[src].scores.push(c.aiScore)
    const s = (c.currentStage || '').toLowerCase()
    if (s.includes('interview') || s.includes('offer') || s.includes('hire') || s.includes('round')) bySource[src].advanced++
  })
  return Object.values(bySource).map((x) => ({
    source: x.source,
    total: x.total,
    avgScore: x.scores.length ? Math.round(x.scores.reduce((a, b) => a + b, 0) / x.scores.length) : null,
    advanceRate: x.total ? Math.round((x.advanced / x.total) * 100) : 0,
  })).sort((a, b) => b.total - a.total)
}

export function computeTimeInStage(activities: AnaActivity[]) {
  const moves = activities.filter((a) => a.type === 'stage_change').sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
  const byStage: Record<string, number[]> = {}
  const lastSeen: Record<string, number> = {}
  moves.forEach((m) => {
    if (m.fromStage && lastSeen[m.candidateId + '|' + m.fromStage]) {
      const days = (+new Date(m.createdAt) - lastSeen[m.candidateId + '|' + m.fromStage]) / 86400000
      byStage[m.fromStage] ??= []
      byStage[m.fromStage].push(days)
    }
    if (m.toStage) lastSeen[m.candidateId + '|' + m.toStage] = +new Date(m.createdAt)
  })
  return Object.entries(byStage).map(([stage, arr]) => ({
    stage,
    avgDays: arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0,
  }))
}

export function computeScoreBuckets(candidates: AnaCandidate[]) {
  const buckets: Record<string, number> = { '80-100': 0, '60-79': 0, '40-59': 0, '0-39': 0, Unscored: 0 }
  candidates.forEach((c) => {
    if (c.aiScore == null) buckets.Unscored++
    else if (c.aiScore >= 80) buckets['80-100']++
    else if (c.aiScore >= 60) buckets['60-79']++
    else if (c.aiScore >= 40) buckets['40-59']++
    else buckets['0-39']++
  })
  return Object.entries(buckets).map(([range, count]) => ({ range, count }))
}

export interface RecruiterRow { userId: string; stageMoves: number; notes: number; interviews: number; total: number }
export function computeRecruiterActivity(activities: AnaActivity[]): RecruiterRow[] {
  const byUser: Record<string, RecruiterRow> = {}
  activities.forEach((a) => {
    if (!a.userId) return
    byUser[a.userId] ??= { userId: a.userId, stageMoves: 0, notes: 0, interviews: 0, total: 0 }
    byUser[a.userId].total++
    if (a.type === 'stage_change') byUser[a.userId].stageMoves++
    if (a.type === 'note') byUser[a.userId].notes++
    if (a.type === 'interview_scheduled') byUser[a.userId].interviews++
  })
  return Object.values(byUser).sort((a, b) => b.total - a.total)
}

function getWeek(d: Date) {
  const onejan = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((+d - +onejan) / 86400000 + onejan.getDay() + 1) / 7)
}
export function computeWeeklyTrend(candidates: AnaCandidate[]) {
  const weeks: Record<string, number> = {}
  candidates.forEach((c) => {
    const d = new Date(c.createdAt)
    const key = `${d.getFullYear()}-W${String(getWeek(d)).padStart(2, '0')}`
    weeks[key] = (weeks[key] || 0) + 1
  })
  return Object.entries(weeks).map(([week, count]) => ({ week, count })).sort((a, b) => a.week.localeCompare(b.week))
}

export function computeDealMetrics(deals: AnaDeal[]) {
  const open = deals.filter((d) => !['Closed Won', 'Closed Lost'].includes(d.stage))
  const won = deals.filter((d) => d.stage === 'Closed Won')
  return {
    openValue: open.reduce((s, d) => s + (d.value || 0), 0),
    openCount: open.length,
    wonValue: won.reduce((s, d) => s + (d.value || 0), 0),
    wonCount: won.length,
    winRate: deals.length ? Math.round((won.length / deals.length) * 100) : 0,
  }
}

export function computeAvgTimeToHire(hires: AnaHire[]): number | null {
  if (!hires.length) return null
  const days = hires.map((h) => (+new Date(h.updatedAt) - +new Date(h.createdAt)) / 86400000)
  return Math.round(days.reduce((a, b) => a + b, 0) / days.length)
}
