'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, CheckCircle2, Clock, Edit3, Users, FileText,
  BarChart3, Plus, Mail, Download, AlertCircle,
  Tag, Zap, Target, Shield, Send, Trash2, Trophy, X, ChevronDown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import CandidateUploadFlow from '@/components/candidates/CandidateUploadFlow'
import { MustHaveEditor } from '@/components/positions/MustHaveEditor'
import { LogisticsEditor } from '@/components/positions/LogisticsEditor'
import { readLogisticsConfig, type LogisticsConfig } from '@/lib/screen/logistics/config'
import { ConceptRubricEditor, KnockoutEditor } from '@/components/positions/SetupFields'
import { sanitizeConceptRubric, sanitizeKnockouts, type ConceptRubricItem, type KnockoutQuestion } from '@/lib/screen/position-config'
import { InviteTemplateEditor } from '@/components/interviews/InviteTemplateEditor'
import { useAccountType } from '@/hooks/useAccountType'
import {
  Button, ButtonLink, Card, Eyebrow, Badge, Alert, EmptyState, LoadingBlock, Modal, ActionBar,
  Field, Select, Textarea, Radio, RadioGroup, Tabs, TabPanel, Table, type Tone, type Column,
} from '@/components/screen/ui'
import { lv, space, text, radius, z } from '@/lib/screen/ui/tokens'

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
  mustHaves?: string[]
  logistics?: LogisticsConfig | null
  conceptRubric?: ConceptRubricItem[] | null
  knockoutQuestions?: KnockoutQuestion[] | null
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
// Design-System Pass 3 (group 2a): tones + tokens instead of hex. Logic below
// (state, fetches, handlers) is unchanged.
const STATUS_CFG: Record<string, { label: string; tone: Tone }> = {
  active:           { label: 'Active',           tone: 'success' },
  pending_approval: { label: 'Pending Approval', tone: 'warning' },
  draft:            { label: 'Draft',            tone: 'neutral' },
  paused:           { label: 'Paused',           tone: 'neutral' },
  closed:           { label: 'Closed',           tone: 'danger'  },
  won:              { label: 'Won',              tone: 'success' },
  lost:             { label: 'Lost',             tone: 'danger'  },
}

const REC_CFG: Record<string, { label: string; tone: Tone }> = {
  strong_yes: { label: 'Strong Yes', tone: 'success' },
  yes:        { label: 'Yes',        tone: 'brand'   },
  maybe:      { label: 'Maybe',      tone: 'warning' },
  no:         { label: 'No',         tone: 'danger'  },
}

const STATUS_PILL: Record<string, { label: string; tone: Tone }> = {
  pending:      { label: 'Pending',      tone: 'neutral' },
  invited:      { label: 'Invited',      tone: 'warning' },
  scheduled:    { label: 'Scheduled',    tone: 'brand'   },
  interviewing: { label: 'Interviewing', tone: 'info'    },
  completed:    { label: 'Completed',    tone: 'success' },
  no_show:      { label: 'No Show',      tone: 'danger'  },
  cancelled:    { label: 'Cancelled',    tone: 'danger'  },
}

const chipBase: React.CSSProperties = {
  fontSize: text.xs, fontFamily: lv.fontMono, padding: '2px 8px', borderRadius: radius.sm, whiteSpace: 'nowrap',
}

function Tag2({ children }: { children: React.ReactNode }) {
  return <span style={{ ...chipBase, background: lv.brandSoft, color: lv.brandText, border: `1px solid ${lv.brandSoftBorder}` }}>{children}</span>
}

function SoftTag({ children }: { children: React.ReactNode }) {
  return <span style={{ ...chipBase, background: lv.surfaceMuted, color: lv.textBody, border: `1px solid ${lv.border}` }}>{children}</span>
}

function ApprovalBadge({ approved, label }: { approved: boolean; label: string }) {
  return (
    <Badge tone={approved ? 'success' : 'neutral'}>
      {approved ? <CheckCircle2 size={12} aria-hidden="true" /> : <Clock size={12} aria-hidden="true" />}
      {label}: {approved ? 'Approved' : 'Pending'}
    </Badge>
  )
}

function scoreColor(score: number) {
  return score >= 85 ? lv.success : score >= 70 ? lv.brand : score >= 55 ? lv.warning : lv.danger
}

function ScoreBar({ score, threshold }: { score: number; threshold?: number }) {
  const color = scoreColor(score)
  const belowThreshold = threshold && score < threshold
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: space[2] }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: lv.surfaceMuted, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: text.sm, fontWeight: 700, color, fontFamily: lv.fontMono, minWidth: 28 }}>{score}</span>
      {belowThreshold && (
        <span style={{ fontSize: text.xs, color: lv.warning, fontWeight: 600 }}>↓ L2</span>
      )}
    </div>
  )
}

const muted: React.CSSProperties = { fontSize: text.sm, color: lv.textMuted, margin: 0 }
const twoCol: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: space[4] }
const stack = (gap: number): React.CSSProperties => ({ display: 'flex', flexDirection: 'column', gap })

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

  // Fix 5: upload modal with positionId pre-set
  const [showUpload, setShowUpload] = useState(false)

  // Fix 6: delete candidate modal
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleting, setDeleting]         = useState(false)

  // Fix 7: won/lost modal
  const [statusModal, setStatusModal] = useState<'won' | 'lost' | null>(null)
  const [wonCandidate, setWonCandidate] = useState('')
  const [wonNotes, setWonNotes]         = useState('')
  const [lostReason, setLostReason]     = useState('')
  const [lostNotes, setLostNotes]       = useState('')
  const [statusDropOpen, setStatusDropOpen] = useState(false)

  // Must-have requirements (draft → PATCH) + invite template panel
  const [mhDraft, setMhDraft]   = useState<string[] | null>(null)
  const [mhSaving, setMhSaving] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const { isCompany } = useAccountType()
  // Concept rubric (#13) + knockout questions (#14): draft → PATCH
  const [crDraft, setCrDraft]   = useState<ConceptRubricItem[] | null>(null)
  const [koDraft, setKoDraft]   = useState<KnockoutQuestion[] | null>(null)
  const [cfgSaving, setCfgSaving] = useState<'cr' | 'ko' | null>(null)
  const [crGenerating, setCrGenerating] = useState(false)
  const savePositionField = async (which: 'cr' | 'ko') => {
    const body = which === 'cr' ? { conceptRubric: crDraft } : { knockoutQuestions: koDraft }
    setCfgSaving(which)
    try {
      const res = await fetch(`/api/positions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      setPosition(p => p ? { ...p, conceptRubric: data.conceptRubric, knockoutQuestions: data.knockoutQuestions } : p)
      if (which === 'cr') setCrDraft(null); else setKoDraft(null)
      toast.success(which === 'cr' ? 'Concept rubric saved' : 'Knockout questions saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally { setCfgSaving(null) }
  }
  const regenerateRubric = async () => {
    if (!position) return
    setCrGenerating(true)
    try {
      const res = await fetch('/api/positions/concept-rubric', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jdText: position.jdText ?? '', positionTitle: position.title, experienceLevel: position.experienceLevel, skills: position.techStack, mustHaves: position.mustHaves ?? [] }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Rubric generation failed')
      setCrDraft(data.rubric)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Rubric generation failed')
    } finally { setCrGenerating(false) }
  }
  const [lgDraft, setLgDraft]   = useState<LogisticsConfig | null>(null)
  const [lgSaving, setLgSaving] = useState(false)
  const saveLogistics = async () => {
    if (!lgDraft) return
    setLgSaving(true)
    try {
      const res = await fetch(`/api/positions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ logistics: lgDraft }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      setPosition(p => p ? { ...p, logistics: data.logistics ?? lgDraft } : p)
      setLgDraft(null)
      toast.success('Logistics filters saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally { setLgSaving(false) }
  }
  const saveMustHaves = async () => {
    if (!mhDraft) return
    setMhSaving(true)
    try {
      const res = await fetch(`/api/positions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mustHaves: mhDraft }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      setPosition(p => p ? { ...p, mustHaves: data.mustHaves ?? mhDraft } : p)
      setMhDraft(null)
      toast.success('Must-have requirements saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally { setMhSaving(false) }
  }

  // Fetch position
  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/positions/${id}`)
      .then(r => {
        // Signed out ≠ not found: log in, then come straight back to this position.
        if (r.status === 401) {
          window.location.replace(`/interviews/login?expired=1&next=${encodeURIComponent(`/positions/${id}`)}`)
          return null
        }
        return r.ok ? r.json() : null
      })
      .then(data => {
        if (data) setPosition(data)
        else toast.error('Position not found')
      })
      .catch(() => toast.error('Failed to load position'))
      .finally(() => setLoading(false))
  }, [id])

  // Silent re-read (no full-page spinner) — after candidates are added, the list
  // must reflect the write immediately (it renders position.candidates).
  const refreshPosition = useCallback(async () => {
    try {
      const r = await fetch(`/api/positions/${id}`, { cache: 'no-store' })
      if (r.ok) setPosition(await r.json())
    } catch { /* keep current view */ }
  }, [id])

  // Deep links: ?tab=questions|candidates|reports|overview and ?upload=1 (open the
  // upload panel for THIS position — used right after creating a position).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const t = q.get('tab')
    if (t === 'overview' || t === 'questions' || t === 'candidates' || t === 'reports') setTab(t)
    if (q.get('upload') === '1') { setTab('candidates'); setShowUpload(true) }
    if (t || q.get('upload')) window.history.replaceState(null, '', window.location.pathname)
  }, [])

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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: lv.bg }}>
        <LoadingBlock label="Loading position…" />
      </div>
    )
  }

  if (!position) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: lv.bg, padding: space[4] }}>
        <EmptyState icon={<AlertCircle size={22} />} title="Position not found"
          description="It may have been deleted, or you may not have access to it."
          action={<Button variant="secondary" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>} />
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

  const handleDeleteCandidate = async () => {
    if (!deleteTarget || !deleteReason.trim()) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/candidates/${deleteTarget.id}/delete`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deleteReason }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setPosition(p => p ? { ...p, candidates: (p.candidates ?? []).filter(c => c.id !== deleteTarget.id) } : p)
      toast.success(`${deleteTarget.name} deleted`)
      setDeleteTarget(null); setDeleteReason('')
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Delete failed') }
    finally { setDeleting(false) }
  }

  const handleStatusChange = async (newStatus: 'won' | 'lost' | 'paused' | 'closed') => {
    try {
      const body: Record<string, unknown> = { status: newStatus }
      if (newStatus === 'won')  { body.wonCandidateId = wonCandidate; body.wonNotes = wonNotes }
      if (newStatus === 'lost') { body.lostReason = lostReason; body.lostNotes = lostNotes }
      const res = await fetch(`/api/positions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error('Failed to update')
      setPosition(p => p ? { ...p, status: newStatus } : p)
      setStatusModal(null); setStatusDropOpen(false)
      toast.success(`Position marked as ${newStatus}`)
    } catch { toast.error('Failed to update position status') }
  }

  const closeDelete = () => { setDeleteTarget(null); setDeleteReason('') }
  const draftActions = (onCancel: () => void, onSave: () => void, saving: boolean) => (
    <>
      <Button variant="secondary" size="sm" onClick={onCancel} disabled={saving}>Cancel</Button>
      <Button size="sm" onClick={onSave} loading={saving}>{saving ? 'Saving…' : 'Save'}</Button>
    </>
  )
  const gutter = 'clamp(16px, 4vw, 32px)'

  const candidateColumns: Column<Candidate>[] = [
    { key: 'candidate', header: 'Candidate', render: (c) => (
      <div style={{ minWidth: 180 }}>
        <div style={{ fontSize: text.base, fontWeight: 600, color: lv.text }}>{c.name}</div>
        <div style={{ fontSize: text.xs, color: lv.textMuted, marginTop: 2 }}>{c.email}</div>
        {c.currentTitle && <div style={{ fontSize: text.xs, color: lv.textBody, marginTop: 1 }}>{c.currentTitle}{c.currentCompany ? ` · ${c.currentCompany}` : ''}</div>}
      </div>
    ) },
    { key: 'status', header: 'Status', render: (c) => {
      const sp = STATUS_PILL[c.status] ?? STATUS_PILL.pending
      return <Badge tone={sp.tone}>{sp.label}</Badge>
    } },
    { key: 'score', header: 'Score', render: (c) => c.score !== undefined ? (
      <div style={{ minWidth: 120 }}>
        <ScoreBar score={c.score} threshold={threshold} />
        {c.score < threshold && (
          <div style={{ fontSize: text.xs, color: lv.warning, marginTop: 3, fontWeight: 600 }}>Below L2 threshold</div>
        )}
      </div>
    ) : <span style={{ color: lv.textMuted }}>—</span> },
    { key: 'rec', header: 'Recommendation', render: (c) => {
      const rc = c.recommendation ? REC_CFG[c.recommendation] : null
      return rc ? <Badge tone={rc.tone}>{rc.label}</Badge> : <span style={{ color: lv.textMuted }}>—</span>
    } },
    { key: 'actions', header: 'Actions', render: (c) => (
      <div style={{ display: 'flex', gap: space[2], alignItems: 'center' }}>
        {c.status === 'pending' && (
          <Button variant="secondary" size="sm" leftIcon={<Send size={13} />}
            onClick={async () => {
              try {
                const res = await fetch('/api/send-invite', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ candidateId: c.id, candidateEmail: c.email }),
                })
                const d = await res.json()
                if (!res.ok) throw new Error(d.error)
                toast.success(d.emailSent ? `Invite sent to ${c.name}` : 'Invite link created (no email API configured)')
                setPosition(p => p ? { ...p, candidates: (p.candidates ?? []).map(ca => ca.id === c.id ? { ...ca, status: 'invited' } : ca) } : p)
              } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Failed') }
            }}>
            Invite
          </Button>
        )}
        {c.status === 'completed' && (
          <Button variant="secondary" size="sm" leftIcon={<FileText size={13} />} onClick={() => router.push(`/reports/${id}`)}>Report</Button>
        )}
        <Button variant="ghost" size="sm" iconOnly aria-label={`Delete ${c.name}`} title="Delete candidate"
          onClick={() => setDeleteTarget({ id: c.id, name: c.name })} style={{ color: lv.danger }}>
          <Trash2 size={14} />
        </Button>
      </div>
    ) },
  ]

  const statusActions = [
    { label: 'Pause position', action: () => handleStatusChange('paused'),  color: lv.warning },
    { label: 'Mark as Won',    action: () => { setStatusDropOpen(false); setStatusModal('won') },  color: lv.success, icon: <Trophy size={14} aria-hidden="true" /> },
    { label: 'Mark as Lost',   action: () => { setStatusDropOpen(false); setStatusModal('lost') }, color: lv.danger,  icon: <X size={14} aria-hidden="true" /> },
    { label: 'Close position', action: () => handleStatusChange('closed'),  color: lv.textBody },
  ]

  return (
    <div style={{ minHeight: '100vh', background: lv.bg, fontFamily: lv.fontSans }}>

      {/* Fix 5: upload modal pre-set to this position */}
      {showUpload && <CandidateUploadFlow onClose={() => setShowUpload(false)} presetPositionId={id} onAdded={() => { setTab('candidates'); void refreshPosition() }} />}

      {/* Fix 6: delete candidate confirmation */}
      <Modal open={!!deleteTarget} onClose={closeDelete} dismissible={!deleting} size="sm" title="Delete candidate"
        description={deleteTarget && <>You are about to delete <strong>{deleteTarget.name}</strong>. This cannot be undone.</>}
        footer={<ActionBar>
          <Button variant="secondary" onClick={closeDelete} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={handleDeleteCandidate} disabled={!deleteReason.trim()} loading={deleting}>
            {deleting ? 'Deleting…' : 'Delete candidate'}
          </Button>
        </ActionBar>}>
        <Field label="Reason for deletion" required>
          <Textarea value={deleteReason} onChange={e => setDeleteReason(e.target.value)} rows={3}
            placeholder="e.g. Candidate withdrew, duplicate entry…" />
        </Field>
      </Modal>

      {/* Fix 7: won modal */}
      <Modal open={statusModal === 'won'} onClose={() => setStatusModal(null)} size="sm"
        title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: space[2] }}><Trophy size={18} color={lv.warning} aria-hidden="true" />Mark position as won</span>}
        footer={<ActionBar>
          <Button variant="secondary" onClick={() => setStatusModal(null)}>Cancel</Button>
          <Button onClick={() => handleStatusChange('won')}>Confirm</Button>
        </ActionBar>}>
        <div style={stack(space[4])}>
          <Field label="Which candidate was selected?">
            <Select value={wonCandidate} onChange={e => setWonCandidate(e.target.value)}>
              <option value="">— Select candidate —</option>
              {candidates.filter(c => c.status === 'completed').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Notes (optional)">
            <Textarea value={wonNotes} onChange={e => setWonNotes(e.target.value)} rows={3} placeholder="e.g. Client selected after L2 interview" />
          </Field>
        </div>
      </Modal>

      {/* Fix 7: lost modal */}
      <Modal open={statusModal === 'lost'} onClose={() => setStatusModal(null)} size="sm"
        title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: space[2] }}><X size={18} color={lv.danger} aria-hidden="true" />Mark position as lost</span>}
        footer={<ActionBar>
          <Button variant="secondary" onClick={() => setStatusModal(null)}>Cancel</Button>
          <Button onClick={() => handleStatusChange('lost')} disabled={!lostReason}>Confirm</Button>
        </ActionBar>}>
        <div style={stack(space[4])}>
          <RadioGroup label="Reason">
            {['Client cancelled the requirement', 'Candidate accepted another offer', 'Budget freeze', 'Position put on hold', 'Other'].map(r => (
              <Radio key={r} name="lost-reason" value={r} checked={lostReason === r} onChange={() => setLostReason(r)}>{r}</Radio>
            ))}
          </RadioGroup>
          <Field label="Notes (optional)">
            <Textarea value={lostNotes} onChange={e => setLostNotes(e.target.value)} rows={3} placeholder="Additional context…" />
          </Field>
        </div>
      </Modal>

      {/* ── Header bar + tabs ── */}
      <div style={{ background: lv.surface, borderBottom: `1px solid ${lv.border}`, position: 'sticky', top: 0, zIndex: z.sticky, boxShadow: lv.shadowSm }}>
        <div style={{ padding: `${space[3]}px ${gutter}`, display: 'flex', alignItems: 'center', gap: space[4], flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={() => router.back()}>Back</Button>

          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: space[2], flexWrap: 'wrap' }}>
              <h1 className="lv-page-title" style={{ fontSize: text.lg, lineHeight: 1.25 }}>{position.title}</h1>
              <Badge tone={statusCfg.tone} dot>{statusCfg.label}</Badge>
            </div>
            <p style={{ fontSize: text.xs, color: lv.textMuted, margin: '2px 0 0' }}>
              {position.company}{position.department ? ` · ${position.department}` : ''} · {position.experienceLevel}
            </p>
          </div>

          {/* Fix 7: status dropdown */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <Button variant="secondary" size="sm" leftIcon={<Edit3 size={14} />} rightIcon={<ChevronDown size={14} />}
              aria-haspopup="menu" aria-expanded={statusDropOpen} onClick={() => setStatusDropOpen(v => !v)}>
              Actions
            </Button>
            {statusDropOpen && (
              <div role="menu" aria-label="Position actions"
                style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: lv.surface, border: `1px solid ${lv.border}`, borderRadius: radius.md, boxShadow: lv.shadowLg, minWidth: 200, zIndex: z.sidebar, overflow: 'hidden', padding: space[1] }}
                onMouseLeave={() => setStatusDropOpen(false)}>
                {statusActions.map(item => (
                  <button key={item.label} role="menuitem" type="button" onClick={item.action}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: space[2], textAlign: 'left', minHeight: 40, padding: `0 ${space[3]}px`, background: 'none', border: 'none', borderRadius: radius.sm, cursor: 'pointer', fontSize: text.sm, fontWeight: 600, color: item.color, fontFamily: lv.fontSans }}
                    onMouseEnter={e => (e.currentTarget.style.background = lv.surfaceMuted)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    {item.icon}{item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: `0 ${gutter}` }}>
          <Tabs<TabKey> label="Position sections" idPrefix="pos-tab" value={tab} onChange={setTab} items={[
            { key: 'overview',   label: 'Overview',   icon: <FileText size={14} aria-hidden="true" /> },
            { key: 'questions',  label: 'Questions',  icon: <Tag size={14} aria-hidden="true" />,       count: allQuestions.length || undefined },
            { key: 'candidates', label: 'Candidates', icon: <Users size={14} aria-hidden="true" />,     count: candidates.length || undefined },
            { key: 'reports',    label: 'Reports',    icon: <BarChart3 size={14} aria-hidden="true" />, count: completedCount || undefined },
          ]} />
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 1024, margin: '0 auto', padding: `${space[8]}px ${gutter} ${space[12]}px` }}>
        <TabPanel tabKey={tab} idPrefix="pos-tab">

        {/* ─── OVERVIEW TAB ─── */}
        {tab === 'overview' && (
          <div style={stack(space[6])}>

            {/* Approvals */}
            <div style={{ display: 'flex', gap: space[2], flexWrap: 'wrap' }}>
              <ApprovalBadge approved={position.techLeadApproved} label="Tech Lead" />
              <ApprovalBadge approved={position.hrApproved} label="HR" />
              {position.clientManagerEmail && (
                <Badge tone="neutral"><Mail size={12} aria-hidden="true" />{isCompany ? 'Hiring contact' : 'Client'}: {position.clientManagerEmail}</Badge>
              )}
            </div>

            {/* JD */}
            {position.jdText && (
              <Card title="Job description">
                <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                  <pre style={{ fontSize: text.sm, color: lv.textBody, lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: lv.fontSans, margin: 0 }}>
                    {position.jdText}
                  </pre>
                </div>
              </Card>
            )}

            {/* Skills */}
            <div style={twoCol}>
              <Card title="Required tech stack">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {position.techStack.length > 0
                    ? position.techStack.map(t => <Tag2 key={t}>{t}</Tag2>)
                    : <span style={muted}>None specified</span>}
                </div>
              </Card>
              <Card title="Good to have">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {position.goodToHave.length > 0
                    ? position.goodToHave.map(t => <SoftTag key={t}>{t}</SoftTag>)
                    : <span style={muted}>None specified</span>}
                </div>
              </Card>
            </div>

            {/* Must-have requirements (F3) */}
            <Card title="Must-have requirements" actions={mhDraft && draftActions(() => setMhDraft(null), saveMustHaves, mhSaving)}>
              <MustHaveEditor value={mhDraft ?? position.mustHaves ?? []} onChange={setMhDraft} suggestions={position.techStack} />
              {mhDraft && allQuestions.length > 0 && (
                <Alert tone="warning" style={{ marginTop: space[3] }}>
                  This position&apos;s questions were generated before this change — regenerate questions so every new must-have gets a dedicated question. Reports still rate each must-have either way.
                </Alert>
              )}
            </Card>

            {/* Logistics filters — negotiated / recorded early in the interview */}
            <Card title="Logistics filters"
              subtitle={<>Resolved in a short segment right after the warm-up. Blank = just record the candidate&apos;s answer.</>}
              actions={lgDraft && draftActions(() => setLgDraft(null), saveLogistics, lgSaving)}>
              <LogisticsEditor value={lgDraft ?? readLogisticsConfig(position.logistics)} onChange={setLgDraft} />
            </Card>

            {/* Role concept rubric (#13) */}
            <Card title="Role concept rubric" actions={crDraft && draftActions(() => setCrDraft(null), () => savePositionField('cr'), cfgSaving === 'cr')}>
              <ConceptRubricEditor value={crDraft ?? sanitizeConceptRubric(position.conceptRubric)} onChange={setCrDraft}
                onGenerate={regenerateRubric} generating={crGenerating} canGenerate={!!position.jdText || !!position.title} />
              {crDraft && <p style={{ ...muted, fontSize: text.xs, marginTop: space[3] }}>Reports generated from now on are scored against the saved rubric. Regenerate questions to steer them toward any new concepts.</p>}
            </Card>

            {/* Knockout questions (#14) */}
            <Card title="Knockout questions" actions={koDraft && draftActions(() => setKoDraft(null), () => savePositionField('ko'), cfgSaving === 'ko')}>
              <KnockoutEditor value={koDraft ?? sanitizeKnockouts(position.knockoutQuestions)} onChange={setKoDraft} />
            </Card>

            {/* Interview settings */}
            <Card title="Interview settings">
              <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: space[4], margin: 0 }}>
                {[
                  { label: 'Duration',      value: `${position.interviewDuration} min`,             icon: Clock },
                  { label: 'Dynamic Mode',  value: position.dynamicIntensity ?? 'standard',          icon: Zap },
                  { label: 'Role Type',     value: position.roleType,                                icon: Shield },
                  { label: 'Work Mode',     value: position.workMode ?? '—',                         icon: Users },
                  { label: 'Domain',        value: position.primaryDomain ?? '—',                    icon: Target },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label}>
                    <dt style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                      <Icon size={12} color={lv.textMuted} aria-hidden="true" />
                      <Eyebrow>{label}</Eyebrow>
                    </dt>
                    <dd style={{ margin: 0, fontSize: text.base, fontWeight: 600, color: lv.text }}>{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            {/* Candidate invite email (F2) — per-position override */}
            <Card title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: space[2] }}><Mail size={16} color={lv.brand} aria-hidden="true" />Candidate invite email</span>}
              subtitle="Uses your agency template unless you customise it for this position."
              actions={<Button variant="secondary" size="sm" aria-expanded={showInvite} onClick={() => setShowInvite(v => !v)}>{showInvite ? 'Close' : 'Customise'}</Button>}>
              {showInvite && (
                <InviteTemplateEditor endpoint={`/api/positions/${id}/invite-template`} scope="position"
                  previewVars={{ position_title: position.title, company: position.company, duration_minutes: String(position.interviewDuration) }} />
              )}
            </Card>

            {/* L2 Threshold + Scoring Rubric */}
            <div style={twoCol}>
              <Card title="L2 score threshold">
                <div style={{ display: 'flex', alignItems: 'baseline', gap: space[2], marginBottom: space[2] }}>
                  <span style={{ fontSize: 32, fontWeight: 800, color: lv.brandText, fontFamily: lv.fontDisplay }}>{threshold}</span>
                  <span style={{ fontSize: text.base, color: lv.textMuted }}>/100</span>
                </div>
                <p style={{ ...muted, fontSize: text.xs }}>
                  Candidates below this score are marked &ldquo;Below L2 threshold&rdquo; regardless of recommendation.
                </p>
              </Card>

              <Card title="Scoring rubric">
                <div style={stack(space[2])}>
                  {[
                    { label: 'Technical Depth',    value: rubric.technical ?? 40,       color: lv.brand },
                    { label: 'Problem Solving',    value: rubric.problemSolving ?? 30,  color: lv.accent },
                    { label: 'Behavioral / EQ',    value: rubric.behavioral ?? 20,      color: lv.success },
                    { label: 'EQ & Soft Skills',   value: rubric.eq ?? 10,              color: lv.warning },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: space[3] }}>
                      <span style={{ fontSize: text.xs, color: lv.textBody, minWidth: 120 }}>{label}</span>
                      <div style={{ flex: 1, height: 6, borderRadius: 3, background: lv.surfaceMuted, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: text.xs, fontWeight: 700, color: lv.text, fontFamily: lv.fontMono, minWidth: 32, textAlign: 'right' }}>{value}%</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ─── QUESTIONS TAB ─── */}
        {tab === 'questions' && (
          <div style={stack(space[4])}>
            {/* Approval status banner */}
            <Card title="Approval status"
              actions={(position.techLeadEmail || position.hrEmail) ? (
                <Button variant="secondary" size="sm" leftIcon={<Mail size={14} />}
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/positions/${id}/send-approvals`, { method: 'POST' })
                      const d = await res.json()
                      if (!res.ok) throw new Error(d.error)
                      toast.success(d.emailsConfigured ? 'Approval emails sent!' : 'Approval tokens created (add RESEND_API_KEY to send emails)')
                    } catch (err: unknown) {
                      toast.error(err instanceof Error ? err.message : 'Failed to send approvals')
                    }
                  }}>
                  {(position.techLeadApproved && position.hrApproved) ? 'Resend Reminder' : 'Send for Approval'}
                </Button>
              ) : undefined}>
              <div style={stack(space[2])}>
                {([
                  position.techLeadEmail ? { who: 'Tech Lead', email: position.techLeadEmail, ok: position.techLeadApproved } : null,
                  position.hrEmail ? { who: 'HR', email: position.hrEmail, ok: position.hrApproved } : null,
                ].filter(Boolean) as { who: string; email: string; ok: boolean }[]).map(a => (
                  <div key={a.who} style={{ display: 'flex', alignItems: 'center', gap: space[2], flexWrap: 'wrap' }}>
                    <span style={{ fontSize: text.sm, color: lv.textBody }}>{a.who} ({a.email}):</span>
                    <Badge tone={a.ok ? 'success' : 'warning'}>
                      {a.ok ? <CheckCircle2 size={12} aria-hidden="true" /> : <Clock size={12} aria-hidden="true" />}
                      {a.ok ? 'Approved' : 'Pending'}
                    </Badge>
                  </div>
                ))}
                {!position.techLeadEmail && !position.hrEmail && (
                  <p style={muted}>No approvers configured — edit the position to add Tech Lead and HR emails.</p>
                )}
              </div>
            </Card>

            <p style={{ ...muted, fontSize: text.base }}>{allQuestions.length} questions in bank</p>

            {allQuestions.length === 0 ? (
              <EmptyState icon={<FileText size={22} />} title="No questions generated yet"
                description="Questions are generated from the job description and tech stack when the position is set up." />
            ) : (
              (['Technical', 'Scenario', 'Behavioral', 'EQ', 'Whiteboard'] as const).map(type => {
                const qs = allQuestions.filter((q) => (q as { _type: string })._type === type)
                if (qs.length === 0) return null
                const approvedCount = qs.filter(q => q.approvedByTech || q.approvedByHR).length
                return (
                  <section key={type} aria-label={`${type} questions`} style={stack(space[2])}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: space[2] }}>
                      <Eyebrow>{type}</Eyebrow>
                      <span className="lv-tab__count">{qs.length}</span>
                      {approvedCount > 0 && (
                        <span style={{ fontSize: text.xs, color: lv.success, fontWeight: 600 }}>{approvedCount} approved</span>
                      )}
                    </div>
                    {qs.map((q) => {
                      const isApproved = q.approvedByTech || q.approvedByHR
                      const qType = type.toLowerCase()
                      return (
                        <div
                          key={q.id}
                          className="lv-card"
                          style={{ borderLeft: `3px solid ${isApproved ? lv.success : lv.borderStrong}`, padding: `${space[3]}px ${space[4]}px` }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: space[3], flexWrap: 'wrap' }}>
                            <p style={{ fontSize: text.base, color: lv.text, lineHeight: 1.55, margin: 0, flex: '1 1 320px' }}>{q.question}</p>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                              {q.difficulty && <Badge tone="neutral">{q.difficulty}</Badge>}
                              {q.estimatedMinutes && <Badge tone="neutral">{q.estimatedMinutes}m</Badge>}
                              <Button variant={isApproved ? 'secondary' : 'tertiary'} size="sm" aria-pressed={!!isApproved}
                                leftIcon={isApproved ? <CheckCircle2 size={13} color={lv.success} /> : <Edit3 size={13} />}
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
                                }}>
                                {isApproved ? 'Approved' : 'Approve'}
                              </Button>
                            </div>
                          </div>
                          {q.techTag && (
                            <span style={{ ...chipBase, display: 'inline-block', marginTop: space[2], background: lv.accentSoft, color: lv.accent, border: `1px solid ${lv.border}` }}>
                              {q.techTag}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </section>
                )
              })
            )}
          </div>
        )}

        {/* ─── CANDIDATES TAB ─── */}
        {tab === 'candidates' && (
          <div style={stack(space[4])}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space[3], flexWrap: 'wrap' }}>
              <p style={{ ...muted, fontSize: text.base }}>{candidates.length} candidates</p>
              <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowUpload(true)}>Upload Candidates</Button>
            </div>

            {candidates.length === 0 ? (
              <EmptyState icon={<Users size={22} />} title="No candidates yet"
                description="Upload resumes to add candidates to this position."
                action={<Button leftIcon={<Plus size={16} />} onClick={() => setShowUpload(true)}>Upload Candidates</Button>} />
            ) : (
              <Table<Candidate> caption="Candidates for this position" columns={candidateColumns} rows={candidates} rowKey={(c) => c.id} />
            )}
          </div>
        )}

        {/* ─── REPORTS TAB ─── */}
        {tab === 'reports' && (
          <div style={stack(space[4])}>
            <div style={{ display: 'flex', alignItems: 'center', gap: space[2], flexWrap: 'wrap' }}>
              <p style={{ ...muted, fontSize: text.base, marginRight: 'auto' }}>{completedCount} completed interview{completedCount !== 1 ? 's' : ''}</p>
              <ButtonLink href={`/api/reports/export?positionId=${id}`} download variant="secondary" size="sm" leftIcon={<Download size={14} />}>
                Export CSV
              </ButtonLink>
              <Button size="sm" leftIcon={<BarChart3 size={14} />} onClick={() => router.push(`/reports/${id}`)}>
                Position Summary Report
              </Button>
            </div>

            {reportsLoading ? (
              <LoadingBlock label="Loading reports…" />
            ) : candidates.filter(c => c.status === 'completed').length === 0 ? (
              <EmptyState icon={<BarChart3 size={22} />} title="No completed interviews yet"
                description="Reports appear here as soon as a candidate finishes their interview." />
            ) : (
              <div style={stack(space[2])}>
                {candidates.filter(c => c.status === 'completed').map(c => {
                  const rc = c.recommendation ? REC_CFG[c.recommendation] : null
                  const belowThreshold = c.score !== undefined && c.score < threshold
                  return (
                    <Card key={c.id} as="div" onClick={() => router.push(`/reports/${id}`)} style={{ padding: `${space[4]}px ${space[5]}px` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: space[4], flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                          <div style={{ fontSize: text.base, fontWeight: 600, color: lv.text }}>{c.name}</div>
                          <div style={{ fontSize: text.xs, color: lv.textMuted, marginTop: 2 }}>{c.email}</div>
                        </div>
                        {c.score !== undefined && (
                          <div style={{ minWidth: 140 }}>
                            <ScoreBar score={c.score} threshold={threshold} />
                            {belowThreshold && (
                              <div style={{ fontSize: text.xs, color: lv.warning, marginTop: 3, fontWeight: 600 }}>Below L2 threshold ({threshold})</div>
                            )}
                            {!belowThreshold && rc?.label === 'Strong Yes' && (
                              <div style={{ fontSize: text.xs, color: lv.success, marginTop: 3, fontWeight: 600 }}>Recommended for L2</div>
                            )}
                          </div>
                        )}
                        {rc && <Badge tone={rc.tone}>{rc.label}</Badge>}
                        <Button variant="secondary" size="sm" leftIcon={<FileText size={13} />}
                          onClick={(e) => { e.stopPropagation(); router.push(`/reports/${id}`) }}>
                          View Report
                        </Button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        </TabPanel>
      </div>
    </div>
  )
}
