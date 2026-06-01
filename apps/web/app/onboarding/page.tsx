'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Building2, Users, Briefcase, ChevronRight, SkipForward } from 'lucide-react'
import toast from 'react-hot-toast'

type TeamSize = 'solo' | '2-5' | '6-20' | '20+'
type UseCase  = 'agency' | 'inhouse'

const TEAM_SIZES: { value: TeamSize; label: string }[] = [
  { value: 'solo',  label: 'Just me'  },
  { value: '2-5',   label: '2 – 5'    },
  { value: '6-20',  label: '6 – 20'   },
  { value: '20+',   label: '20+'      },
]

const USE_CASES: { value: UseCase; label: string; sub: string }[] = [
  { value: 'agency',  label: 'Recruiting agency',    sub: 'Multiple clients, high volume'     },
  { value: 'inhouse', label: 'In-house hiring team', sub: 'One company, internal hiring'      },
]

const INPUT: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: '1px solid #E2E8F0', fontSize: 14, fontFamily: 'var(--font-sans)',
  outline: 'none', boxSizing: 'border-box', background: '#F8FAFC',
}

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: done ? '#10B981' : active ? '#4F46E5' : '#E2E8F0',
      color: done || active ? '#fff' : '#94A3B8',
      fontSize: 12, fontWeight: 700, flexShrink: 0, transition: 'all 0.2s',
    }}>
      {done ? '✓' : n}
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  // Step 1 state
  const [agencyName, setAgencyName] = useState('')
  const [website,    setWebsite]    = useState('')
  const [teamSize,   setTeamSize]   = useState<TeamSize | ''>('')
  const [useCase,    setUseCase]    = useState<UseCase | ''>('')

  // Step 2 state
  const [posTitle,     setPosTitle]     = useState('')
  const [posTechStack, setPosTechStack] = useState('')
  const [posExp,       setPosExp]       = useState('5–8 years')
  const [creatingPos,  setCreatingPos]  = useState(false)

  // Step 3 state
  const [teamEmails, setTeamEmails] = useState('')

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault()
    if (!teamSize || !useCase) { toast.error('Please complete all fields'); return }
    setStep(2)
  }

  async function handleCreatePosition(e: React.FormEvent) {
    e.preventDefault()
    if (!posTitle) { toast.error('Position title is required'); return }
    setCreatingPos(true)
    try {
      await fetch('/api/positions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          title:           posTitle,
          techStack:       posTechStack.split(',').map(s => s.trim()).filter(Boolean),
          experienceLevel: posExp,
          status:          'draft',
          company:         agencyName || 'My Company',
        }),
      })
      toast.success('Position created!')
    } catch {
      toast.error('Could not create position — you can add it later')
    } finally {
      setCreatingPos(false)
      setStep(3)
    }
  }

  function handleFinish() {
    toast.success('Setup complete! Welcome to Levl1 🎉')
    router.push('/dashboard')
  }

  const steps = [
    { n: 1, label: 'Agency setup'         },
    { n: 2, label: 'First position'       },
    { n: 3, label: 'Invite team'          },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F8F9FF', fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <header style={{ height: 60, background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', padding: '0 32px', gap: 12 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={14} color="white" fill="white" />
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: '#4F46E5' }}>Levl1</span>
        <span style={{ marginLeft: 12, fontSize: 13, color: '#94A3B8' }}>Getting started</span>
      </header>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
        <div style={{ width: '100%', maxWidth: 560 }}>
          {/* Step indicators */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 36 }}>
            {steps.map((s, i) => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <StepDot n={s.n} active={step === s.n} done={step > s.n} />
                  <span style={{ fontSize: 11, color: step >= s.n ? '#4F46E5' : '#94A3B8', fontWeight: step === s.n ? 700 : 400, whiteSpace: 'nowrap' }}>{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ width: 80, height: 2, background: step > s.n ? '#10B981' : '#E2E8F0', margin: '0 8px', marginBottom: 20, transition: 'background 0.3s', flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>

          {/* ── STEP 1: Agency setup ── */}
          {step === 1 && (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '36px 40px', boxShadow: '0 4px 20px rgba(79,70,229,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(79,70,229,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={18} color="#4F46E5" />
                </div>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: '#1E293B', margin: 0 }}>Set up your agency</h2>
                  <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>Tell us a bit about your organisation</p>
                </div>
              </div>

              <form onSubmit={handleStep1} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Agency name *</label>
                  <input style={INPUT} value={agencyName} onChange={e => setAgencyName(e.target.value)} placeholder="HireEdge Recruitment" required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Website</label>
                  <input style={INPUT} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://hireedge.in" type="url" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Team size</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {TEAM_SIZES.map(ts => (
                      <button key={ts.value} type="button" onClick={() => setTeamSize(ts.value)}
                        style={{ padding: '10px 8px', borderRadius: 8, border: `2px solid ${teamSize === ts.value ? '#4F46E5' : '#E2E8F0'}`, background: teamSize === ts.value ? 'rgba(79,70,229,0.06)' : '#fff', fontSize: 13, fontWeight: 600, color: teamSize === ts.value ? '#4F46E5' : '#64748B', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-sans)' }}>
                        {ts.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Primary use</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {USE_CASES.map(uc => (
                      <button key={uc.value} type="button" onClick={() => setUseCase(uc.value)}
                        style={{ padding: '12px 16px', borderRadius: 8, border: `2px solid ${useCase === uc.value ? '#4F46E5' : '#E2E8F0'}`, background: useCase === uc.value ? 'rgba(79,70,229,0.06)' : '#fff', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-sans)' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: useCase === uc.value ? '#4F46E5' : '#1E293B' }}>{uc.label}</div>
                        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{uc.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit"
                  style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#fff', border: 'none', borderRadius: 9, padding: '13px 20px', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(124,58,237,0.30)' }}>
                  Continue <ChevronRight size={16} />
                </button>
              </form>
            </div>
          )}

          {/* ── STEP 2: First position ── */}
          {step === 2 && (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '36px 40px', boxShadow: '0 4px 20px rgba(79,70,229,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(79,70,229,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Briefcase size={18} color="#4F46E5" />
                </div>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: '#1E293B', margin: 0 }}>Create your first position</h2>
                  <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>This will be the role you interview candidates for</p>
                </div>
              </div>

              <form onSubmit={handleCreatePosition} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Position title *</label>
                  <input required style={INPUT} value={posTitle} onChange={e => setPosTitle(e.target.value)} placeholder="Senior Data Engineer" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Tech stack (comma separated)</label>
                  <input style={INPUT} value={posTechStack} onChange={e => setPosTechStack(e.target.value)} placeholder="Python, Spark, Kafka, AWS" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Experience level</label>
                  <select value={posExp} onChange={e => setPosExp(e.target.value)} style={{ ...INPUT, cursor: 'pointer' }}>
                    {['0–2 years','3–5 years','5–8 years','8–12 years','12–18 years','18+ years'].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button type="submit" disabled={creatingPos}
                    style={{ flex: 1, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#fff', border: 'none', borderRadius: 9, padding: '12px 20px', fontSize: 14, fontWeight: 700, cursor: creatingPos ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {creatingPos ? 'Creating…' : <><span>Create Position</span><ChevronRight size={15} /></>}
                  </button>
                  <button type="button" onClick={() => setStep(3)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F1F5F9', border: 'none', borderRadius: 9, padding: '12px 18px', fontSize: 14, fontWeight: 600, color: '#64748B', cursor: 'pointer' }}>
                    <SkipForward size={14} /> Skip
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── STEP 3: Invite team ── */}
          {step === 3 && (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '36px 40px', boxShadow: '0 4px 20px rgba(79,70,229,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(79,70,229,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={18} color="#4F46E5" />
                </div>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: '#1E293B', margin: 0 }}>Invite your team</h2>
                  <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>Optional — you can do this later from Settings</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Team email addresses (one per line)</label>
                  <textarea
                    style={{ ...INPUT, minHeight: 100, resize: 'vertical' }}
                    value={teamEmails}
                    onChange={e => setTeamEmails(e.target.value)}
                    placeholder={'alice@hireedge.in\nbob@hireedge.in'}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={handleFinish}
                    style={{ flex: 1, background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#fff', border: 'none', borderRadius: 9, padding: '13px 20px', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(124,58,237,0.30)' }}>
                    {teamEmails.trim() ? <><span>Send Invites & Finish</span><ChevronRight size={16} /></> : <><span>Go to Dashboard</span><ChevronRight size={16} /></>}
                  </button>
                  {teamEmails.trim() ? null : (
                    <button onClick={handleFinish} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F1F5F9', border: 'none', borderRadius: 9, padding: '12px 18px', fontSize: 14, fontWeight: 600, color: '#64748B', cursor: 'pointer' }}>
                      <SkipForward size={14} /> Skip
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
