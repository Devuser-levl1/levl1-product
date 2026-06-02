'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Building2, FileText, Users, CreditCard, Plus, Trash2, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

const INPUT: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: '1px solid #E2E8F0', fontSize: 14, fontFamily: 'var(--font-sans)',
  outline: 'none', boxSizing: 'border-box', background: '#F8FAFC',
  transition: 'border-color 0.15s',
}

const TEAM_SIZES = ['1-5', '6-20', '21-50', '50+']
const PRIMARY_SERVICES = ['RPO', 'Staffing', 'Executive Search', 'Mixed']

type MemberRole = 'admin' | 'recruiter' | 'viewer'
interface TeamMemberRow { name: string; email: string; role: MemberRole }

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: done ? '#10B981' : active ? '#4F46E5' : '#E2E8F0',
      color: done || active ? '#fff' : '#94A3B8',
      fontSize: 12, fontWeight: 700, flexShrink: 0, transition: 'all 0.2s',
    }}>
      {done ? '✓' : n}
    </div>
  )
}

const STEPS = [
  { n: 1, label: 'Agency Details',  icon: Building2  },
  { n: 2, label: 'GST & Business',  icon: FileText   },
  { n: 3, label: 'Team Members',    icon: Users      },
  { n: 4, label: 'Payment Setup',   icon: CreditCard },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 1 — Agency Details
  const [agencyName,    setAgencyName]    = useState('')
  const [website,       setWebsite]       = useState('')
  const [foundedYear,   setFoundedYear]   = useState('')
  const [teamSize,      setTeamSize]      = useState('')
  const [primaryService,setPrimaryService]= useState('')
  const [hqCity,        setHqCity]        = useState('')

  // Step 2 — GST & Business
  const [gstNumber,      setGstNumber]      = useState('')
  const [panNumber,      setPanNumber]      = useState('')
  const [legalName,      setLegalName]      = useState('')
  const [regAddress,     setRegAddress]     = useState('')
  const [city,           setCity]           = useState('')
  const [state,          setState]          = useState('')
  const [pinCode,        setPinCode]        = useState('')
  const [sameBilling,    setSameBilling]    = useState(false)

  // Step 3 — Team Members
  const [members, setMembers] = useState<TeamMemberRow[]>([
    { name: '', email: '', role: 'recruiter' },
  ])
  const [inviting, setInviting] = useState(false)

  function addMember() {
    setMembers(m => [...m, { name: '', email: '', role: 'recruiter' }])
  }
  function removeMember(i: number) {
    setMembers(m => m.filter((_, idx) => idx !== i))
  }
  function updateMember(i: number, field: keyof TeamMemberRow, val: string) {
    setMembers(m => m.map((row, idx) => idx === i ? { ...row, [field]: val } : row))
  }

  // ── Save Step 1 ──────────────────────────────────────────────────────────
  async function saveStep1(e: React.FormEvent) {
    e.preventDefault()
    if (!teamSize || !primaryService) { toast.error('Please select team size and primary service'); return }
    setSaving(true)
    try {
      await fetch('/api/agency/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 1, agencyName, website, foundedYear: foundedYear ? parseInt(foundedYear) : undefined, teamSize, primaryService, city: hqCity }),
      })
      setStep(2)
    } catch { toast.error('Failed to save — please retry') }
    finally { setSaving(false) }
  }

  // ── Save Step 2 ──────────────────────────────────────────────────────────
  async function saveStep2(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await fetch('/api/agency/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 2, gstNumber, panNumber, legalName, registeredAddress: regAddress, city, state, pinCode }),
      })
      setStep(3)
    } catch { toast.error('Failed to save — please retry') }
    finally { setSaving(false) }
  }

  // ── Save Step 3 ──────────────────────────────────────────────────────────
  async function saveStep3() {
    const valid = members.filter(m => m.email.trim())
    if (valid.length === 0) { setStep(4); return }
    setInviting(true)
    try {
      await fetch('/api/agency/invite-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members: valid }),
      })
      toast.success(`Invites sent to ${valid.length} team member${valid.length > 1 ? 's' : ''}`)
    } catch { toast.error('Some invites could not be sent — you can retry from Settings') }
    finally { setInviting(false); setStep(4) }
  }

  // ── Complete Onboarding ───────────────────────────────────────────────────
  async function completeOnboarding() {
    setSaving(true)
    try {
      await fetch('/api/agency/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 4, onboardingComplete: true }),
      })
      toast.success('Setup complete! Welcome to Levl1 🎉')
      router.push('/dashboard')
    } catch {
      toast.error('Could not save — redirecting anyway')
      router.push('/dashboard')
    }
    finally { setSaving(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FF', fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <header style={{ height: 60, background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 32px', gap: 12, flexShrink: 0 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={14} color="white" fill="white" />
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: '#4F46E5' }}>Levl1</span>
        <span style={{ marginLeft: 8, fontSize: 13, color: '#94A3B8' }}>· Agency Setup</span>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px 80px' }}>
        <div style={{ width: '100%', maxWidth: 600 }}>

          {/* Step indicators */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 36 }}>
            {STEPS.map((s, i) => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <StepDot n={s.n} active={step === s.n} done={step > s.n} />
                  <span style={{ fontSize: 11, color: step >= s.n ? '#4F46E5' : '#94A3B8', fontWeight: step === s.n ? 700 : 400, whiteSpace: 'nowrap' }}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ width: 72, height: 2, background: step > s.n ? '#10B981' : '#E2E8F0', margin: '0 8px', marginBottom: 20, transition: 'background 0.3s', flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>

          {/* ── STEP 1: Agency Details ── */}
          {step === 1 && (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '36px 40px', boxShadow: '0 4px 20px rgba(79,70,229,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(79,70,229,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={18} color="#4F46E5" />
                </div>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: '#1E293B', margin: 0 }}>Agency Details</h2>
                  <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>Tell us about your recruitment agency</p>
                </div>
              </div>

              <form onSubmit={saveStep1} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Agency / Company Name *</label>
                    <input required style={INPUT} value={agencyName} onChange={e => setAgencyName(e.target.value)} placeholder="HireEdge Recruitment Pvt Ltd" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Website</label>
                    <input style={INPUT} value={website} onChange={e => setWebsite(e.target.value)} placeholder="www.hireedge.in" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Founded Year</label>
                    <input style={INPUT} type="number" value={foundedYear} onChange={e => setFoundedYear(e.target.value)} placeholder="2018" min="1900" max="2025" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Headquarters City</label>
                    <input style={INPUT} value={hqCity} onChange={e => setHqCity(e.target.value)} placeholder="Bengaluru" />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Team Size</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {TEAM_SIZES.map(ts => (
                      <button key={ts} type="button" onClick={() => setTeamSize(ts)}
                        style={{ padding: '10px 8px', borderRadius: 8, border: `2px solid ${teamSize === ts ? '#4F46E5' : '#E2E8F0'}`, background: teamSize === ts ? 'rgba(79,70,229,0.06)' : '#fff', fontSize: 13, fontWeight: 600, color: teamSize === ts ? '#4F46E5' : '#64748B', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-sans)' }}>
                        {ts}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Primary Service</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {PRIMARY_SERVICES.map(ps => (
                      <button key={ps} type="button" onClick={() => setPrimaryService(ps)}
                        style={{ padding: '10px 16px', borderRadius: 8, border: `2px solid ${primaryService === ps ? '#4F46E5' : '#E2E8F0'}`, background: primaryService === ps ? 'rgba(79,70,229,0.06)' : '#fff', fontSize: 13, fontWeight: 600, color: primaryService === ps ? '#4F46E5' : '#64748B', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', fontFamily: 'var(--font-sans)' }}>
                        {ps}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={saving}
                  style={{ background: saving ? '#94A3B8' : 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#fff', border: 'none', borderRadius: 9, padding: '13px 20px', fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4, boxShadow: saving ? 'none' : '0 4px 14px rgba(124,58,237,0.30)', fontFamily: 'var(--font-sans)' }}>
                  {saving ? 'Saving…' : <><span>Continue</span><ChevronRight size={16} /></>}
                </button>
              </form>
            </div>
          )}

          {/* ── STEP 2: GST & Business Details ── */}
          {step === 2 && (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '36px 40px', boxShadow: '0 4px 20px rgba(79,70,229,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(79,70,229,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={18} color="#4F46E5" />
                </div>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: '#1E293B', margin: 0 }}>GST & Business Details</h2>
                  <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>Required for billing and invoicing</p>
                </div>
              </div>

              <form onSubmit={saveStep2} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 5 }}>GST Number</label>
                    <input style={INPUT} value={gstNumber} onChange={e => setGstNumber(e.target.value.toUpperCase())} placeholder="29AABCU9603R1ZX" maxLength={15} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 5 }}>PAN Number</label>
                    <input style={INPUT} value={panNumber} onChange={e => setPanNumber(e.target.value.toUpperCase())} placeholder="AABCU9603R" maxLength={10} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Legal Entity Name</label>
                    <input style={INPUT} value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="HireEdge Recruitment Pvt Ltd" />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Registered Address</label>
                    <textarea style={{ ...INPUT, minHeight: 72, resize: 'vertical' }} value={regAddress} onChange={e => setRegAddress(e.target.value)} placeholder="Flat/Suite/Building, Street" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 5 }}>City</label>
                    <input style={INPUT} value={city} onChange={e => setCity(e.target.value)} placeholder="Bengaluru" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 5 }}>State</label>
                      <input style={INPUT} value={state} onChange={e => setState(e.target.value)} placeholder="Karnataka" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 5 }}>PIN</label>
                      <input style={INPUT} value={pinCode} onChange={e => setPinCode(e.target.value)} placeholder="560001" maxLength={6} />
                    </div>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 4 }}>
                  <input type="checkbox" checked={sameBilling} onChange={e => setSameBilling(e.target.checked)} style={{ accentColor: '#7C3AED', width: 16, height: 16 }} />
                  <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>Same as business address for billing</span>
                </label>

                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button type="button" onClick={() => setStep(1)}
                    style={{ padding: '12px 20px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                    Back
                  </button>
                  <button type="submit" disabled={saving}
                    style={{ flex: 1, background: saving ? '#94A3B8' : 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#fff', border: 'none', borderRadius: 9, padding: '13px 20px', fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: saving ? 'none' : '0 4px 14px rgba(124,58,237,0.30)', fontFamily: 'var(--font-sans)' }}>
                    {saving ? 'Saving…' : <><span>Continue</span><ChevronRight size={16} /></>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── STEP 3: Team Members ── */}
          {step === 3 && (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '36px 40px', boxShadow: '0 4px 20px rgba(79,70,229,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(79,70,229,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={18} color="#4F46E5" />
                </div>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: '#1E293B', margin: 0 }}>Invite Your Team</h2>
                  <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>Invite your team to Levl1</p>
                </div>
              </div>

              {/* Role legend */}
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: '#64748B', lineHeight: 1.8 }}>
                <strong style={{ color: '#475569' }}>Roles:</strong>{' '}
                <strong>Admin</strong> — full access incl. billing &nbsp;·&nbsp;
                <strong>Recruiter</strong> — create positions, manage candidates &nbsp;·&nbsp;
                <strong>Viewer</strong> — view reports only
              </div>

              {/* Member rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 120px 36px', gap: 8, paddingBottom: 4 }}>
                  {['Name', 'Email', 'Role', ''].map(h => (
                    <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                  ))}
                </div>
                {members.map((m, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 120px 36px', gap: 8, alignItems: 'center' }}>
                    <input style={INPUT} value={m.name} onChange={e => updateMember(i, 'name', e.target.value)} placeholder="Priya Sharma" />
                    <input style={INPUT} type="email" value={m.email} onChange={e => updateMember(i, 'email', e.target.value)} placeholder="priya@agency.in" />
                    <select value={m.role} onChange={e => updateMember(i, 'role', e.target.value as MemberRole)}
                      style={{ ...INPUT, cursor: 'pointer', paddingRight: 8 }}>
                      <option value="recruiter">Recruiter</option>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button type="button" onClick={() => removeMember(i)} disabled={members.length === 1}
                      style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: members.length === 1 ? 'not-allowed' : 'pointer', opacity: members.length === 1 ? 0.4 : 1, flexShrink: 0 }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <button type="button" onClick={addMember}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px dashed #C7D2FE', background: 'rgba(79,70,229,0.04)', color: '#4F46E5', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)', marginBottom: 24 }}>
                <Plus size={14} /> Add another team member
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setStep(2)}
                  style={{ padding: '12px 20px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                  Back
                </button>
                <button type="button" onClick={() => setStep(4)}
                  style={{ padding: '12px 18px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#94A3B8', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                  Skip for now
                </button>
                <button type="button" onClick={saveStep3} disabled={inviting}
                  style={{ flex: 1, background: inviting ? '#94A3B8' : 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#fff', border: 'none', borderRadius: 9, padding: '13px 20px', fontSize: 15, fontWeight: 700, cursor: inviting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: inviting ? 'none' : '0 4px 14px rgba(124,58,237,0.30)', fontFamily: 'var(--font-sans)' }}>
                  {inviting ? 'Sending…' : <><span>Send Invites & Continue</span><ChevronRight size={16} /></>}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Payment Setup ── */}
          {step === 4 && (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '36px 40px', boxShadow: '0 4px 20px rgba(79,70,229,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16,185,129,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={18} color="#10B981" />
                </div>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: '#1E293B', margin: 0 }}>Start Your Free Trial</h2>
                  <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>No payment needed right now</p>
                </div>
              </div>

              {/* Trial perks */}
              <div style={{ background: 'linear-gradient(135deg, rgba(79,70,229,0.04) 0%, rgba(124,58,237,0.04) 100%)', border: '1px solid rgba(79,70,229,0.12)', borderRadius: 12, padding: '20px 24px', marginBottom: 28 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#4F46E5', marginBottom: 12 }}>Trial includes:</div>
                {[
                  '✓  5 AI interviews',
                  '✓  14 days full access',
                  '✓  All features — question generation, reports, approvals',
                ].map(p => (
                  <div key={p} style={{ fontSize: 14, color: '#475569', fontWeight: 500, marginBottom: 8 }}>{p}</div>
                ))}
                <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8, fontSize: 13, color: '#059669', fontWeight: 600 }}>
                  Your trial ends: {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>

              <button onClick={completeOnboarding} disabled={saving}
                style={{ width: '100%', background: saving ? '#94A3B8' : 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#fff', border: 'none', borderRadius: 9, padding: '15px 20px', fontSize: 16, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: saving ? 'none' : '0 4px 14px rgba(124,58,237,0.30)', fontFamily: 'var(--font-sans)' }}>
                {saving ? 'Setting up…' : <><span>Complete Setup & Go to Dashboard</span><ChevronRight size={16} /></>}
              </button>

              <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#94A3B8' }}>
                Want to set up billing now?{' '}
                <button onClick={() => toast('Billing setup available in Settings after dashboard')} style={{ color: '#7C3AED', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-sans)', fontSize: 13, padding: 0 }}>
                  Add payment method
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
