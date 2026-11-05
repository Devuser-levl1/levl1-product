'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Button, Field, Input } from '@/components/screen/ui'
import { contactEmailError } from '@/lib/screen/position-config'

// ── Fixpack 7 #1 — per-job approver emails, editable after setup ──────────
// Tech lead + HR receive this position's question-approval emails. Stored on
// the Position (techLeadEmail / hrEmail) — never an org-level setting.

export function ApproverEmailsEditor({ positionId, techLeadEmail, hrEmail, onSaved }: {
  positionId: string
  techLeadEmail?: string | null
  hrEmail?: string | null
  onSaved: (patch: { techLeadEmail: string | null; hrEmail: string | null }) => void
}) {
  const [editing, setEditing] = useState(false)
  const [tech, setTech] = useState(techLeadEmail ?? '')
  const [hr, setHr] = useState(hrEmail ?? '')
  const [saving, setSaving] = useState(false)
  const techErr = contactEmailError(tech)
  const hrErr = contactEmailError(hr)

  if (!editing) {
    return (
      <Button variant="tertiary" size="sm" onClick={() => { setTech(techLeadEmail ?? ''); setHr(hrEmail ?? ''); setEditing(true) }} style={{ alignSelf: 'flex-start' }}>
        {techLeadEmail || hrEmail ? 'Edit approver emails' : 'Add approver emails'}
      </Button>
    )
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/positions/${positionId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ techLeadEmail: tech, hrEmail: hr }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error ?? 'Couldn\'t save the approver emails.')
      onSaved({ techLeadEmail: d.techLeadEmail ?? null, hrEmail: d.hrEmail ?? null })
      setEditing(false)
      toast.success('Approver emails saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Couldn\'t save the approver emails.')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: 12 }}>
        <Field label="Technical lead email" hint="Approves technical, scenario and whiteboard questions" error={techErr}>
          <Input type="email" autoComplete="off" value={tech} onChange={(e) => setTech(e.target.value)} placeholder="techlead@company.com" />
        </Field>
        <Field label="HR email" hint="Approves behavioural and EQ questions" error={hrErr}>
          <Input type="email" autoComplete="off" value={hr} onChange={(e) => setHr(e.target.value)} placeholder="hr@company.com" />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button size="sm" loading={saving} disabled={!!techErr || !!hrErr} onClick={save}>Save</Button>
        <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    </div>
  )
}
