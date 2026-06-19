import { T } from '@/components/marketing/tokens'

const shell: React.CSSProperties = { background: '#fff', border: '1px solid #E7E9F5', borderRadius: 16, boxShadow: '0 30px 60px -25px rgba(30,27,75,0.25)', overflow: 'hidden' }
const bar: React.CSSProperties = { display: 'flex', gap: 6, padding: '10px 14px', borderBottom: '1px solid #EEF0FA', background: '#FBFBFE' }
const dot = (c: string): React.CSSProperties => ({ width: 9, height: 9, borderRadius: 99, background: c })
function Chrome({ title, children }: { title: string; children: React.ReactNode }) {
  return <div style={shell}><div style={bar}><span style={dot('#FF5F57')} /><span style={dot('#FEBC2E')} /><span style={dot('#28C840')} /><span style={{ marginLeft: 10, fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>{title}</span></div>{children}</div>
}
function scoreColor(s: number) { return s >= 80 ? '#10B981' : s >= 60 ? '#F59E0B' : '#EF4444' }

export function KanbanMock() {
  const cols: [string, { n: string; r: string; s: number; src: string }[]][] = [
    ['Sourced', [{ n: 'Aarav Mehta', r: 'Backend Engineer', s: 78, src: 'LinkedIn' }, { n: 'Lucia Romano', r: 'Data Scientist', s: 71, src: 'Referral' }]],
    ['Screening', [{ n: 'Daniel Cho', r: 'Platform Lead', s: 84, src: 'Naukri' }, { n: 'Sara Khan', r: 'SRE', s: 66, src: 'Direct' }]],
    ['Interview', [{ n: 'Priya Nair', r: 'Staff Engineer', s: 91, src: 'LinkedIn' }]],
    ['Offer', [{ n: 'Tom Becker', r: 'Eng Manager', s: 88, src: 'Referral' }]],
  ]
  return (
    <Chrome title="Levl1 Hire — Pipeline">
      <div style={{ display: 'flex', gap: 10, padding: 14, background: '#F7F8FD', overflowX: 'auto' }}>
        {cols.map(([name, cards], ci) => (
          <div key={name} style={{ minWidth: 150, flex: 1, background: '#fff', border: '1px solid #EEF0FA', borderRadius: 10, padding: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}><span style={{ fontSize: 10, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.04em' }}>{name}</span><span style={{ fontSize: 10, color: '#94A3B8' }}>{cards.length}</span></div>
            {cards.map((c, i) => (
              <div key={i} style={{ background: ci === 2 && i === 0 ? '#fff' : '#FBFBFE', border: '1px solid #EEF0FA', borderRadius: 8, padding: 9, marginBottom: 7, transform: ci === 2 && i === 0 ? 'rotate(-2deg)' : 'none', boxShadow: ci === 2 && i === 0 ? '0 12px 24px -8px rgba(79,70,229,0.4)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{c.n}</span><span style={{ fontSize: 10, fontWeight: 800, color: scoreColor(c.s), background: `${scoreColor(c.s)}18`, borderRadius: 5, padding: '1px 5px' }}>{c.s}</span></div>
                <div style={{ fontSize: 10.5, color: '#94A3B8', margin: '2px 0 6px' }}>{c.r}</div>
                <span style={{ fontSize: 9, color: '#64748B', background: '#F1F5F9', borderRadius: 4, padding: '1px 6px' }}>{c.src}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Chrome>
  )
}

export function ScorecardMock() {
  const sections = [['Technical', 90], ['Problem-solving', 84], ['Behavioral', 86], ['EQ', 88]] as const
  const r = 34, c = 2 * Math.PI * r, score = 87
  return (
    <Chrome title="Levl1 Interviews — Report">
      <div style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{ position: 'relative', width: 84, height: 84 }}>
            <svg width="84" height="84" style={{ transform: 'rotate(-90deg)' }}><circle cx="42" cy="42" r={r} fill="none" stroke="#EEF0FA" strokeWidth="8" /><circle cx="42" cy="42" r={r} fill="none" stroke={T.indigo} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} /></svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 22, fontWeight: 800, color: T.indigo }}>{score}</span><span style={{ fontSize: 9, color: '#94A3B8' }}>/100</span></div>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>Priya Nair</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>Staff Engineer · 18-min AI interview</div>
            <div style={{ display: 'inline-flex', gap: 6, marginTop: 6 }}><span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: 'rgba(16,185,129,0.1)', borderRadius: 5, padding: '2px 8px' }}>Strong Yes</span><span style={{ fontSize: 10, fontWeight: 700, color: '#4F46E5', background: 'rgba(79,70,229,0.1)', borderRadius: 5, padding: '2px 8px' }}>Identity verified ✓</span></div>
          </div>
        </div>
        {sections.map(([label, v]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ width: 96, fontSize: 11, color: '#475569' }}>{label}</span>
            <div style={{ flex: 1, height: 7, background: '#EEF0FA', borderRadius: 4, overflow: 'hidden' }}><div style={{ width: `${v}%`, height: '100%', background: `linear-gradient(90deg, ${T.indigo}, ${T.sky})` }} /></div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#334155', width: 22 }}>{v}</span>
          </div>
        ))}
        <div style={{ marginTop: 12, fontSize: 11, color: '#475569', background: '#F7F8FD', borderLeft: `3px solid ${T.indigo}`, borderRadius: 6, padding: '8px 10px', fontStyle: 'italic' }}>&ldquo;Walked through sharding a write-heavy service and the trade-offs clearly.&rdquo; → Technical 90</div>
      </div>
    </Chrome>
  )
}

export function InterviewRoomMock() {
  return (
    <Chrome title="Levl1 Interviews — Live room">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', minHeight: 190 }}>
        <div style={{ padding: 14, borderRight: '1px solid #EEF0FA' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>Question 3 / 8 · Technical</div>
          <div style={{ fontSize: 13, color: '#0F172A', margin: '8px 0 14px', lineHeight: 1.5 }}>Design a rate limiter for a multi-tenant API. How do you keep it fair under burst load?</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 36 }}>{[8, 18, 30, 14, 24, 34, 12, 26, 16, 30, 10, 22, 28, 14].map((h, i) => <div key={i} style={{ flex: 1, height: h, background: T.indigo, borderRadius: 2, opacity: 0.85 }} />)}</div>
          <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 6 }}>● Candidate speaking…</div>
        </div>
        <div style={{ background: '#0B1020', padding: 14, fontFamily: 'monospace', fontSize: 11, color: '#C9D1FF' }}>
          <div style={{ color: '#7C83A8' }}>{'// token bucket per tenant'}</div>
          <div><span style={{ color: '#C792EA' }}>function</span> <span style={{ color: '#82AAFF' }}>allow</span>(tenant) {'{'}</div>
          <div>&nbsp;&nbsp;<span style={{ color: '#C792EA' }}>const</span> b = buckets.get(tenant)</div>
          <div>&nbsp;&nbsp;b.refill(now())</div>
          <div>&nbsp;&nbsp;<span style={{ color: '#C792EA' }}>return</span> b.take(<span style={{ color: '#F78C6C' }}>1</span>)</div>
          <div>{'}'}</div>
        </div>
      </div>
    </Chrome>
  )
}

export function ApprovalMock() {
  const qs = ['System design — caching strategy', 'Behavioral — conflict resolution', 'Scenario — incident response', 'EQ — feedback handling']
  return (
    <Chrome title="Levl1 Interviews — Question approval">
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}><div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>Tech Lead + HR review</div>
          <div style={{ marginLeft: 'auto', display: 'flex' }}>{['#7C3AED', '#4F46E5'].map((c, i) => <div key={i} style={{ width: 24, height: 24, borderRadius: 99, background: c, color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: -6, border: '2px solid #fff' }}>{i ? 'HR' : 'TL'}</div>)}</div>
        </div>
        {qs.map((q, i) => (
          <div key={q} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: '1px solid #EEF0FA' }}>
            <span style={{ width: 18, height: 18, borderRadius: 99, background: i < 3 ? '#10B981' : '#EEF0FA', color: i < 3 ? '#fff' : '#94A3B8', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i < 3 ? '✓' : '·'}</span>
            <span style={{ flex: 1, fontSize: 12, color: '#334155' }}>{q}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: i < 3 ? '#059669' : '#94A3B8' }}>{i < 3 ? 'Approved' : 'Pending'}</span>
          </div>
        ))}
      </div>
    </Chrome>
  )
}

export function VerificationMock() {
  return (
    <Chrome title="Levl1 Interviews — Integrity">
      <div style={{ padding: 16 }}>
        {[['Email OTP', 'verified'], ['Photo capture', 'verified'], ['Live presence', 'verified']].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}><span style={{ width: 18, height: 18, borderRadius: 99, background: '#10B981', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span><span style={{ flex: 1, fontSize: 12, color: '#334155' }}>{k}</span><span style={{ fontSize: 10, color: '#059669', fontWeight: 700 }}>{v}</span></div>
        ))}
        <div style={{ marginTop: 12, padding: 12, background: '#F7F8FD', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#10B981' }}>96</div>
          <div><div style={{ fontSize: 11, fontWeight: 700, color: '#0F172A' }}>Integrity score</div><div style={{ fontSize: 10, color: '#D97706' }}>⚠ 1 tab switch noted · not auto-rejected</div></div>
        </div>
      </div>
    </Chrome>
  )
}

export function DealPipelineMock() {
  const cols: [string, { c: string; v: string }[]][] = [['Discovery', [{ c: 'Northwind', v: '$24k' }]], ['Proposal', [{ c: 'Acme Global', v: '$48k' }]], ['Negotiation', [{ c: 'Vertex', v: '$72k' }]]]
  return (
    <Chrome title="Levl1 Hire — CRM deals">
      <div style={{ display: 'flex', gap: 10, padding: 14, background: '#F7F8FD' }}>
        {cols.map(([name, deals]) => (
          <div key={name} style={{ flex: 1, background: '#fff', border: '1px solid #EEF0FA', borderRadius: 10, padding: 9 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>{name}</div>
            {deals.map((d) => <div key={d.c} style={{ background: '#FBFBFE', border: '1px solid #EEF0FA', borderRadius: 8, padding: 9 }}><div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{d.c}</div><div style={{ fontSize: 13, fontWeight: 800, color: T.violet, marginTop: 3 }}>{d.v}</div></div>)}
          </div>
        ))}
      </div>
    </Chrome>
  )
}

export function ApplyFormMock() {
  return (
    <Chrome title="apply.levl1.io">
      <div style={{ padding: 18 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: `linear-gradient(135deg, ${T.violet}, ${T.blue})`, marginBottom: 10 }} />
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Staff Engineer</div>
        <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 14 }}>Acme Global · Remote</div>
        {['Full name', 'Email', 'LinkedIn URL'].map((p) => <div key={p} style={{ height: 30, borderRadius: 8, border: '1px solid #E7E9F5', background: '#FBFBFE', marginBottom: 8, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 11, color: '#94A3B8' }}>{p}</div>)}
        <div style={{ height: 56, borderRadius: 8, border: '1px dashed #CBD5E1', background: '#FBFBFE', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#94A3B8' }}>Drop résumé (PDF) · instant AI score</div>
        <div style={{ height: 36, borderRadius: 8, background: `linear-gradient(120deg, ${T.violet}, ${T.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>Submit application</div>
      </div>
    </Chrome>
  )
}

export function CandidateProfileMock() {
  return (
    <Chrome title="Levl1 Hire — Candidate">
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 99, background: `linear-gradient(135deg,${T.violet},${T.blue})`, color: '#fff', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>AM</div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Aarav Mehta</div><div style={{ fontSize: 11, color: '#94A3B8' }}>Backend Engineer · 6 yrs</div></div>
          <div style={{ fontSize: 16, fontWeight: 800, color: scoreColor(84) }}>84<span style={{ fontSize: 9, color: '#94A3B8' }}> résumé</span></div>
        </div>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>Skills matched</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>{['Node.js', 'PostgreSQL', 'AWS', 'Go'].map((s) => <span key={s} style={{ fontSize: 10, color: T.violet, background: 'rgba(124,58,237,0.1)', borderRadius: 5, padding: '2px 7px' }}>{s}</span>)}<span style={{ fontSize: 10, color: '#94A3B8', background: '#F1F5F9', borderRadius: 5, padding: '2px 7px' }}>Missing: Kafka</span></div>
        <div style={{ fontSize: 11.5, color: '#475569', background: '#F7F8FD', borderRadius: 8, padding: '8px 10px', marginBottom: 10, lineHeight: 1.5 }}>Strong backend depth with cloud-native experience; light on streaming systems.</div>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>Activity</div>
        {[['Imported via LinkedIn', '2d'], ['AI scored 84 / 100', '2d'], ['Moved to Screening', '1d']].map(([a, t]) => <div key={a} style={{ display: 'flex', fontSize: 11, color: '#64748B', padding: '3px 0' }}><span style={{ flex: 1 }}>• {a}</span><span style={{ color: '#CBD5E1' }}>{t}</span></div>)}
      </div>
    </Chrome>
  )
}

export function IntegrationCardMock() {
  return (
    <Chrome title="Levl1 Hire — Pipeline card">
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Priya Nair</div>
        <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 12 }}>Staff Engineer · Interview stage</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.violet, background: 'rgba(124,58,237,0.1)', borderRadius: 6, padding: '4px 10px' }}>Résumé score · 84</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.indigo, background: 'rgba(79,70,229,0.1)', borderRadius: 6, padding: '4px 10px' }}>AI interview · 87 · Strong Yes</span>
        </div>
        <div style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 6, background: '#F7F8FD', borderRadius: 8, padding: '8px 10px' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: 'rgba(16,185,129,0.12)', borderRadius: 5, padding: '1px 6px' }}>optional</span>
          Triggered from this card · the score flows back when you connect the products.
        </div>
      </div>
    </Chrome>
  )
}
