'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { BookOpen, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react'
import { Page, PageHeader, Button, Badge, Alert, EmptyState, LoadingBlock, Drawer, Modal, Field, Input, Textarea, Select, type Tone } from '@/components/screen/ui'
import { proficiencyStatement, type RubricProbe } from '@/lib/screen/rubrics/types'

// ── Rubric library (Screen-scoped) ──────────────────────────────────────────
// Browsable, searchable catalog of proficiency rubrics: area (role / technology)
// → sub-skill. Recruiters browse; workspace admins write and review. Review is
// enforced: draft → reviewed (note) → active. Only ACTIVE rubrics can be
// selected for a position, so un-reviewed content never reaches an interview.

export interface LibraryRubric {
  id: string; area: string; subSkill: string; proficientIn: string; ableTo: string; practices: string
  strong: string; weak: string; keywords: string[]; probes: RubricProbe[]; statement: string
  status: string; isSample: boolean; reviewedBy: string | null; reviewedAt: string | null; reviewNote: string | null
}

const STATUS_TONE: Record<string, Tone> = { draft: 'neutral', reviewed: 'info', active: 'success', retired: 'warning' }
const STATUS_HELP: Record<string, string> = {
  draft: 'Being written — not selectable.',
  reviewed: 'Reviewed by a domain expert — activate to make it selectable.',
  active: 'Selectable for positions.',
  retired: 'Hidden from selection; positions that already use it keep their copy.',
}

type Draft = Omit<LibraryRubric, 'id' | 'statement' | 'status' | 'isSample' | 'reviewedBy' | 'reviewedAt' | 'reviewNote'>
const blank = (): Draft => ({ area: '', subSkill: '', proficientIn: '', ableTo: '', practices: '', strong: '', weak: '', keywords: [], probes: [] })

export function RubricLibraryPage() {
  const [items, setItems] = useState<LibraryRubric[] | null>(null)
  const [canEdit, setCanEdit] = useState(false)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [area, setArea] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null)
  const [loadingSamples, setLoadingSamples] = useState(false)

  const load = useCallback(async () => {
    const r = await fetch('/api/rubric-library', { cache: 'no-store' })
    const d = r.ok ? await r.json() : { items: [], canEdit: false }
    setItems(d.items ?? []); setCanEdit(!!d.canEdit)
  }, [])
  useEffect(() => { void load() }, [load])

  const loadSamples = async () => {
    setLoadingSamples(true)
    try {
      const r = await fetch('/api/rubric-library/load-samples', { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast.success(`Samples loaded as drafts: ${d.created} new, ${d.updated} refreshed${d.skipped ? `, ${d.skipped} already reviewed (untouched)` : ''}`)
      await load()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Couldn\'t load the samples.') } finally { setLoadingSamples(false) }
  }

  // Client-side filtering keeps search instant (the library is small and agency-scoped).
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (items ?? []).filter((r) =>
      (!status || r.status === status) && (!area || r.area === area) &&
      (!needle || [r.subSkill, r.area, r.statement, ...r.keywords].some((t) => t.toLowerCase().includes(needle))))
  }, [items, q, status, area])
  const areas = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of items ?? []) m.set(r.area, (m.get(r.area) ?? 0) + 1)
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [items])
  const grouped = useMemo(() => {
    const m = new Map<string, LibraryRubric[]>()
    for (const r of filtered) m.set(r.area, [...(m.get(r.area) ?? []), r])
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])
  const open = items?.find((r) => r.id === openId) ?? null
  const activeCount = (items ?? []).filter((r) => r.status === 'active').length

  return (
    <Page>
      <PageHeader title="Rubric library"
        description="Proficiency standards by role and technology. Recruiters pick them per position and tier them Must-have, Good-to-have or Add-on — the tiers drive scoring."
        actions={canEdit ? <>
          <Button variant="secondary" leftIcon={<BookOpen size={16} />} loading={loadingSamples} onClick={loadSamples}>Load sample rubrics</Button>
          <Button leftIcon={<Plus size={16} />} onClick={() => setEditing({ id: null, draft: blank() })}>New rubric</Button>
        </> : undefined} />

      {items && items.some((r) => r.isSample && r.status !== 'active') && (
        <Alert tone="info" title="Sample rubrics need a domain review">
          Levl1 samples are examples of the template, not a finished library. Have someone who knows the domain review and edit each one before activating it.
        </Alert>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 0 }}>
          <Search size={14} aria-hidden="true" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--lv-text-muted)' }} />
          <Input aria-label="Search rubrics" placeholder="Search by rubric, area or keyword" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 30 }} />
        </div>
        <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 'auto', minWidth: 150 }}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option><option value="reviewed">Reviewed</option><option value="active">Active</option><option value="retired">Retired</option>
        </Select>
        <span style={{ fontSize: 13, color: 'var(--lv-text-muted)' }}>{activeCount} active · {(items ?? []).length} total</span>
      </div>

      {!items ? <LoadingBlock /> : items.length === 0 ? (
        <EmptyState title="No rubrics yet"
          description={canEdit ? 'Load the Levl1 samples (Oracle EBS and .NET full stack) to see the template, or write your first rubric.' : 'Ask a workspace admin to add and review rubrics.'}
          action={canEdit ? <Button size="sm" onClick={loadSamples} loading={loadingSamples}>Load sample rubrics</Button> : undefined} />
      ) : (
        <div className="rl-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 220px) 1fr', gap: 20, alignItems: 'start' }}>
          <nav aria-label="Areas" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <AreaButton label="All areas" count={items.length} active={!area} onClick={() => setArea('')} />
            {areas.map(([a, n]) => <AreaButton key={a} label={a} count={n} active={area === a} onClick={() => setArea(a)} />)}
          </nav>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
            {grouped.length === 0 && <EmptyState plain title="No rubrics match" description="Try a different search or status." />}
            {grouped.map(([a, rows]) => (
              <section key={a} aria-label={a}>
                <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--lv-text-muted)', margin: '0 0 8px' }}>{a}</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {rows.map((r) => (
                    <button key={r.id} type="button" onClick={() => setOpenId(r.id)} className="lv-card"
                      style={{ textAlign: 'left', padding: '12px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid var(--lv-border)', background: 'var(--lv-surface)', borderRadius: 8 }}>
                      <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--lv-text)' }}>{r.subSkill}</span>
                        <Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>{r.status}</Badge>
                        {r.isSample && <Badge tone="neutral">Sample</Badge>}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--lv-text-body)', lineHeight: 1.5 }}>{r.statement}</span>
                      {r.keywords.length > 0 && <span style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>{r.keywords.slice(0, 6).join(' · ')}{r.keywords.length > 6 ? ' …' : ''}</span>}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
      <style>{'@media (max-width: 760px) { .rl-grid { grid-template-columns: 1fr !important; } }'}</style>

      {open && <RubricDrawer r={open} canEdit={canEdit} onClose={() => setOpenId(null)} onChanged={load}
        onEdit={() => { setEditing({ id: open.id, draft: { area: open.area, subSkill: open.subSkill, proficientIn: open.proficientIn, ableTo: open.ableTo, practices: open.practices, strong: open.strong, weak: open.weak, keywords: open.keywords, probes: open.probes } }); setOpenId(null) }} />}
      {editing && <RubricEditor id={editing.id} initial={editing.draft} areas={areas.map(([a]) => a)} onClose={() => setEditing(null)} onSaved={async (id) => { setEditing(null); await load(); setOpenId(id) }} />}
    </Page>
  )
}

function AreaButton({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'true' : undefined}
      style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13,
        background: active ? 'var(--lv-surface-sunken)' : 'transparent', color: active ? 'var(--lv-text)' : 'var(--lv-text-body)', fontWeight: active ? 600 : 400 }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span><span style={{ color: 'var(--lv-text-muted)' }}>{count}</span>
    </button>
  )
}

function RubricDrawer({ r, canEdit, onClose, onChanged, onEdit }: { r: LibraryRubric; canEdit: boolean; onClose: () => void; onChanged: () => Promise<void>; onEdit: () => void }) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const setStatus = async (status: string) => {
    setBusy(status)
    try {
      const res = await fetch(`/api/rubric-library/${r.id}/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, note }) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error ?? 'Couldn\'t update the status.')
      toast.success(`Marked ${status}`); setNote(''); await onChanged()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Couldn\'t update the status.') } finally { setBusy(null) }
  }
  const sec: React.CSSProperties = { fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--lv-text-muted)', margin: '16px 0 6px' }
  return (
    <Drawer open onClose={onClose} title={r.subSkill} description={<span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>{r.area} <Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>{r.status}</Badge>{r.isSample && <Badge tone="neutral">Sample</Badge>}</span>}>
      <p style={{ fontSize: 12, color: 'var(--lv-text-muted)', margin: 0 }}>{STATUS_HELP[r.status]}</p>
      <div style={sec}>Proficiency standard</div>
      <p style={{ fontSize: 14, color: 'var(--lv-text)', lineHeight: 1.6, margin: 0 }}>{r.statement}</p>
      <div style={sec}>Strong answer</div><p style={{ fontSize: 13, color: 'var(--lv-text-body)', margin: 0 }}>{r.strong || '—'}</p>
      <div style={sec}>Weak answer</div><p style={{ fontSize: 13, color: 'var(--lv-text-body)', margin: 0 }}>{r.weak || '—'}</p>
      <div style={sec}>Keywords (JD + answer matching)</div><p style={{ fontSize: 13, color: 'var(--lv-text-body)', margin: 0 }}>{r.keywords.join(', ') || '—'}</p>
      <div style={sec}>Probe questions</div>
      {r.probes.length ? <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>{r.probes.map((p, i) => (
        <li key={i} style={{ fontSize: 13, color: 'var(--lv-text-body)' }}>{p.question}
          {p.strongAnswer && <div style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>Strong: {p.strongAnswer}</div>}
          {p.weakSignals && <div style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>Weak: {p.weakSignals}</div>}
        </li>))}</ol> : <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', margin: 0 }}>None yet.</p>}
      {r.reviewedBy && <><div style={sec}>Review</div><p style={{ fontSize: 13, color: 'var(--lv-text-body)', margin: 0 }}>{r.reviewNote} <span style={{ color: 'var(--lv-text-muted)' }}>— {r.reviewedBy}{r.reviewedAt ? `, ${new Date(r.reviewedAt).toLocaleDateString()}` : ''}</span></p></>}

      {canEdit && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--lv-border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {r.status === 'draft' && (
            <Field label="Review note" hint="Who reviewed it and what they checked (required to mark reviewed)">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Reviewed by R. Iyer (Oracle SCM lead): statement, anchors and probes checked against our EBS 12.2 projects." style={{ minHeight: 64 }} />
            </Field>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button size="sm" variant="secondary" onClick={onEdit}>Edit</Button>
            {r.status === 'draft' && <Button size="sm" leftIcon={<ShieldCheck size={14} />} loading={busy === 'reviewed'} disabled={!note.trim()} onClick={() => setStatus('reviewed')}>Mark reviewed</Button>}
            {r.status === 'reviewed' && <Button size="sm" loading={busy === 'active'} onClick={() => setStatus('active')}>Activate</Button>}
            {(r.status === 'active' || r.status === 'reviewed') && <Button size="sm" variant="tertiary" loading={busy === 'retired'} onClick={() => setStatus('retired')}>Retire</Button>}
            {r.status === 'retired' && <Button size="sm" variant="tertiary" loading={busy === 'draft'} onClick={() => setStatus('draft')}>Back to draft</Button>}
          </div>
          {(r.status === 'reviewed' || r.status === 'active') && <p style={{ fontSize: 12, color: 'var(--lv-text-muted)', margin: 0 }}>Editing the content sends it back to draft for re-review. Positions already using it keep their reviewed copy.</p>}
        </div>
      )}
    </Drawer>
  )
}

function RubricEditor({ id, initial, areas, onClose, onSaved }: { id: string | null; initial: Draft; areas: string[]; onClose: () => void; onSaved: (id: string) => void }) {
  const [d, setD] = useState<Draft>(initial)
  const [kw, setKw] = useState(initial.keywords.join(', '))
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }))
  const preview = d.proficientIn && d.ableTo && d.practices ? proficiencyStatement(d) : null
  const save = async () => {
    setSaving(true)
    try {
      const body = { ...d, keywords: kw.split(',').map((s) => s.trim()).filter(Boolean) }
      const res = await fetch(id ? `/api/rubric-library/${id}` : '/api/rubric-library', { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const r = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(r.error ?? 'Couldn\'t save the rubric.')
      toast.success(r.sentBackToDraft ? 'Saved — sent back to draft for re-review' : 'Rubric saved as a draft')
      onSaved(r.id ?? id)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Couldn\'t save the rubric.') } finally { setSaving(false) }
  }
  const setProbe = (i: number, patch: Partial<RubricProbe>) => set('probes', d.probes.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  return (
    <Modal open size="lg" onClose={onClose} title={id ? 'Edit rubric' : 'New rubric'}
      description="One proficiency standard per rubric: proficient in X, able to Y, by following Z."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} onClick={save}>Save draft</Button></>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 12 }}>
          <Field label="Area" hint="Role or technology group" required>
            <Input list="rl-areas" value={d.area} onChange={(e) => set('area', e.target.value)} placeholder="e.g. Oracle E-Business Suite" />
          </Field>
          <Field label="Sub-skill" required><Input value={d.subSkill} onChange={(e) => set('subSkill', e.target.value)} placeholder="e.g. Oracle Integration Development" /></Field>
        </div>
        <datalist id="rl-areas">{areas.map((a) => <option key={a} value={a} />)}</datalist>
        <Field label="Proficient in (X)" hint="Specific areas and tools" required><Textarea value={d.proficientIn} onChange={(e) => set('proficientIn', e.target.value)} style={{ minHeight: 56 }} /></Field>
        <Field label="Able to (Y)" hint="What they can design, build, troubleshoot…" required><Textarea value={d.ableTo} onChange={(e) => set('ableTo', e.target.value)} style={{ minHeight: 56 }} /></Field>
        <Field label="By following (Z)" hint="The practices a strong practitioner follows" required><Textarea value={d.practices} onChange={(e) => set('practices', e.target.value)} style={{ minHeight: 56 }} /></Field>
        {preview && <Alert tone="info" title="Statement">{preview}</Alert>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 12 }}>
          <Field label="Strong answer shows"><Textarea value={d.strong} onChange={(e) => set('strong', e.target.value)} style={{ minHeight: 64 }} /></Field>
          <Field label="Weak answer looks like"><Textarea value={d.weak} onChange={(e) => set('weak', e.target.value)} style={{ minHeight: 64 }} /></Field>
        </div>
        <Field label="Keywords" hint="Comma-separated — used to suggest this rubric from JDs and to track it live"><Input value={kw} onChange={(e) => setKw(e.target.value)} placeholder="e.g. Oracle EBS, PL/SQL, open interface" /></Field>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)', marginBottom: 6 }}>Probe questions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {d.probes.map((p, i) => (
              <div key={i} style={{ border: '1px solid var(--lv-border)', borderRadius: 6, padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Input aria-label={`Probe ${i + 1} question`} value={p.question} onChange={(e) => setProbe(i, { question: e.target.value })} placeholder="Question Ananya can ask" />
                  <Button variant="ghost" size="sm" iconOnly aria-label={`Remove probe ${i + 1}`} onClick={() => set('probes', d.probes.filter((_, j) => j !== i))}><Trash2 size={14} /></Button>
                </div>
                <Input aria-label={`Probe ${i + 1} strong answer`} value={p.strongAnswer} onChange={(e) => setProbe(i, { strongAnswer: e.target.value })} placeholder="Strong answer covers…" />
                <Input aria-label={`Probe ${i + 1} weak signals`} value={p.weakSignals} onChange={(e) => setProbe(i, { weakSignals: e.target.value })} placeholder="Weak signals…" />
              </div>
            ))}
          </div>
          <Button variant="tertiary" size="sm" leftIcon={<Plus size={14} />} disabled={d.probes.length >= 6} onClick={() => set('probes', [...d.probes, { question: '', strongAnswer: '', weakSignals: '' }])} style={{ marginTop: 6 }}>Add probe</Button>
        </div>
      </div>
    </Modal>
  )
}
