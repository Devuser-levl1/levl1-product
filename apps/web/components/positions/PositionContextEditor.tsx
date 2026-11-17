'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Pencil } from 'lucide-react'
import { Button, Field, Input, Select } from '@/components/screen/ui'
import { DEPARTMENTS, INDUSTRIES, composeDomain, splitDomain } from '@/lib/screen/position-fields'

// ── Edit a position's Department + Industry / domain context (Screen) ──────
// Same options as setup. The domain feeds question + AI-draft generation, so a
// change applies to anything generated AFTER it (existing questions are kept).

export function PositionContextEditor({ positionId, department, domainContext, canEdit, onSaved }: {
  positionId: string
  department: string | null | undefined
  domainContext: string | null | undefined
  canEdit: boolean
  onSaved: (patch: { department: string | null; domainContext: string | null }) => void
}) {
  const [editing, setEditing] = useState(false)
  const [dept, setDept] = useState(department ?? '')
  const [deptOther, setDeptOther] = useState(false)
  const initial = splitDomain(domainContext)
  const [industry, setIndustry] = useState(initial.industry)
  const [details, setDetails] = useState(initial.details)
  const [saving, setSaving] = useState(false)
  const isOther = deptOther || (!!dept && !(DEPARTMENTS as readonly string[]).includes(dept))

  const start = () => {
    const d = splitDomain(domainContext)
    setDept(department ?? ''); setDeptOther(false); setIndustry(d.industry); setDetails(d.details); setEditing(true)
  }
  const save = async () => {
    setSaving(true)
    try {
      const body = { department: dept.trim() || null, domainContext: composeDomain(industry, details) || null }
      const r = await fetch(`/api/positions/${positionId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d.error ?? 'Couldn\'t save. Please try again.')
      onSaved({ department: d.department ?? null, domainContext: d.domainContext ?? null })
      setEditing(false)
      toast.success('Saved — applies to questions and AI drafts generated from now on')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Couldn\'t save. Please try again.') } finally { setSaving(false) }
  }

  if (!editing) {
    return (
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', fontSize: 13, color: 'var(--lv-text-body)' }}>
        <span><span style={{ color: 'var(--lv-text-muted)' }}>Department:</span> {department || 'Not set'}</span>
        <span><span style={{ color: 'var(--lv-text-muted)' }}>Industry / domain:</span> {domainContext || 'Not set'}</span>
        {canEdit && <Button size="sm" variant="tertiary" leftIcon={<Pencil size={13} />} onClick={start}>Edit</Button>}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 12 }}>
        <Field label="Department">
          <Select value={isOther ? '__other' : dept} onChange={(e) => { if (e.target.value === '__other') { setDeptOther(true); setDept('') } else { setDeptOther(false); setDept(e.target.value) } }}>
            <option value="">Not set</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            <option value="__other">Other…</option>
          </Select>
        </Field>
        {isOther && (
          <Field label="Department name"><Input value={dept} onChange={(e) => setDept(e.target.value)} placeholder="Type the department" maxLength={80} /></Field>
        )}
        <Field label="Industry" hint="Ananya tailors scenarios and rubrics to this industry">
          <Select value={industry} onChange={(e) => setIndustry(e.target.value)}>
            <option value="">Not specified</option>
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Domain details (optional)" hint="Anything specific, or an industry not listed">
        <Input value={details} onChange={(e) => setDetails(e.target.value)} placeholder="e.g. Core banking — UPI and card payments; RBI compliance" maxLength={200} />
      </Field>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button size="sm" loading={saving} onClick={save}>Save</Button>
        <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--lv-text-muted)' }}>Existing questions and approved rubrics are kept. Regenerate questions or the AI draft to apply the new context.</p>
    </div>
  )
}
