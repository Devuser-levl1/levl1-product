'use client'

import { useState, useEffect, useCallback } from 'react'
import { Building2, Plus, ExternalLink, X, AlertCircle, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Client {
  id: string
  name: string
  industry?: string
  website?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  managerEmail?: string
  l2Threshold: number
  status: string
  createdAt: string
  _count?: { positions: number }
  positions?: Array<{
    id: string
    title: string
    status: string
    _count?: { candidates: number; interviews: number }
  }>
}

const INDUSTRIES = [
  'Fintech', 'GRC / Risk', 'Data & Analytics', 'Product / SaaS',
  'Healthcare', 'E-commerce', 'Manufacturing', 'BFSI',
  'IT Services', 'Consulting', 'Other',
]

const INPUT: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: '1px solid #E2E8F0', fontSize: 14, fontFamily: 'var(--font-sans)',
  outline: 'none', boxSizing: 'border-box', background: '#F8FAFC',
  transition: 'border-color 0.15s',
}

function OnboardModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name,         setName]         = useState('')
  const [industry,     setIndustry]     = useState('')
  const [website,      setWebsite]      = useState('')
  const [contactName,  setContactName]  = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [managerEmail, setManagerEmail] = useState('')
  const [l2Threshold,  setL2Threshold]  = useState(75)
  const [saving,       setSaving]       = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Company name is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, industry, website, contactName, contactEmail, contactPhone, managerEmail, l2Threshold }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Client onboarded successfully')
      onSaved()
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save client')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#4F46E5', fontFamily: 'var(--font-display)', margin: 0 }}>Onboard New Client</h2>
            <p style={{ fontSize: 13, color: '#94A3B8', margin: '4px 0 0' }}>Add a new client company to your roster</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4, display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Company Name *</label>
              <input required style={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="FinEdge Technologies" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Industry</label>
              <select value={industry} onChange={e => setIndustry(e.target.value)} style={{ ...INPUT, cursor: 'pointer' }}>
                <option value="">Select…</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Website</label>
              <input style={INPUT} value={website} onChange={e => setWebsite(e.target.value)} placeholder="finedge.in" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Primary Contact</label>
              <input style={INPUT} value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Vikram Anand" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Contact Email</label>
              <input type="email" style={INPUT} value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="vikram@finedge.in" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Contact Phone</label>
              <input type="tel" style={INPUT} value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 5 }}>Client Manager Email (for approvals)</label>
              <input type="email" style={INPUT} value={managerEmail} onChange={e => setManagerEmail(e.target.value)} placeholder="manager@finedge.in" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                L2 Score Threshold &nbsp;<span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 400 }}>(candidates below this score are flagged)</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="range" min={50} max={95} step={5} value={l2Threshold} onChange={e => setL2Threshold(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#7C3AED', cursor: 'pointer' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 800, color: '#4F46E5', minWidth: 44 }}>{l2Threshold}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '11px 20px', borderRadius: 9, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 1, background: saving ? '#94A3B8' : 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#fff', border: 'none', borderRadius: 9, padding: '11px 20px', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-sans)', boxShadow: saving ? 'none' : '0 4px 12px rgba(124,58,237,0.25)' }}>
              {saving ? 'Saving…' : 'Save Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients,  setClients]  = useState<Client[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showModal,setShowModal]= useState(false)

  const loadClients = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/clients')
      const data = await res.json()
      if (Array.isArray(data)) setClients(data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadClients() }, [loadClients])

  const STATUS_BADGE: Record<string, string> = {
    active:   'badge-success',
    inactive: 'badge-muted',
    paused:   'badge-muted',
  }

  return (
    <>
      {showModal && <OnboardModal onClose={() => setShowModal(false)} onSaved={loadClients} />}

      <div style={{ padding: '36px 40px', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1280 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: '#4F46E5', letterSpacing: '-0.025em' }}>
              Clients
            </h1>
            <p style={{ fontSize: 14, color: '#94A3B8', marginTop: 6, fontWeight: 500 }}>
              Manage client companies and their positions.
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            Onboard Client
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Loader2 size={28} color="#7C3AED" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: '#94A3B8', fontSize: 14 }}>Loading clients…</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '80px 40px' }}>
            <Building2 size={40} color="#CBD5E1" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#475569', marginBottom: 8 }}>No clients yet</h3>
            <p style={{ fontSize: 14, color: '#94A3B8', marginBottom: 24 }}>Onboard your first client company to start managing their positions.</p>
            <button className="btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> Onboard Client</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {clients.map(client => {
              const posCount = client._count?.positions ?? client.positions?.length ?? 0
              const positions = client.positions ?? []
              const completedInterviews = positions.reduce((acc, p) => acc + (p._count?.interviews ?? 0), 0)

              return (
                <div key={client.id} className="card" style={{ padding: '24px 28px' }}>
                  {/* Client header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Building2 size={20} color="#4F46E5" />
                      </div>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E293B', margin: 0 }}>{client.name}</h3>
                        <p style={{ fontSize: 12, color: '#94A3B8', margin: '3px 0 0' }}>
                          {client.industry && <>{client.industry} · </>}
                          Active since {new Date(client.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className={`badge ${STATUS_BADGE[client.status] ?? 'badge-muted'}`} style={{ textTransform: 'capitalize' }}>{client.status}</span>
                      <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600, background: '#F1F5F9', padding: '3px 10px', borderRadius: 100 }}>
                        {posCount} position{posCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Positions list */}
                  {positions.length > 0 && (
                    <div style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Positions</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {positions.map(p => (
                          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                            onClick={() => router.push(`/positions/${p.id}`)}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#4F46E5', flex: 1 }}>{p.title}</span>
                            <span className={`badge ${p.status === 'active' ? 'badge-success' : p.status === 'pending_approval' ? 'badge-warning' : 'badge-muted'}`} style={{ fontSize: 10 }}>
                              {p.status.replace('_', ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stats row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: '#64748B' }}>
                      <strong style={{ color: '#4F46E5' }}>{completedInterviews}</strong> completed interviews
                    </div>
                    {client.contactEmail && (
                      <div style={{ fontSize: 12, color: '#94A3B8' }}>
                        Contact: <a href={`mailto:${client.contactEmail}`} style={{ color: '#7C3AED', textDecoration: 'none' }}>{client.contactEmail}</a>
                      </div>
                    )}
                    {client.l2Threshold && (
                      <div style={{ fontSize: 12, color: '#94A3B8' }}>L2 threshold: <strong style={{ color: '#475569' }}>{client.l2Threshold}</strong></div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => router.push(`/positions?client=${client.id}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#4F46E5', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                      <ExternalLink size={11} /> View Positions
                    </button>
                    <button
                      onClick={() => {
                        // Copy client ID to clipboard for linking positions
                        navigator.clipboard?.writeText(client.id)
                        toast('Client ID copied — use when creating a new position')
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(79,70,229,0.2)', background: 'rgba(79,70,229,0.04)', color: '#7C3AED', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                      <Plus size={11} /> Add Position
                    </button>
                    {completedInterviews > 0 && (
                      <button
                        onClick={() => toast('Client report view — coming soon')}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                        <AlertCircle size={11} /> View Reports
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
