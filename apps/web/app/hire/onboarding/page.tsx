'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthShell } from '@/components/hire/auth-shell'

const inp: React.CSSProperties = { padding: '12px 14px', borderRadius: 8, border: '1px solid #334155', background: '#0B1120', color: '#fff', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }
const btn: React.CSSProperties = { padding: '12px', borderRadius: 8, border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }

export default function HireOnboarding() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Step 1 — company
  const [name, setName] = useState('')
  const [type, setType] = useState('AGENCY')
  const [domain, setDomain] = useState('')

  // Step 2 — first team member
  const [tmName, setTmName] = useState('')
  const [tmEmail, setTmEmail] = useState('')
  const [tmRole, setTmRole] = useState('RECRUITER')

  useEffect(() => {
    fetch('/api/hire/auth/me').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) { router.replace('/hire/login'); return }
      setName(d.tenant?.name ?? '')
      setType(d.tenant?.type ?? 'AGENCY')
    }).catch(() => router.replace('/hire/login'))
  }, [router])

  async function saveCompany(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const res = await fetch('/api/hire/tenant', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, type, domain }) })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Could not save'); setSaving(false); return }
      setStep(2)
    } catch { setError('Something went wrong') } finally { setSaving(false) }
  }

  async function inviteMember(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      if (tmEmail.trim()) {
        const res = await fetch('/api/hire/auth/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: tmName || tmEmail.split('@')[0], email: tmEmail, role: tmRole }) })
        if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Could not invite'); setSaving(false); return }
      }
      setStep(3)
    } catch { setError('Something went wrong') } finally { setSaving(false) }
  }

  return (
    <AuthShell title={`Set up your workspace · Step ${step} of 3`}>
      {step === 1 && (
        <form onSubmit={saveCompany} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ color: '#E2E8F0', fontWeight: 700, fontSize: 14 }}>Company details</div>
          <input style={inp} placeholder="Company name" value={name} onChange={(e) => setName(e.target.value)} />
          <select style={inp} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="AGENCY">Staffing agency</option>
            <option value="CORPORATE">In-house HR team</option>
          </select>
          <input style={inp} placeholder="Website / domain (optional)" value={domain} onChange={(e) => setDomain(e.target.value)} />
          {error && <div style={{ color: '#F87171', fontSize: 13 }}>{error}</div>}
          <button type="submit" disabled={saving} style={btn}>{saving ? 'Saving…' : 'Continue'}</button>
        </form>
      )}
      {step === 2 && (
        <form onSubmit={inviteMember} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ color: '#E2E8F0', fontWeight: 700, fontSize: 14 }}>Invite your first team member</div>
          <div style={{ color: '#94A3B8', fontSize: 12 }}>Optional — you can do this later from Settings.</div>
          <input style={inp} placeholder="Their name" value={tmName} onChange={(e) => setTmName(e.target.value)} />
          <input style={inp} type="email" placeholder="Their work email" value={tmEmail} onChange={(e) => setTmEmail(e.target.value)} />
          <select style={inp} value={tmRole} onChange={(e) => setTmRole(e.target.value)}>
            <option value="RECRUITER">Recruiter</option>
            <option value="ADMIN">Admin</option>
            <option value="VIEWER">Viewer</option>
          </select>
          {error && <div style={{ color: '#F87171', fontSize: 13 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setStep(3)} style={{ ...btn, background: '#1E293B', flex: 1 }}>Skip</button>
            <button type="submit" disabled={saving} style={{ ...btn, flex: 1 }}>{saving ? 'Inviting…' : 'Send invite'}</button>
          </div>
        </form>
      )}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ color: '#E2E8F0', fontWeight: 700, fontSize: 15 }}>You&apos;re all set 🎉</div>
          <div style={{ color: '#94A3B8', fontSize: 13, lineHeight: 1.6 }}>Your 14-day free trial has started. Create your first job and start adding candidates.</div>
          <button onClick={() => router.replace('/hire/dashboard')} style={btn}>Go to dashboard →</button>
        </div>
      )}
    </AuthShell>
  )
}
