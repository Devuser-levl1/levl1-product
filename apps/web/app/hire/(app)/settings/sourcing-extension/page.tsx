'use client'
import { useEffect, useState, useCallback } from 'react'

interface KeyRow { id: string; name: string; prefix: string; lastUsedAt: string | null; revokedAt: string | null }

const card: React.CSSProperties = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 22, marginBottom: 16 }
const H: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }
const primary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 10, border: 'none', background: '#6D28D9', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', textDecoration: 'none' }
const codeBox: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px', fontFamily: 'monospace', fontSize: 13, color: '#0F172A' }

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://levl1.io'

export default function SourcingExtensionPage() {
  const [keys, setKeys] = useState<KeyRow[] | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch('/api/hire/api-keys').then((r) => (r.ok ? r.json() : [])).then((d) => setKeys(Array.isArray(d) ? d : [])).catch(() => setKeys([]))
  }, [])
  useEffect(() => { load() }, [load])

  const copy = (id: string, text: string) => navigator.clipboard?.writeText(text).then(() => { setCopied(id); setTimeout(() => setCopied(null), 1500) }).catch(() => {})
  const activeKeys = (keys ?? []).filter((k) => !k.revokedAt)

  const steps = [
    <>Click <strong>Download the extension</strong> above — you&apos;ll get <code>levl1-sourcing-extension.zip</code>.</>,
    <><strong>Unzip</strong> it. You&apos;ll get a folder called <code>levl1-sourcing-extension</code>. Keep it somewhere safe (don&apos;t delete it — Chrome loads it from this folder).</>,
    <>In Chrome, open <code>chrome://extensions</code> (type it in the address bar).</>,
    <>Turn on <strong>Developer mode</strong> (toggle, top-right).</>,
    <>Click <strong>Load unpacked</strong> (top-left) and select the <code>levl1-sourcing-extension</code> folder.</>,
    <>Click the Levl1 icon → the gear (⚙︎) to open <strong>Options</strong>, paste your <strong>API key</strong> and <strong>base URL</strong> (below), and click <strong>Validate &amp; save</strong>. Pick a default job if you like.</>,
    <>You&apos;re set. Open a LinkedIn, Indeed, or Naukri candidate profile, click the Levl1 icon, check the fields, and <strong>Add to Levl1</strong>.</>,
  ]

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Sourcing Extension</h1>
      <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 20px' }}>Capture candidates you&apos;re viewing on a job board straight into Levl1 — scored, de-duplicated, and added to the job. No coding needed; this takes about 2 minutes to set up once.</p>

      {/* Download */}
      <div style={card}>
        <div style={H}>1 · Download</div>
        <a href="/levl1-sourcing-extension.zip" download style={primary}>⬇ Download the extension (.zip)</a>
        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 10 }}>Works in Google Chrome (and Edge). You only download once; we&apos;ll tell you here when there&apos;s an update.</div>
      </div>

      {/* Install steps */}
      <div style={card}>
        <div style={H}>2 · Install in Chrome</div>
        <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {steps.map((s, i) => <li key={i} style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.55 }}>{s}</li>)}
        </ol>
      </div>

      {/* Setup values */}
      <div style={card}>
        <div style={H}>3 · Your setup values</div>

        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#475569', marginBottom: 6 }}>Base URL</div>
        <div style={codeBox}>
          <span style={{ flex: 1 }}>{BASE_URL}</span>
          <button onClick={() => copy('base', BASE_URL)} style={{ fontSize: 12, fontWeight: 700, color: '#6D28D9', background: 'none', border: '1px solid #E2E8F0', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>{copied === 'base' ? 'Copied ✓' : 'Copy'}</button>
        </div>

        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#475569', margin: '16px 0 6px' }}>API key</div>
        {keys === null ? (
          <div style={{ fontSize: 13, color: '#94A3B8' }}>Loading…</div>
        ) : activeKeys.length === 0 ? (
          <div style={{ fontSize: 13, color: '#475569', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: 12 }}>
            You don&apos;t have an API key yet. <a href="/hire/settings/developers" style={{ color: '#6D28D9', fontWeight: 700 }}>Generate one in Settings → Developers →</a><br />
            <span style={{ fontSize: 12, color: '#94A3B8' }}>Copy it when it&apos;s shown (it starts with <code>lvl1_</code>) — it&apos;s only displayed once — then paste it into the extension&apos;s Options.</span>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#475569' }}>
            You have {activeKeys.length} API key{activeKeys.length === 1 ? '' : 's'} (e.g. <code>{activeKeys[0].prefix}…</code>). Paste the full key you saved when you created it into the extension&apos;s Options.
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 6 }}>Lost it? Keys are shown only once — <a href="/hire/settings/developers" style={{ color: '#6D28D9', fontWeight: 700 }}>generate a fresh one in Settings → Developers →</a></div>
          </div>
        )}
      </div>

      {/* Supported boards */}
      <div style={card}>
        <div style={H}>Supported boards</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['LinkedIn', 'Indeed', 'Naukri'].map((b) => (
            <span key={b} style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', background: '#F1F5F9', borderRadius: 100, padding: '6px 14px' }}>✓ {b}</span>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 12, lineHeight: 1.5 }}>
          Open a candidate&apos;s profile on any supported board and click the Levl1 icon. Capture is recruiter-driven — you choose each candidate; nothing is auto-scraped. One key setup covers every board.
        </div>
      </div>
    </div>
  )
}
