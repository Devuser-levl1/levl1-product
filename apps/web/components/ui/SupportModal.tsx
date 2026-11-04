'use client'

import { useState } from 'react'
import { X, LifeBuoy, Paperclip } from 'lucide-react'
import toast from 'react-hot-toast'

interface SupportModalProps {
  open:    boolean
  onClose: () => void
  /** Pre-fill the reporter's email (e.g. the signed-in user). Defaults to empty. */
  defaultEmail?: string
}

const ISSUE_TYPES = [
  'Bug / Something broken',
  'Feature request',
  'Question / How to',
  'Interview quality issue',
  'Billing',
]

const INPUT_STYLE: React.CSSProperties = {
  width:        '100%',
  padding:      '10px 12px',
  border:       '1px solid var(--lv-border)',
  borderRadius: 8,
  fontSize:     13,
  color:        'var(--lv-brand)',
  fontFamily:   'var(--font-sans)',
  background:   'var(--lv-surface-sunken)',
  outline:      'none',
  boxSizing:    'border-box',
  transition:   'border-color 0.15s',
}

export function SupportModal({ open, onClose, defaultEmail = '' }: SupportModalProps) {
  const [issueType,    setIssueType]    = useState('')
  const [subject,      setSubject]      = useState('')
  const [description,  setDescription]  = useState('')
  const [userEmail,    setUserEmail]    = useState(defaultEmail)
  const [fileName,     setFileName]     = useState('')
  const [sending,      setSending]      = useState(false)

  if (!open) return null

  const reset = () => {
    setIssueType('')
    setSubject('')
    setDescription('')
    setFileName('')
  }

  const handleClose = () => { reset(); onClose() }

  const handleSubmit = async () => {
    if (!issueType || !subject || !description || !userEmail) {
      toast.error('Please fill in all required fields.')
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/support', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ issueType, subject, description, userEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Unknown error')
      toast.success(`Ticket #${data.ticketNumber} submitted. We'll respond within 24 hours.`)
      handleClose()
    } catch {
      toast.error('Failed to submit ticket. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,15,26,0.55)',
          zIndex: 850,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position:      'fixed',
          top:           '50%',
          left:          '50%',
          transform:     'translate(-50%,-50%)',
          zIndex:        851,
          background:    'var(--lv-surface)',
          borderRadius:  8,
          boxShadow:     '0 16px 60px color-mix(in srgb, var(--lv-brand) 18%, transparent)',
          width:         '100%',
          maxWidth:      480,
          maxHeight:     '90vh',
          overflowY:     'auto',
          animation:     'modal-in 0.18s cubic-bezier(0.34,1.22,0.64,1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            background:   'linear-gradient(135deg, var(--lv-brand) 0%, var(--lv-accent) 100%)',
            padding:      '18px 22px 16px',
            display:      'flex',
            alignItems:   'center',
            gap:          12,
            borderRadius: '14px 14px 0 0',
            flexShrink:   0,
          }}
        >
          <div
            style={{
              width: 34, height: 34, borderRadius: 6,
              background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <LifeBuoy size={16} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', fontFamily: 'var(--lv-font-sans)' }}>
              Submit a Support Ticket
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
              We respond within 24 hours
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'rgba(255,255,255,0.12)', border: 'none',
              borderRadius: 6, padding: 6, cursor: 'pointer',
              color: 'rgba(255,255,255,0.75)', display: 'flex',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.22)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Issue type */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-text-body)', display: 'block', marginBottom: 8 }}>
              Issue Type <span style={{ color: 'var(--lv-danger)' }}>*</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ISSUE_TYPES.map((type) => (
                <label
                  key={type}
                  style={{
                    display:     'flex',
                    alignItems:  'center',
                    gap:         10,
                    cursor:      'pointer',
                    padding:     '8px 10px',
                    borderRadius: 8,
                    border:      `1px solid ${issueType === type ? 'color-mix(in srgb, var(--lv-accent) 30%, transparent)' : 'var(--lv-border)'}`,
                    background:  issueType === type ? 'color-mix(in srgb, var(--lv-accent) 6%, transparent)' : 'var(--lv-surface-sunken)',
                    transition:  'all 0.12s',
                  }}
                >
                  <input
                    type="radio"
                    name="issueType"
                    value={type}
                    checked={issueType === type}
                    onChange={() => setIssueType(type)}
                    style={{ accentColor: 'var(--lv-accent)', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 13, color: issueType === type ? 'var(--lv-accent)' : 'var(--lv-text-body)', fontWeight: issueType === type ? 600 : 400 }}>
                    {type}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-text-body)', display: 'block', marginBottom: 6 }}>
              Subject <span style={{ color: 'var(--lv-danger)' }}>*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of the issue"
              style={INPUT_STYLE}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--lv-accent)' }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--lv-border)' }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-text-body)', display: 'block', marginBottom: 6 }}>
              Description <span style={{ color: 'var(--lv-danger)' }}>*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail. Include steps to reproduce if reporting a bug."
              rows={4}
              style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: 90 }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--lv-accent)' }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--lv-border)' }}
            />
          </div>

          {/* Screenshot */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-text-body)', display: 'block', marginBottom: 6 }}>
              Attach screenshot <span style={{ color: 'var(--lv-text-muted)', fontWeight: 400 }}>(optional)</span>
            </label>
            <label
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          8,
                padding:      '9px 12px',
                border:       '1px dashed var(--lv-border-strong)',
                borderRadius: 8,
                background:   'var(--lv-surface-sunken)',
                cursor:       'pointer',
                fontSize:     13,
                color:        'var(--lv-text-muted)',
                transition:   'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--lv-accent)'; e.currentTarget.style.color = 'var(--lv-accent)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--lv-border-strong)'; e.currentTarget.style.color = 'var(--lv-text-muted)' }}
            >
              <Paperclip size={14} />
              {fileName || 'Choose file…'}
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
              />
            </label>
          </div>

          {/* Email */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--lv-text-body)', display: 'block', marginBottom: 6 }}>
              Your email <span style={{ color: 'var(--lv-danger)' }}>*</span>
            </label>
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              style={INPUT_STYLE}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--lv-accent)' }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--lv-border)' }}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={sending}
            style={{
              width:        '100%',
              padding:      '12px 0',
              background:   'linear-gradient(135deg, var(--lv-brand) 0%, var(--lv-accent) 100%)',
              border:       'none',
              borderRadius: 6,
              color:        '#fff',
              fontSize:     14,
              fontWeight:   600,
              cursor:       sending ? 'wait' : 'pointer',
              fontFamily:   'var(--font-sans)',
              boxShadow:    '0 2px 10px color-mix(in srgb, var(--lv-accent) 28%, transparent)',
              transition:   'box-shadow 0.15s',
              marginTop:    4,
            }}
            onMouseEnter={(e) => { if (!sending) e.currentTarget.style.boxShadow = '0 4px 18px color-mix(in srgb, var(--lv-accent) 42%, transparent)' }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 10px color-mix(in srgb, var(--lv-accent) 28%, transparent)' }}
          >
            {sending ? 'Submitting…' : 'Submit Ticket'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: translate(-50%,-50%) scale(0.94); }
          to   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
        }
      `}</style>
    </>
  )
}
