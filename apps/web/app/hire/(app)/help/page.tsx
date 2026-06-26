'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { HELP_ARTICLES, HELP_CATEGORIES, searchHelp, type HelpArticle } from '@/lib/hire/help-content'

export default function HelpPage() {
  return (
    <Suspense fallback={<div style={{ color: '#475569' }}>Loading…</div>}>
      <HelpInner />
    </Suspense>
  )
}

function HelpInner() {
  const params = useSearchParams()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  // Contextual deep-link: /hire/help?article=rubric opens that article.
  useEffect(() => {
    const a = params.get('article')
    if (a) { setOpen(a); setTimeout(() => document.getElementById(`help-${a}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60) }
  }, [params])

  const results = useMemo(() => (query.trim() ? searchHelp(query, 20) : null), [query])

  return (
    <div style={{ maxWidth: 820 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Help &amp; guides</h1>
      <div style={{ fontSize: 13.5, color: '#64748B', marginBottom: 16 }}>Short how-tos for every feature. Tip: you can also ask the Ask Levl1 panel &ldquo;how do I…&rdquo;.</div>

      <input
        value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search help — e.g. rubric, accounts receivable, assign recruiter…"
        style={{ width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 14, marginBottom: 18, outline: 'none' }}
      />

      {results ? (
        results.length === 0
          ? <div style={{ color: '#64748B', fontSize: 14 }}>No matches. Try another term, or ask the Ask Levl1 panel.</div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{results.map((a) => <Card key={a.id} a={a} open={open === a.id} onToggle={() => setOpen(open === a.id ? null : a.id)} />)}</div>
      ) : (
        HELP_CATEGORIES.map((cat) => {
          const items = HELP_ARTICLES.filter((a) => a.category === cat)
          if (!items.length) return null
          return (
            <div key={cat} style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{cat}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{items.map((a) => <Card key={a.id} a={a} open={open === a.id} onToggle={() => setOpen(open === a.id ? null : a.id)} />)}</div>
            </div>
          )
        })
      )}
    </div>
  )
}

function Card({ a, open, onToggle }: { a: HelpArticle; open: boolean; onToggle: () => void }) {
  return (
    <div id={`help-${a.id}`} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
      <button onClick={onToggle} style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>{a.title}</div>
          <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 2 }}>{a.what}</div>
        </div>
        <span style={{ color: '#94A3B8', fontSize: 18 }}>{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px' }}>
          <ol style={{ margin: '6px 0 14px', paddingLeft: 20, color: '#334155', fontSize: 13.5, lineHeight: 1.7 }}>
            {a.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
          <Link href={a.screen.href} style={{ display: 'inline-block', fontSize: 13, fontWeight: 700, color: '#6D28D9', textDecoration: 'none', background: 'rgba(109,40,217,0.08)', borderRadius: 8, padding: '7px 12px' }}>
            Go to {a.screen.label} →
          </Link>
        </div>
      )}
    </div>
  )
}
