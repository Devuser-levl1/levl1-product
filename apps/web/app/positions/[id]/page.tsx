'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, CheckCircle2, Clock, Edit3, Users, FileText,
  BarChart3, Plus, Mail, Download, Loader2, AlertCircle,
  Tag, Zap, Target, Shield, Send,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Types ───────────────────────────────────────────────────────────────────
interface QuestionItem {
  id: string
  question: string
  expectedKeyPoints?: string[]
  followUp?: string
  difficulty?: string
  techTag?: string
  estimatedMinutes?: number
  approvedByTech?: boolean
  approvedByHR?: boolean
}

interface QuestionSet {
  technicalQuestions: QuestionItem[]
  scenarioQuestions: QuestionItem[]
  behavioralQuestions: QuestionItem[]
  eqQuestions: QuestionItem[]
  whiteboardQuestions: QuestionItem[]
}

interface Candidate {
  id: string
  name: string
  email: string
  status: string
  score?: number
  recommendation?: string
  uploadedAt: string
  currentTitle?: string
  currentCompany?: string
  topSkills?: string[]
}


interface Position {
  id: string
  title: string
  company: string
  department?: string
  roleType: string
  experienceLevel: string
  primaryDomain?: string
  techStack: string[]
  goodToHave: string[]
  jdText?: string
  status: string
  techLeadApproved: boolean
  hrApproved: boolean
  techLeadEmail?: string
  hrEmail?: string
  clientManagerEmail?: string
  interviewDuration: number
  dynamicIntensity?: string
  l2ScoreThreshold?: number
  rubricApproved?: boolean
  scoringRubric?: { technical?: number; problemSolving?: number; behavioral?: number; eq?: number }
  softSkillWeightage?: Record<string, number>
  domainContext?: string
  companyStage?: string
  workMode?: string
  createdAt: string
  questionSet?: QuestionSet
  candidates?: Candidate[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  active:           { label: 'Active',           color: '#059669', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.25)' },
  pending_approval: { label: 'Pending Approval', color: '#D97706', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.25)' },
  draft:            { label: 'Draft',            color: '#64748B', bg: '#F1F5F9',                border: '#E2E8F0'               },
  paused:           { label: 'Paused',           color: '#64748B', bg: '#F1F5F9',                border: '#E2E8F0'               },
  closed:           { label: 'Closed',           color: '#DC2626', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)'  },
}

const REC_CFG: Record<string, { label: string; color: string }> = {
  strong_yes: { label: 'Strong Yes', color: '#059669' },
  yes:        { label: 'Yes',        color: '#4F46E5' },
  maybe:      { label: 'Maybe',      color: '#D97706' },
  no:         { label: 'No',         color: '#DC2626' },
}

const STATUS_PILL: Record<string, { label: string; color: string; bg: string }> = {
  pending:      { label: 'Pending',      color: '#64748B', bg: '#F1F5F9' },
  invited:      { label: 'Invited',      color: '#D97706', bg: 'rgba(245,158,11,0.10)' },
  scheduled:    { label: 'Scheduled',   color: '#4F46E5', bg: 'rgba(79,70,229,0.10)' },
  interviewing: { label: 'Interviewing', color: '#7C3AED', bg: 'rgba(124,58,237,0.10)' },
  completed:    { label: 'Completed',    color: '#059669', bg: 'rgba(16,185,129,0.10)' },
  no_show:      { label: 'No Show',      color: '#DC2626', bg: 'rgba(239,68,68,0.10)' },
  cancelled:    { label: 'Cancelled',    color: '#DC2626', bg: 'rgba(239,68,68,0.10)' },
}

function Tag2({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 11, fontFamily: 'var(--font-mono)',
      padding: '3px 8px', borderRadius: 4,
      background: 'rgba(79,70,229,0.08)', color: '#4F46E5',
      border: '1px solid rgba(79,70,229,0.18)',
      whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

function SoftTag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 11, fontFamily: 'var(--font-mono)',
      padding: '3px 8px', borderRadius: 4,
      background: '#F1F5F9', color: '#64748B',
      border: '1px solid #E2E8F0',
      whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

function ApprovalBadge({ approved, label }: { approved: boolean; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', borderRadius: 8,
      border: `1px solid ${approved ? 'rgba(16,185,129,0.25)' : '#E2E8F0'}`,
      background: approved ? 'rgba(16,185,129,0.06)' : '#F8FAFC',
    }}>
      {approved
        ? <CheckCircle2 size={13} color="#10B981" />
        : <Clock size={13} color="#94A3B8" />}
      <span style={{ fontSize: 12, fontWeight: 600, color: approved ? '#059669' : '#94A3B8' }}>
        {label}: {approved ? 'Approved' : 'Pending'}
      </span>
    </div>
  )
}

function ScoreBar({ score, threshold }: { score: number; threshold?: number }) {
  const color = score >= 85 ? '#10B981' : score >= 70 ? '#4F46E5' : score >= 55 ? '#F59E0B' : '#EF4444'
  const belowThreshold = threshold && score < threshold
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: '#F1F5F9', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'var(--font-mono)', minWidth: 28 }}>{score}</span>
      {belowThreshold && (
        <span style={{ fontSize: 10, color: '#F59E0B', fontWeight: 600 }}>↓ L2</span>
      )}
    </div>
  )
}

type TabKey = 'overview' | 'questions' | 'candidates' | 'reports'

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PositionDetailPage() {
  const params  = useParams()
  const router  = useRouter()
  const id      = params.id as string

  const [position, setPosition]     = useState<Position | null>(null)
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState<TabKey>('overview')
  const [reportsLoading, setReportsLoading] = useState(false)

  // Fetch position
  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/positions/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setPosition(data)
        else toast.error('Position not found')
      })
      .catch(() => toast.error('Failed to load position'))
      .finally(() => setLoading(false))
  }, [id])

  // Fetch reports when tab opened
  useEffect(() => {
    if (tab !== 'reports' || !id) return
    setReportsLoading(true)
    fetch(`/api/reports/position/${id}`)
      .then(r => r.ok ? r.json() : [])
      .catch(() => {})
      .finally(() => setReportsLoading(false))
  }, [tab, id])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={32} color="#7C3AED" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#94A3B8', fontSize: 14 }}>Loading position…</p>
        </div>
      </div>
    )
  }

  if (!position) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <div style={{ textAlign: 'center' }}>
          <AlertCircle size={32} color="#EF4444" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: '#4F46E5', fontSize: 16, fontWeight: 700 }}>Position not found</p>
          <button onClick={() => router.push('/dashboard')} style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#4F46E5', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-sans)' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const statusCfg = STATUS_CFG[position.status] ?? STATUS_CFG.draft
  const rubric = position.scoringRubric ?? { technical: 40, problemSolving: 30, behavioral: 20, eq: 10 }
  const threshold = position.l2ScoreThreshold ?? 75

  const qs = position.questionSet
  const allQuestions = qs ? [
    ...qs.technicalQuestions.map(q => ({ ...q, _type: 'Technical' })),
    ...qs.scenarioQuestions.map(q => ({ ...q, _type: 'Scenario' })),
    ...qs.behavioralQuestions.map(q => ({ ...q, _type: 'Behavioral' })),
    ...qs.eqQuestions.map(q => ({ ...q, _type: 'EQ' })),
    ...qs.whiteboardQuestions.map(q => ({ ...q, _type: 'Whiteboard' })),
  ] : []

  const candidates = position.candidates ?? []
  const completedCount = candidates.filter(c => c.status === 'completed').length

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'var(--font-sans)' }}>

      {/* ── Header bar ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 40, boxShadow: '0 1px 3px rgba(79,70,229,0.04)' }}>
        <button
          onClick={() => router.back()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#475569', cursor: 'pointer', fontSize: 13, fontWeight: 500, flexShrink: 0 }}
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, color: '#4F46E5', margin: 0, lineHeight: 1.2 }}>
              {position.title}
            </h1>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100,
              color: statusCfg.color, background: statusCfg.bg, border: `1px solid ${statusCfg.border}`,
            }}>
              {statusCfg.label}
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: 0, marginTop: 2 }}>
            {position.company}{position.department ? ` · ${position.department}` : ''} · {position.experienceLevel}
          </p>
        </div>

        <button
          onClick={() => toast('Edit coming soon')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#475569', cursor: 'pointer', fontSize: 13, fontWeight: 500, flexShrink: 0 }}
        >
          <Edit3 size={13} /> Edit
        </button>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '0 32px' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {([
            { key: 'overview',   label: 'Overview',   icon: FileText },
            { key: 'questions',  label: 'Questions',  icon: Tag, badge: allQuestions.length || undefined },
            { key: 'candidates', label: 'Candidates', icon: Users, badge: candidates.length || undefined },
            { key: 'reports',    label: 'Reports',    icon: BarChart3, badge: completedCount || undefined },
          ] as Array<{ key: TabKey; label: string; icon: React.ElementType; badge?: number }>).map(({ key, label, icon: Icon, badge }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '14px 20px', fontSize: 13, fontWeight: tab === key ? 700 : 500,
                color: tab === key ? '#4F46E5' : '#64748B',
                border: 'none', borderBottom: tab === key ? '2px solid #4F46E5' : '2px solid transparent',
                background: 'transparent', cursor: 'pointer', transition: 'all 0.12s',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <Icon size={13} />
              {label}
              {badge !== undefined && (
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', background: tab === key ? 'rgba(79,70,229,0.10)' : '#F1F5F9', color: tab === key ? '#4F46E5' : '#94A3B8', padding: '1px 6px', borderRadius: 100, fontWeight: 700 }}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 1024, margin: '0 auto', padding: '32px 32px' }}>

        {/* ─── OVERVIEW TAB ─── */}
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Approvals */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <ApprovalBadge approved={position.techLeadApproved} label="Tech Lead" />
              <ApprovalBadge approved={position.hrApproved} label="HR" />
              {position.clientManagerEmail && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                  <Mail size={13} color="#94A3B8" />
                  <span style={{ fontSize: 12, color: '#64748B' }}>Client: {position.clientManagerEmail}</span>
                </div>
              )}
            </div>

            {/* JD */}
            {position.jdText && (
              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Job Description</h3>
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  <pre style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans)', margin: 0 }}>
                    {position.jdText}
                  </pre>
                </div>
              </div>
            )}

            {/* Skills */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Required Tech Stack</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {position.techStack.length > 0
                    ? position.techStack.map(t => <Tag2 key={t}>{t}</Tag2>)
                    : <span style={{ fontSize: 12, color: '#94A3B8' }}>None specified</span>}
                </div>
              </div>
              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Good to Have</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {position.goodToHave.length > 0
                    ? position.goodToHave.map(t => <SoftTag key={t}>{t}</SoftTag>)
                    : <span style={{ fontSize: 12, color: '#94A3B8' }}>None specified</span>}
                </div>
              </div>
            </div>

            {/* Interview settings */}
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Interview Settings</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
                {[
                  { label: 'Duration',      value: `${position.interviewDuration} min`,             icon: Clock },
                  { label: 'Dynamic Mode',  value: position.dynamicIntensity ?? 'standard',          icon: Zap },
                  { label: 'Role Type',     value: position.roleType,                                icon: Shield },
                  { label: 'Work Mode',     value: position.workMode ?? '—',                         icon: Users },
                  { label: 'Domain',        value: position.primaryDomain ?? '—',                    icon: Target },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                      <Icon size={11} color="#94A3B8" />
                      <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#4F46E5' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* L2 Threshold + Scoring Rubric */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>L2 Score Threshold</h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: '#4F46E5', fontFamily: 'var(--font-display)' }}>{threshold}</span>
                  <span style={{ fontSize: 14, color: '#94A3B8' }}>/100</span>
                </div>
                <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>
                  Candidates below this score are marked &ldquo;Below L2 threshold&rdquo; regardless of recommendation.
                </p>
              </div>

              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Scoring Rubric</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Technical Depth',    value: rubric.technical ?? 40,       color: '#4F46E5' },
                    { label: 'Problem Solving',    value: rubric.problemSolving ?? 30,  color: '#7C3AED' },
                    { label: 'Behavioral / STAR',  value: rubric.behavioral ?? 20,     color: '#10B981' },
                    { label: 'EQ & Soft Skills',   value: rubric.eq ?? 10,             color: '#F59E0B' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, color: '#64748B', minWidth: 130 }}>{label}</span>
                      <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#F1F5F9', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'var(--font-mono)', minWidth: 32 }}>{value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── QUESTIONS TAB ─── */}
        {tab === 'questions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Approval status banner */}
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Approval Status</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {position.techLeadEmail && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {position.techLeadApproved
                      ? <CheckCircle2 size={14} color="#10B981" />
                      : <Clock size={14} color="#F59E0B" />}
                    <span style={{ fontSize: 13, color: '#475569' }}>
                      Tech Lead ({position.techLeadEmail}):
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: position.techLeadApproved ? '#059669' : '#D97706' }}>
                      {position.techLeadApproved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                )}
                {position.hrEmail && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {position.hrApproved
                      ? <CheckCircle2 size={14} color="#10B981" />
                      : <Clock size={14} color="#F59E0B" />}
                    <span style={{ fontSize: 13, color: '#475569' }}>
                      HR ({position.hrEmail}):
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: position.hrApproved ? '#059669' : '#D97706' }}>
                      {position.hrApproved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                )}
                {!position.techLeadEmail && !position.hrEmail && (
                  <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>No approvers configured — edit the position to add Tech Lead and HR emails.</p>
                )}
              </div>
              {(position.techLeadEmail || position.hrEmail) && (
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/positions/${id}/send-approvals`, { method: 'POST' })
                      const d = await res.json()
                      if (!res.ok) throw new Error(d.error)
                      toast.success(d.emailsConfigured ? 'Approval emails sent!' : 'Approval tokens created (add RESEND_API_KEY to send emails)')
                    } catch (err: unknown) {
                      toast.error(err instanceof Error ? err.message : 'Failed to send approvals')
                    }
                  }}
                  style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(79,70,229,0.25)', background: 'rgba(79,70,229,0.04)', color: '#4F46E5', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)' }}
                >
                  <Mail size={12} /> {(position.techLeadApproved && position.hrApproved) ? 'Resend Reminder' : 'Send for Approval'}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 14, color: '#64748B' }}>{allQuestions.length} questions in bank</p>
            </div>

            {allQuestions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#94A3B8' }}>
                <FileText size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p style={{ fontSize: 14 }}>No questions generated yet</p>
              </div>
            ) : (
              (['Technical', 'Scenario', 'Behavioral', 'EQ', 'Whiteboard'] as const).map(type => {
                const qs = allQuestions.filter((q) => (q as { _type: string })._type === type)
                if (qs.length === 0) return null
                const approvedCount = qs.filter(q => q.approvedByTech || q.approvedByHR).length
                return (
                  <div key={type} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{type}</span>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#94A3B8', background: '#F1F5F9', padding: '1px 6px', borderRadius: 100 }}>{qs.length}</span>
                      {approvedCount > 0 && (
                        <span style={{ fontSize: 10, color: '#059669', fontWeight: 600 }}>{approvedCount} approved</span>
                      )}
                    </div>
                    {qs.map((q) => {
                      const isApproved = q.approvedByTech || q.approvedByHR
                      const qType = type.toLowerCase()
                      return (
                        <div
                          key={q.id}
                          style={{ background: '#fff', border: `1px solid ${isApproved ? 'rgba(16,185,129,0.25)' : '#E2E8F0'}`, borderLeft: `3px solid ${isApproved ? '#10B981' : '#CBD5E1'}`, borderRadius: 10, padding: '14px 16px' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                            <p style={{ fontSize: 13, color: '#4F46E5', lineHeight: 1.55, margin: 0, flex: 1 }}>{q.question}</p>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              {q.difficulty && (
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0' }}>{q.difficulty}</span>
                              )}
                              {q.estimatedMinutes && (
                                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#94A3B8', background: '#F1F5F9', padding: '2px 7px', borderRadius: 100, border: '1px solid #E2E8F0' }}>{q.estimatedMinutes}m</span>
                              )}
                              {isApproved && <CheckCircle2 size={14} color="#10B981" />}
                              <button
                                onClick={async () => {
                                  try {
                                    await fetch(`/api/positions/${id}/questions/approve`, {
                                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ questionId: q.id, questionType: qType, action: isApproved ? 'unapprove' : 'approve', approverType: 'tech' }),
                                    })
                                    setPosition(p => p ? {
                                      ...p,
                                      questionSet: p.questionSet ? {
                                        ...p.questionSet,
                                        [type === 'Technical' ? 'technicalQuestions' : type === 'Scenario' ? 'scenarioQuestions' : type === 'Behavioral' ? 'behavioralQuestions' : type === 'EQ' ? 'eqQuestions' : 'whiteboardQuestions']:
                                          (p.questionSet[type === 'Technical' ? 'technicalQuestions' : type === 'Scenario' ? 'scenarioQuestions' : type === 'Behavioral' ? 'behavioralQuestions' : type === 'EQ' ? 'eqQuestions' : 'whiteboardQuestions'] ?? []).map(
                                            (qq: QuestionItem) => qq.id === q.id ? { ...qq, approvedByTech: !isApproved } : qq
                                          ),
                                      } : undefined,
                                    } : p)
                                    toast.success(isApproved ? 'Approval removed' : 'Question approved')
                                  } catch { toast.error('Failed to update') }
                                }}
                                style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${isApproved ? 'rgba(16,185,129,0.3)' : '#E2E8F0'}`, background: isApproved ? 'rgba(16,185,129,0.06)' : '#F8FAFC', color: isApproved ? '#059669' : '#64748B', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-sans)' }}
                              >
                                <Edit3 size={10} /> {isApproved ? 'Approved' : 'Approve'}
                              </button>
                            </div>
                          </div>
                          {q.techTag && (
                            <span style={{ display: 'inline-block', marginTop: 8, fontSize: 10, fontFamily: 'var(--font-mono)', color: '#6D28D9', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.18)', padding: '2px 8px', borderRadius: 4 }}>
                              {q.techTag}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ─── CANDIDATES TAB ─── */}
        {tab === 'candidates' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 14, color: '#64748B' }}>{candidates.length} candidates</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => router.push('/dashboard?section=candidates')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.25)', background: 'rgba(124,58,237,0.06)', color: '#7C3AED', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)' }}
                >
                  <Plus size={13} /> Upload Resumes
                </button>
              </div>
            </div>

            {candidates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#94A3B8' }}>
                <Users size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p style={{ fontSize: 14 }}>No candidates yet — upload resumes to get started</p>
              </div>
            ) : (
              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 120px', padding: '10px 20px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                  {['Candidate', 'Status', 'Score', 'Recommendation', 'Action'].map(h => (
                    <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                  ))}
                </div>
                {candidates.map((c, idx) => {
                  const sp = STATUS_PILL[c.status] ?? STATUS_PILL.pending
                  const rc = c.recommendation ? REC_CFG[c.recommendation] : null
                  const belowThreshold = c.score !== undefined && c.score < threshold
                  return (
                    <div key={c.id} style={{
                      display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 120px',
                      padding: '14px 20px', alignItems: 'center',
                      borderBottom: idx < candidates.length - 1 ? '1px solid #F1F5F9' : 'none',
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#4F46E5' }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{c.email}</div>
                        {c.currentTitle && <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>{c.currentTitle}{c.currentCompany ? ` · ${c.currentCompany}` : ''}</div>}
                      </div>
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, color: sp.color, background: sp.bg }}>{sp.label}</span>
                      </div>
                      <div>
                        {c.score !== undefined ? (
                          <div>
                            <ScoreBar score={c.score} threshold={threshold} />
                            {belowThreshold && (
                              <div style={{ fontSize: 10, color: '#F59E0B', marginTop: 3, fontWeight: 600 }}>Below L2 threshold</div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: '#94A3B8' }}>—</span>
                        )}
                      </div>
                      <div>
                        {rc ? (
                          <span style={{ fontSize: 11, fontWeight: 700, color: rc.color }}>{rc.label}</span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#94A3B8' }}>—</span>
                        )}
                      </div>
                      <div>
                        {c.status === 'pending' && (
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch('/api/send-invite', {
                                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ candidateId: c.id }),
                                })
                                const d = await res.json()
                                if (!res.ok) throw new Error(d.error)
                                toast.success(d.emailSent ? `Invite sent to ${c.name}` : 'Invite link created (no email API configured)')
                                setPosition(p => p ? { ...p, candidates: (p.candidates ?? []).map(ca => ca.id === c.id ? { ...ca, status: 'invited' } : ca) } : p)
                              } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Failed') }
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid rgba(79,70,229,0.25)', background: 'rgba(79,70,229,0.05)', color: '#4F46E5', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-sans)' }}
                          >
                            <Send size={10} /> Invite
                          </button>
                        )}
                        {c.status === 'completed' && (
                          <button
                            onClick={() => router.push(`/reports/${id}`)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#475569', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-sans)' }}
                          >
                            <Download size={10} /> Report
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── REPORTS TAB ─── */}
        {tab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 14, color: '#64748B' }}>{completedCount} completed interview{completedCount !== 1 ? 's' : ''}</p>
              <button
                onClick={() => router.push(`/reports/${id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.25)', background: 'rgba(124,58,237,0.06)', color: '#7C3AED', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)' }}
              >
                <BarChart3 size={13} /> Position Summary Report
              </button>
            </div>

            {reportsLoading ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <Loader2 size={24} color="#7C3AED" style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
              </div>
            ) : candidates.filter(c => c.status === 'completed').length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#94A3B8' }}>
                <BarChart3 size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p style={{ fontSize: 14 }}>No completed interviews yet</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {candidates.filter(c => c.status === 'completed').map(c => {
                  const rc = c.recommendation ? REC_CFG[c.recommendation] : null
                  const belowThreshold = c.score !== undefined && c.score < threshold
                  return (
                    <div
                      key={c.id}
                      onClick={() => router.push(`/reports/${id}`)}
                      style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', transition: 'background 0.12s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFF' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fff' }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#4F46E5' }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{c.email}</div>
                      </div>
                      {c.score !== undefined && (
                        <div style={{ minWidth: 140 }}>
                          <ScoreBar score={c.score} threshold={threshold} />
                          {belowThreshold && (
                            <div style={{ fontSize: 10, color: '#F59E0B', marginTop: 3, fontWeight: 600 }}>Below L2 threshold ({threshold})</div>
                          )}
                          {!belowThreshold && rc?.label === 'Strong Yes' && (
                            <div style={{ fontSize: 10, color: '#059669', marginTop: 3, fontWeight: 600 }}>Recommended for L2</div>
                          )}
                        </div>
                      )}
                      {rc && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: rc.color, minWidth: 80, textAlign: 'right' }}>{rc.label}</span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/reports/${id}`) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#4F46E5', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', flexShrink: 0 }}
                      >
                        <Download size={10} /> View Report
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
