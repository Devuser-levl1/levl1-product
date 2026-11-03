'use client'

import { useState, useEffect, useCallback } from 'react'
import { Building2, Plus, ExternalLink, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Page, PageHeader, Button, Badge, EmptyState, LoadingBlock, Alert, Modal, ActionBar, Field, Input, Select, type Tone } from '@/components/screen/ui'

// Design-System Pass 3/5: Clients on the Screen design system (presentation only;
// client load/save unchanged). A failed load now shows an error, not "No clients".

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
    <Modal open onClose={onClose} dismissible={!saving} title="Onboard new client" description="Add a new client company to your roster"
      footer={<ActionBar>
        <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" form="onboard-client" loading={saving}>{saving ? 'Saving…' : 'Save Client'}</Button>
      </ActionBar>}>
      <form id="onboard-client" onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 12 }}>
          <Field label="Company Name" required style={{ gridColumn: '1 / -1' }}>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="FinEdge Technologies" autoComplete="organization" />
          </Field>
          <Field label="Industry">
            <Select value={industry} onChange={e => setIndustry(e.target.value)}>
              <option value="">Select…</option>
              {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </Select>
          </Field>
          <Field label="Website">
            <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="finedge.in" />
          </Field>
          <Field label="Primary Contact">
            <Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Vikram Anand" />
          </Field>
          <Field label="Contact Email">
            <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="vikram@finedge.in" />
          </Field>
          <Field label="Contact Phone">
            <Input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+91 98765 43210" />
          </Field>
          <Field label="Client Manager Email (for approvals)" style={{ gridColumn: '1 / -1' }}>
            <Input type="email" value={managerEmail} onChange={e => setManagerEmail(e.target.value)} placeholder="manager@finedge.in" />
          </Field>
          <div style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="client-l2" className="lv-label" style={{ display: 'block', marginBottom: 8 }}>
              L2 Score Threshold <span style={{ fontWeight: 400, color: 'var(--lv-text-muted)' }}>(candidates below this score are flagged)</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input id="client-l2" type="range" min={50} max={95} step={5} value={l2Threshold} onChange={e => setL2Threshold(Number(e.target.value))}
                className="lv-range" style={{ flex: 1 }} />
              <span aria-hidden="true" style={{ fontFamily: 'var(--lv-font-mono)', fontSize: 16, fontWeight: 800, color: 'var(--lv-text)', minWidth: 44 }}>{l2Threshold}</span>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients,  setClients]  = useState<Client[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showModal,setShowModal]= useState(false)
  const [loadError,setLoadError]= useState(false)

  const loadClients = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const res  = await fetch('/api/clients')
      const data = await res.json()
      if (Array.isArray(data)) setClients(data)
      else if (!res.ok) setLoadError(true)
    } catch { setLoadError(true) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadClients() }, [loadClients])

  const STATUS_TONE: Record<string, Tone> = { active: 'success', inactive: 'neutral', paused: 'neutral' }
  const posTone = (st: string): Tone => (st === 'active' || st === 'won' ? 'success' : st === 'lost' ? 'danger' : st === 'pending_approval' ? 'warning' : 'neutral')

  return (
    <>
      {showModal && <OnboardModal onClose={() => setShowModal(false)} onSaved={loadClients} />}

      <Page style={{ maxWidth: 1280 }}>
        <PageHeader title="Clients" description="Manage client companies and their positions."
          actions={<Button leftIcon={<Plus size={16} />} onClick={() => setShowModal(true)}>Onboard Client</Button>} />

        {/* Content */}
        {loading ? (
          <LoadingBlock label="Loading clients…" />
        ) : loadError ? (
          <Alert tone="danger" title="Couldn't load clients"
            action={<Button variant="secondary" size="sm" onClick={loadClients}>Retry</Button>}>
            Check your connection and try again.
          </Alert>
        ) : clients.length === 0 ? (
          <EmptyState icon={<Building2 size={22} />} title="No clients yet"
            description="Onboard your first client company to start managing their positions."
            action={<Button leftIcon={<Plus size={16} />} onClick={() => setShowModal(true)}>Onboard Client</Button>} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {clients.map(client => {
              const posCount = client._count?.positions ?? client.positions?.length ?? 0
              const positions = client.positions ?? []
              const completedInterviews = positions.reduce((acc, p) => acc + (p._count?.interviews ?? 0), 0)

              return (
                <article key={client.id} className="lv-card" aria-label={client.name} style={{ padding: 'clamp(18px, 3vw, 24px) clamp(16px, 3vw, 28px)' }}>
                  {/* Client header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                      <div aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--lv-brand-soft)', border: '1px solid var(--lv-brand-soft-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Building2 size={20} color="var(--lv-brand)" />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--lv-text)', margin: 0 }}>{client.name}</h2>
                        <p style={{ fontSize: 12, color: 'var(--lv-text-muted)', margin: '3px 0 0' }}>
                          {client.industry && <>{client.industry} · </>}
                          Active since {new Date(client.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Badge tone={STATUS_TONE[client.status] ?? 'neutral'}><span style={{ textTransform: 'capitalize' }}>{client.status}</span></Badge>
                      <Badge tone="neutral">{posCount} position{posCount !== 1 ? 's' : ''}</Badge>
                    </div>
                  </div>

                  {/* Positions list */}
                  {positions.length > 0 && (
                    <div style={{ background: 'var(--lv-surface-sunken)', border: '1px solid var(--lv-border)', borderRadius: 10, padding: '8px 8px', marginBottom: 14 }}>
                      <div className="lv-eyebrow" style={{ margin: '4px 8px 6px' }}>Positions</div>
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: 2, listStyle: 'none', margin: 0, padding: 0 }}>
                        {positions.map(p => (
                          <li key={p.id}>
                            <button type="button" className="cl-pos" onClick={() => router.push(`/positions/${p.id}`)}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, minHeight: 36, padding: '0 8px', border: 'none', background: 'none', borderRadius: 6, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--lv-font-sans)' }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-brand-text)', flex: 1 }}>{p.title}</span>
                              <Badge tone={posTone(p.status)}>{p.status.replace('_', ' ')}</Badge>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Stats row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px 20px', marginBottom: 16, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 12, color: 'var(--lv-text-body)' }}>
                      <strong style={{ color: 'var(--lv-text)' }}>{completedInterviews}</strong> completed interviews
                    </div>
                    {client.contactEmail && (
                      <div style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>
                        Contact: <a href={`mailto:${client.contactEmail}`} style={{ color: 'var(--lv-brand-text)' }}>{client.contactEmail}</a>
                      </div>
                    )}
                    {client.l2Threshold && (
                      <div style={{ fontSize: 12, color: 'var(--lv-text-muted)' }}>L2 threshold: <strong style={{ color: 'var(--lv-text-body)' }}>{client.l2Threshold}</strong></div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Button variant="secondary" size="sm" leftIcon={<ExternalLink size={13} />} onClick={() => router.push(`/positions?client=${client.id}`)}>
                      View Positions
                    </Button>
                    <Button variant="secondary" size="sm" leftIcon={<Plus size={13} />}
                      onClick={() => {
                        // Copy client ID to clipboard for linking positions
                        navigator.clipboard?.writeText(client.id)
                        toast('Client ID copied — use when creating a new position')
                      }}>
                      Add Position
                    </Button>
                    {completedInterviews > 0 && (
                      <Button variant="tertiary" size="sm" leftIcon={<AlertCircle size={13} />} onClick={() => toast('Client report view — coming soon')}>
                        View Reports
                      </Button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
        <style>{`.cl-pos:hover { background: var(--lv-surface-muted) !important; } .cl-pos:focus-visible { outline: none; box-shadow: var(--lv-focus-ring); }`}</style>
      </Page>
    </>
  )
}
