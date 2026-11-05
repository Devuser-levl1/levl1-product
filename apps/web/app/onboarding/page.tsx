'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, FileText, Users, CreditCard, Plus, Trash2, ChevronRight, Briefcase, Check } from 'lucide-react'
import { ACCOUNT_TYPES, type AccountType } from '@/lib/screen/account-type'
import { VOICE_OPTIONS, DEFAULT_VOICE_KEY } from '@/lib/voiceOptions'
import { Play, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { ScreenLogo } from '@/components/screen/brand/ScreenLogo'


const TEAM_SIZES = ['1-5', '6-20', '21-50', '50+']

type MemberRole = 'admin' | 'recruiter' | 'viewer'
interface TeamMemberRow { name: string; email: string; role: MemberRole }

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: done ? 'var(--lv-success)' : active ? 'var(--lv-brand)' : 'var(--lv-border)',
      color: done || active ? 'var(--lv-on-brand)' : 'var(--lv-text-muted)',
      fontSize: 12, fontWeight: 600, flexShrink: 0, transition: 'all 0.2s',
    }}>
      {done ? '✓' : n}
    </div>
  )
}

const STEPS = [
  { n: 1, label: 'Organization',    icon: Building2  },
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
  const [accountType,   setAccountType]   = useState<AccountType | null>(null)
  // Default interviewer voice for the account (changeable later in Settings).
  const [voiceKey,      setVoiceKey]      = useState<string>(DEFAULT_VOICE_KEY)
  const [previewing,    setPreviewing]    = useState<string | null>(null)
  async function previewVoice(key: string) {
    const v = VOICE_OPTIONS.find(o => o.key === key)
    if (!v || previewing) return
    setPreviewing(key)
    try {
      const res = await fetch('/api/interview/generate-speech', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ voiceAccent: key, text: `Hi, I'm ${v.interviewerName}, your AI interviewer. Let's get started whenever you're ready.` }) })
      if (!res.ok || !(res.headers.get('Content-Type') || '').includes('audio')) throw new Error()
      const url = URL.createObjectURL(await res.blob())
      const audio = new Audio(url)
      audio.onended = () => { URL.revokeObjectURL(url); setPreviewing(null) }
      audio.onerror = () => { URL.revokeObjectURL(url); setPreviewing(null) }
      await audio.play()
    } catch { toast.error('Preview unavailable right now'); setPreviewing(null) }
  }
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
    if (!accountType) { toast.error('Please choose agency or company'); return }
    if (!teamSize) { toast.error('Please select your team size'); return }
    setSaving(true)
    try {
      await fetch('/api/agency/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 1, agencyName, website, foundedYear: foundedYear ? parseInt(foundedYear) : undefined, teamSize, accountType, voiceAccent: voiceKey, city: hqCity }),
      })
      setStep(2)
    } catch { toast.error('Couldn\'t save. Please try again.') }
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
    } catch { toast.error('Couldn\'t save. Please try again.') }
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
      toast.success('Setup complete. Welcome to Levl1.')
      router.push('/dashboard')
    } catch {
      toast.error('Couldn\'t save — continuing anyway.')
      router.push('/dashboard')
    }
    finally { setSaving(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--lv-bg)', fontFamily: 'var(--lv-font-sans)', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <header style={{ height: 60, background: 'var(--lv-surface)', borderBottom: '1px solid var(--lv-border)', display: 'flex', alignItems: 'center', padding: '0 clamp(16px, 4vw, 32px)', gap: 12, flexShrink: 0 }}>
        <ScreenLogo height={30} tone="auto" />
        <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--lv-text-muted)' }}>· Account Setup</span>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px 80px' }}>
        <div style={{ width: '100%', maxWidth: 600 }}>

          {/* Step indicators */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 36 }}>
            {STEPS.map((s, i) => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <StepDot n={s.n} active={step === s.n} done={step > s.n} /><span className="lv-sr-only">{`Step ${s.n} of ${STEPS.length}${step === s.n ? ' (current)' : step > s.n ? ' (done)' : ''}: `}</span>
                  <span className="ob-step-label" style={{ fontSize: 11, color: step >= s.n ? 'var(--lv-brand-text)' : 'var(--lv-text-muted)', fontWeight: step === s.n ? 600 : 400, whiteSpace: 'nowrap' }}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div aria-hidden="true" style={{ width: 'clamp(12px, 6vw, 72px)', height: 2, background: step > s.n ? 'var(--lv-success)' : 'var(--lv-border)', margin: '0 8px', marginBottom: 20, transition: 'background 0.3s', flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>

          {/* ── STEP 1: Agency Details ── */}
          {step === 1 && (
            <div style={{ background: 'var(--lv-surface)', border: '1px solid var(--lv-border)', borderRadius: 8, padding: 'clamp(20px, 5vw, 36px) clamp(16px, 5vw, 40px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                <div style={{ width: 40, height: 40, borderRadius: 6, background: 'color-mix(in srgb, var(--lv-brand) 8%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={16} />
                </div>
                <div>
                  <h2 style={{ fontFamily: 'var(--lv-font-display)', fontSize: 18, fontWeight: 600, color: 'var(--lv-text)', margin: 0 }}>{accountType === 'company' ? 'Company Details' : accountType === 'agency' ? 'Agency Details' : 'About your organization'}</h2>
                  <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', margin: 0 }}>{accountType === 'company' ? 'Tell us about your company' : accountType === 'agency' ? 'Tell us about your recruitment agency' : 'First — how do you hire?'}</p>
                </div>
              </div>

              <form onSubmit={saveStep1} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Account type — drives which fields job setup shows later */}
                <div>
                  <div className="lv-label" style={{ display: 'block', marginBottom: 8 }}>How do you hire? *</div>
                  <div role="radiogroup" aria-label="Account type" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                    {ACCOUNT_TYPES.map(t => {
                      const on = accountType === t.value
                      const Icon = t.value === 'agency' ? Briefcase : Building2
                      return (
                        <button key={t.value} type="button" role="radio" aria-checked={on} onClick={() => setAccountType(t.value)}
                          style={{ display: 'flex', gap: 12, alignItems: 'flex-start', textAlign: 'left', padding: '14px 16px', borderRadius: 8, border: `2px solid ${on ? 'var(--lv-brand)' : 'var(--lv-border)'}`, background: on ? 'color-mix(in srgb, var(--lv-brand) 6%, transparent)' : 'var(--lv-surface)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--lv-font-sans)' }}>
                          <span style={{ width: 32, height: 32, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? 'var(--lv-brand)' : 'color-mix(in srgb, var(--lv-brand) 8%, transparent)' }}>
                            <Icon size={16} color={on ? 'var(--lv-on-brand)' : 'var(--lv-brand)'} />
                          </span>
                          <span>
                            <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: on ? 'var(--lv-brand)' : 'var(--lv-text)' }}>{t.label}</span>
                            <span style={{ display: 'block', fontSize: 12, color: 'var(--lv-text-muted)', marginTop: 2, lineHeight: 1.4 }}>{t.desc}</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 16 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor="ob-f1" className="lv-label" style={{ display: 'block', marginBottom: 5 }}>{accountType === 'company' ? 'Company Name *' : accountType === 'agency' ? 'Agency Name *' : 'Agency / Company Name *'}</label>
                    <input id="ob-f1" required className="lv-input" value={agencyName} onChange={e => setAgencyName(e.target.value)} placeholder={accountType === 'company' ? 'FinEdge Technologies Pvt Ltd' : 'HireEdge Recruitment Pvt Ltd'} />
                  </div>
                  <div>
                    <label htmlFor="ob-f2" className="lv-label" style={{ display: 'block', marginBottom: 5 }}>Website</label>
                    <input id="ob-f2" className="lv-input" value={website} onChange={e => setWebsite(e.target.value)} placeholder="www.hireedge.in" />
                  </div>
                  <div>
                    <label htmlFor="ob-f3" className="lv-label" style={{ display: 'block', marginBottom: 5 }}>Founded Year</label>
                    <input id="ob-f3" className="lv-input" type="number" value={foundedYear} onChange={e => setFoundedYear(e.target.value)} placeholder="2018" min="1900" max="2025" />
                  </div>
                  <div>
                    <label htmlFor="ob-f4" className="lv-label" style={{ display: 'block', marginBottom: 5 }}>Headquarters City</label>
                    <input id="ob-f4" className="lv-input" value={hqCity} onChange={e => setHqCity(e.target.value)} placeholder="Bengaluru" />
                  </div>
                </div>

                <div>
                  <div className="lv-label" style={{ display: 'block', marginBottom: 8 }}>Team Size</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {TEAM_SIZES.map(ts => (
                      <button key={ts} type="button" aria-pressed={teamSize === ts} onClick={() => setTeamSize(ts)}
                        style={{ padding: '10px 8px', borderRadius: 8, border: `2px solid ${teamSize === ts ? 'var(--lv-brand)' : 'var(--lv-border)'}`, background: teamSize === ts ? 'color-mix(in srgb, var(--lv-brand) 6%, transparent)' : 'var(--lv-surface)', fontSize: 13, fontWeight: 600, color: teamSize === ts ? 'var(--lv-brand)' : 'var(--lv-text-muted)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--lv-font-sans)' }}>
                        {ts}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Default interviewer voice — candidates hear this voice (and name) */}
                <div>
                  <div className="lv-label" style={{ display: 'block', marginBottom: 4 }}>Interviewer voice</div>
                  <p style={{ fontSize: 12, color: 'var(--lv-text-muted)', margin: '0 0 8px' }}>The voice your candidates hear. You can change it any time in Settings.</p>
                  <div role="radiogroup" aria-label="Interviewer voice" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {VOICE_OPTIONS.map(v => {
                      const on = voiceKey === v.key
                      return (
                        <div key={v.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 6, border: `2px solid ${on ? 'var(--lv-brand)' : 'var(--lv-border)'}`, background: on ? 'color-mix(in srgb, var(--lv-brand) 5%, transparent)' : 'var(--lv-surface)' }}>
                          <button type="button" role="radio" aria-checked={on} onClick={() => setVoiceKey(v.key)}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'var(--lv-font-sans)' }}>
                                                        <span>
                              <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: on ? 'var(--lv-brand)' : 'var(--lv-text)' }}>{v.interviewerName} · {v.accent}{v.key === DEFAULT_VOICE_KEY ? ' (default)' : ''}</span>
                              <span style={{ display: 'block', fontSize: 12, color: 'var(--lv-text-muted)' }}>{v.description}</span>
                            </span>
                          </button>
                          <button type="button" onClick={() => previewVoice(v.key)} aria-label={`Preview ${v.interviewerName}`} disabled={!!previewing}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--lv-border)', background: 'var(--lv-surface)', fontSize: 12, fontWeight: 600, color: 'var(--lv-brand)', cursor: previewing ? 'default' : 'pointer' }}>
                            {previewing === v.key ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={12} />} Preview
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <button type="submit" disabled={saving}
                  className="lv-btn lv-btn--primary" style={{ height: 48, fontSize: 16 }}>
                  {saving ? 'Saving…' : <><span>Continue</span><ChevronRight size={16} /></>}
                </button>
              </form>
            </div>
          )}

          {/* ── STEP 2: GST & Business Details ── */}
          {step === 2 && (
            <div style={{ background: 'var(--lv-surface)', border: '1px solid var(--lv-border)', borderRadius: 8, padding: 'clamp(20px, 5vw, 36px) clamp(16px, 5vw, 40px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                <div style={{ width: 40, height: 40, borderRadius: 6, background: 'color-mix(in srgb, var(--lv-brand) 8%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={16} />
                </div>
                <div>
                  <h2 style={{ fontFamily: 'var(--lv-font-display)', fontSize: 18, fontWeight: 600, color: 'var(--lv-text)', margin: 0 }}>GST & Business Details</h2>
                  <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', margin: 0 }}>Required for billing and invoicing</p>
                </div>
              </div>

              <form onSubmit={saveStep2} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label htmlFor="ob-f5" className="lv-label" style={{ display: 'block', marginBottom: 5 }}>GST Number</label>
                    <input id="ob-f5" className="lv-input" value={gstNumber} onChange={e => setGstNumber(e.target.value.toUpperCase())} placeholder="29AABCU9603R1ZX" maxLength={15} />
                  </div>
                  <div>
                    <label htmlFor="ob-f6" className="lv-label" style={{ display: 'block', marginBottom: 5 }}>PAN Number</label>
                    <input id="ob-f6" className="lv-input" value={panNumber} onChange={e => setPanNumber(e.target.value.toUpperCase())} placeholder="AABCU9603R" maxLength={10} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor="ob-f7" className="lv-label" style={{ display: 'block', marginBottom: 5 }}>Legal Entity Name</label>
                    <input id="ob-f7" className="lv-input" value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="HireEdge Recruitment Pvt Ltd" />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor="ob-f8" className="lv-label" style={{ display: 'block', marginBottom: 5 }}>Registered Address</label>
                    <textarea id="ob-f8" className="lv-textarea" style={{ minHeight: 72, resize: 'vertical' }} value={regAddress} onChange={e => setRegAddress(e.target.value)} placeholder="Flat/Suite/Building, Street" />
                  </div>
                  <div>
                    <label htmlFor="ob-f9" className="lv-label" style={{ display: 'block', marginBottom: 5 }}>City</label>
                    <input id="ob-f9" className="lv-input" value={city} onChange={e => setCity(e.target.value)} placeholder="Bengaluru" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label htmlFor="ob-f10" className="lv-label" style={{ display: 'block', marginBottom: 5 }}>State</label>
                      <input id="ob-f10" className="lv-input" value={state} onChange={e => setState(e.target.value)} placeholder="Karnataka" />
                    </div>
                    <div>
                      <label htmlFor="ob-f11" className="lv-label" style={{ display: 'block', marginBottom: 5 }}>PIN</label>
                      <input id="ob-f11" className="lv-input" value={pinCode} onChange={e => setPinCode(e.target.value)} placeholder="560001" maxLength={6} />
                    </div>
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 4 }}>
                  <input type="checkbox" checked={sameBilling} onChange={e => setSameBilling(e.target.checked)} style={{ accentColor: 'var(--lv-brand)', width: 18, height: 18 }} />
                  <span style={{ fontSize: 13, color: 'var(--lv-text-body)', fontWeight: 500 }}>Same as business address for billing</span>
                </label>

                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button type="button" onClick={() => setStep(1)}
                    className="lv-btn lv-btn--secondary" style={{ height: 48 }}>
                    Back
                  </button>
                  <button type="submit" disabled={saving}
                    className="lv-btn lv-btn--primary" style={{ flex: 1, height: 48, fontSize: 16 }}>
                    {saving ? 'Saving…' : <><span>Continue</span><ChevronRight size={16} /></>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── STEP 3: Team Members ── */}
          {step === 3 && (
            <div style={{ background: 'var(--lv-surface)', border: '1px solid var(--lv-border)', borderRadius: 8, padding: 'clamp(20px, 5vw, 36px) clamp(16px, 5vw, 40px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 6, background: 'color-mix(in srgb, var(--lv-brand) 8%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={16} />
                </div>
                <div>
                  <h2 style={{ fontFamily: 'var(--lv-font-display)', fontSize: 18, fontWeight: 600, color: 'var(--lv-text)', margin: 0 }}>Invite Your Team</h2>
                  <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', margin: 0 }}>Invite your team to Levl1</p>
                </div>
              </div>

              {/* Role legend */}
              <div style={{ background: 'var(--lv-surface-sunken)', border: '1px solid var(--lv-border)', borderRadius: 6, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: 'var(--lv-text-muted)', lineHeight: 1.8 }}>
                <strong style={{ color: 'var(--lv-text-body)' }}>Roles:</strong>{' '}
                <strong>Admin</strong> — full access incl. billing &nbsp;·&nbsp;
                <strong>Recruiter</strong> — create positions, manage candidates &nbsp;·&nbsp;
                <strong>Viewer</strong> — view reports only
              </div>

              {/* Member rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.3fr) minmax(96px, 120px) 40px', gap: 8, paddingBottom: 4 }}>
                  {['Name', 'Email', 'Role', ''].map(h => (
                    <div key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--lv-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
                  ))}
                </div>
                {members.map((m, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.3fr) minmax(96px, 120px) 40px', gap: 8, alignItems: 'center' }}>
                    <input className="lv-input" aria-label={`Team member ${i + 1} name`} value={m.name} onChange={e => updateMember(i, 'name', e.target.value)} placeholder="Priya Sharma" />
                    <input className="lv-input" aria-label={`Team member ${i + 1} email`} type="email" value={m.email} onChange={e => updateMember(i, 'email', e.target.value)} placeholder="priya@agency.in" />
                    <select value={m.role} onChange={e => updateMember(i, 'role', e.target.value as MemberRole)}
                      className="lv-select" aria-label={`Team member ${i + 1} role`}>
                      <option value="recruiter">Recruiter</option>
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button type="button" onClick={() => removeMember(i)} disabled={members.length === 1}
                      className="lv-btn lv-btn--ghost lv-btn--icon" aria-label={`Remove team member ${i + 1}`}>
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>

              <button type="button" onClick={addMember}
                className="lv-btn lv-btn--secondary lv-btn--sm" style={{ borderStyle: 'dashed', marginBottom: 24 }}>
                <Plus size={14} aria-hidden="true" /> Add another team member
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setStep(2)}
                  className="lv-btn lv-btn--secondary" style={{ height: 48 }}>
                  Back
                </button>
                <button type="button" onClick={() => setStep(4)}
                  className="lv-btn lv-btn--tertiary" style={{ height: 48 }}>
                  Skip for now
                </button>
                <button type="button" onClick={saveStep3} disabled={inviting}
                  className="lv-btn lv-btn--primary" style={{ flex: 1, height: 48, fontSize: 16 }}>
                  {inviting ? 'Sending…' : <><span>Send Invites & Continue</span><ChevronRight size={16} /></>}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Payment Setup ── */}
          {step === 4 && (
            <div style={{ background: 'var(--lv-surface)', border: '1px solid var(--lv-border)', borderRadius: 8, padding: 'clamp(20px, 5vw, 36px) clamp(16px, 5vw, 40px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                <div style={{ width: 40, height: 40, borderRadius: 6, background: 'color-mix(in srgb, var(--lv-success) 8%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CreditCard size={16} color="var(--lv-success)" />
                </div>
                <div>
                  <h2 style={{ fontFamily: 'var(--lv-font-display)', fontSize: 18, fontWeight: 600, color: 'var(--lv-text)', margin: 0 }}>Start Your Free Trial</h2>
                  <p style={{ fontSize: 13, color: 'var(--lv-text-muted)', margin: 0 }}>No payment needed right now</p>
                </div>
              </div>

              {/* Trial perks */}
              <div style={{ background: 'var(--lv-surface-sunken)', border: '1px solid var(--lv-border)', borderRadius: 8, padding: '20px 24px', marginBottom: 28 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text)', marginBottom: 12 }}>Trial includes</div>
                {[
                  '5 AI interviews',
                  '14 days full access',
                  'All features — question generation, reports, approvals',
                ].map(p => (
                  <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--lv-text-body)', fontWeight: 500, marginBottom: 8 }}><Check size={14} aria-hidden="true" style={{ color: 'var(--lv-text-muted)', flexShrink: 0 }} />{p}</div>
                ))}
                <div style={{ marginTop: 16, padding: '10px 14px', background: 'color-mix(in srgb, var(--lv-success) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--lv-success) 15%, transparent)', borderRadius: 8, fontSize: 13, color: 'var(--lv-success)', fontWeight: 600 }}>
                  Your trial ends: {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>

              <button onClick={completeOnboarding} disabled={saving}
                className="lv-btn lv-btn--primary" style={{ width: '100%', height: 48, fontSize: 16 }}>
                {saving ? 'Setting up…' : <><span>Complete Setup & Go to Dashboard</span><ChevronRight size={16} /></>}
              </button>

              <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--lv-text-muted)' }}>
                Want to set up billing now?{' '}
                <button type="button" className="lv-btn lv-btn--tertiary lv-btn--sm" onClick={() => toast('Billing setup available in Settings after dashboard')}>
                  Add payment method
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
      <style>{`@media (max-width: 480px) { .ob-step-label { display: none; } }`}</style>
    </div>
  )
}
