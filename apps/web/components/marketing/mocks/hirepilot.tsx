import { T } from '@/components/marketing/tokens'

// Extra code-built UI mockups for the HirePilot audience pages. Static but
// real-looking; the pages wrap them in scroll reveals for motion.

const shell: React.CSSProperties = { background: '#fff', border: '1px solid #E7E9F5', borderRadius: 16, boxShadow: '0 30px 60px -25px rgba(30,27,75,0.25)', overflow: 'hidden' }
const bar: React.CSSProperties = { display: 'flex', gap: 6, padding: '10px 14px', borderBottom: '1px solid #EEF0FA', background: '#FBFBFE' }
const dot = (c: string): React.CSSProperties => ({ width: 9, height: 9, borderRadius: 99, background: c })
function Chrome({ title, children }: { title: string; children: React.ReactNode }) {
  return <div style={shell}><div style={bar}><span style={dot('#FF5F57')} /><span style={dot('#FEBC2E')} /><span style={dot('#28C840')} /><span style={{ marginLeft: 10, fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>{title}</span></div>{children}</div>
}
const pill = (c: string): React.CSSProperties => ({ fontSize: 10, fontWeight: 700, color: c, background: `${c}18`, borderRadius: 6, padding: '2px 8px' })

// 1 — JD writes itself + weighted rubric re-ranking
export function JDRubricMock() {
  const rows = [['System design', 5], ['Distributed systems', 4], ['Go / Rust', 3], ['Kafka', 2]] as const
  return (
    <Chrome title="HirePilot — Job brief + rubric">
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 0 }}>
        <div style={{ padding: 14, borderRight: '1px solid #EEF0FA' }}>
          <div style={{ ...pill(T.violet), display: 'inline-block', marginBottom: 8 }}>✨ AI-generated</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>Senior Backend Engineer</div>
          <div style={{ fontSize: 10.5, color: '#94A3B8', margin: '6px 0 10px' }}>from a nudge: “senior backend, Go, event-driven”</div>
          {['Own delivery of write-heavy services', 'Design for scale & fault tolerance', 'Mentor and raise the bar'].map((l) => (
            <div key={l} style={{ display: 'flex', gap: 7, fontSize: 11, color: '#475569', marginBottom: 5 }}><span style={{ color: T.violet }}>•</span>{l}</div>
          ))}
        </div>
        <div style={{ padding: 14, background: '#FBFBFE' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>Weighted rubric</div>
          {rows.map(([label, w]) => (
            <div key={label} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#334155', marginBottom: 3 }}><span>{label}</span><span style={{ fontWeight: 700, color: T.violet }}>{w}/5</span></div>
              <div style={{ height: 6, background: '#EEF0FA', borderRadius: 4 }}><div style={{ width: `${w * 20}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${T.violet}, ${T.blue})` }} /></div>
            </div>
          ))}
          <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 6 }}>Change a weight → candidates re-rank instantly.</div>
        </div>
      </div>
    </Chrome>
  )
}

// 2 — sourcing: AI search strings + BYOB board posting
export function SourcingMock() {
  const boards: [string, string, string][] = [['Naukri', 'Posted', '#10B981'], ['Indeed', 'Posted', '#10B981'], ['LinkedIn', 'Sourcing', '#4F46E5']]
  return (
    <Chrome title="HirePilot — Sourcing">
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>AI search string · Naukri boolean</div>
        <div style={{ fontFamily: 'monospace', fontSize: 10.5, background: '#0B1020', color: '#C9D1FF', borderRadius: 8, padding: '9px 11px', lineHeight: 1.5, marginBottom: 12 }}>
          (&quot;Go&quot; OR &quot;Golang&quot;) AND (&quot;Kafka&quot; OR &quot;event-driven&quot;) AND (&quot;microservices&quot;) NOT &quot;intern&quot;
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {boards.map(([b, s, c]) => (
            <div key={b} style={{ flex: 1, border: '1px solid #EEF0FA', borderRadius: 9, padding: '9px 10px', background: '#FBFBFE' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{b}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 5 }}><span style={{ width: 7, height: 7, borderRadius: 99, background: c }} /><span style={{ fontSize: 10.5, color: c, fontWeight: 700 }}>{s}</span></div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 8 }}>One click · under your own board accounts (BYOB).</div>
      </div>
    </Chrome>
  )
}

// 3 — submit to client: select → email + Excel summary in their columns
export function SubmitSheetMock() {
  const cols = ['Name', 'Title', 'Exp', 'Score']
  const rows = [['Priya Nair', 'Staff Eng', '9y', '92'], ['Aarav Mehta', 'Backend', '6y', '84'], ['Sara Khan', 'SRE', '7y', '80']]
  return (
    <Chrome title="HirePilot — Send to client">
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ ...pill('#6D28D9') }}>3 selected</span>
          <span style={{ fontSize: 11, color: '#64748B' }}>→ Acme Global · Priya (Hiring Mgr)</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#fff', background: T.violet, borderRadius: 7, padding: '4px 10px' }}>Send</span>
        </div>
        <div style={{ border: '1px solid #EEF0FA', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.5fr 0.5fr', background: '#F1F5F9', fontSize: 10, fontWeight: 800, color: '#475569' }}>
            {cols.map((c) => <div key={c} style={{ padding: '6px 9px' }}>{c}</div>)}
          </div>
          {rows.map((r, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.5fr 0.5fr', fontSize: 11, color: '#334155', borderTop: '1px solid #F1F5F9' }}>
              {r.map((cell, j) => <div key={j} style={{ padding: '6px 9px', fontWeight: j === 3 ? 800 : 400, color: j === 3 ? '#059669' : '#334155' }}>{cell}</div>)}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 8 }}>📎 3 résumés + Candidates.xlsx — in Acme’s own column format.</div>
      </div>
    </Chrome>
  )
}

// 4 — unified inbox (email + WhatsApp)
export function InboxMock() {
  const msgs: [string, string, string, string][] = [
    ['Ravi · ClientCorp', 'CV for your Backend role', 'Email', '#64748B'],
    ['Priya Nair', 'Re: interview — Friday works', 'WhatsApp', '#059669'],
    ['Acme Global', 'New req: Data Engineer (2)', 'Email', '#64748B'],
  ]
  return (
    <Chrome title="HirePilot — Inbox">
      <div style={{ padding: 12 }}>
        {msgs.map(([from, subj, ch, c], i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 11px', borderRadius: 9, border: '1px solid #EEF0FA', marginBottom: 7, background: i === 1 ? '#F5F3FF' : '#fff' }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: c === '#059669' ? '#10B981' : '#6D28D9', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{from}</div>
              <div style={{ fontSize: 11, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subj}</div>
            </div>
            <span style={{ ...pill(c), background: c === '#059669' ? 'rgba(16,185,129,0.12)' : '#F1F5F9' }}>{ch}</span>
          </div>
        ))}
        <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>A WhatsApp job-spec → a draft job, automatically.</div>
      </div>
    </Chrome>
  )
}

// 5 — Lev agent panel proposing an action
export function LevPanelMock() {
  const items = [['Priya Nair', 'Match 92 · Staff Engineer'], ['Aarav Mehta', 'Match 84 · Backend'], ['Sara Khan', 'Match 80 · SRE']]
  return (
    <Chrome title="HirePilot — Lev">
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 800 }}>✦ <span style={{ background: `linear-gradient(90deg,${T.violet},${T.indigo})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Lev</span></span>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>proposing an action · you approve</span>
        </div>
        <div style={{ fontSize: 12, color: '#334155', background: '#F7F8FD', borderRadius: 9, padding: '10px 12px', marginBottom: 10 }}>
          “Find 3 strong candidates for <b>Senior Backend Engineer</b> and add them to the pipeline.”
        </div>
        <div style={{ border: '1px solid #DDD6FE', background: '#FBFAFF', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '8px 11px', borderBottom: '1px solid #EDE9FE', fontSize: 10, fontWeight: 800, color: T.violet, textTransform: 'uppercase', letterSpacing: '.04em' }}>Proposed · add to pipeline</div>
          {items.map(([n, d]) => <div key={n} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 11px', fontSize: 11.5 }}><span style={{ fontWeight: 700, color: '#0F172A' }}>{n}</span><span style={{ color: '#94A3B8' }}>{d}</span></div>)}
          <div style={{ display: 'flex', gap: 8, padding: '9px 11px', borderTop: '1px solid #EDE9FE' }}>
            <span style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#fff', background: T.violet, borderRadius: 8, padding: '7px 0' }}>Approve</span>
            <span style={{ flex: 1, textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#475569', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '7px 0' }}>Cancel</span>
          </div>
        </div>
      </div>
    </Chrome>
  )
}

// 6 — AR ageing + auto-nudge (agency)
export function ARMock() {
  const rows: [string, string, string, string][] = [['Acme Global', '₹4.8L', '12d', '#D97706'], ['Vertex', '₹2.0L', '38d', '#DC2626'], ['Northwind', '₹1.2L', 'current', '#059669']]
  return (
    <Chrome title="HirePilot — Receivables">
      <div style={{ padding: 14 }}>
        {rows.map(([c, amt, age, col]) => (
          <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: '1px solid #F1F5F9' }}>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{c}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#0F172A' }}>{amt}</span>
            <span style={{ ...pill(col), width: 54, textAlign: 'center' }}>{age}</span>
          </div>
        ))}
        <div style={{ marginTop: 10, fontSize: 11, color: '#334155', background: '#F7F8FD', borderRadius: 8, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13 }}>🔔</span> <span><b style={{ background: `linear-gradient(90deg,${T.violet},${T.indigo})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>Lev</b> nudged Vertex — 38 days overdue. Next in 7 days.</span>
        </div>
      </div>
    </Chrome>
  )
}

// 7 — nurture timeline + response chips
export function NurtureMock() {
  const steps: [string, string, string][] = [['15d', 'All good', '#059669'], ['30d', 'All good', '#059669'], ['60d', 'Sent', '#4F46E5'], ['90d', 'Scheduled', '#94A3B8']]
  return (
    <Chrome title="HirePilot — Nurture">
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: 99, background: `linear-gradient(135deg,${T.violet},${T.blue})`, color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>PN</div>
          <div><div style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }}>Priya Nair · placed @ Acme</div><div style={{ fontSize: 10.5, color: '#94A3B8' }}>Post-placement check-ins by Lev</div></div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {steps.map(([d, s, c]) => (
            <div key={d} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ width: 30, height: 30, borderRadius: 99, margin: '0 auto', background: c, color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{d}</div>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: c, marginTop: 5 }}>{s}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 10 }}>Confirms the placement sticks — you get paid at 90 days.</div>
      </div>
    </Chrome>
  )
}

// 8 — team oversight + throughput
export function TeamMock() {
  const team: [string, number, number][] = [['Aisha', 6, 92], ['Rohan', 4, 78], ['Meera', 5, 84]]
  const max = 6
  return (
    <Chrome title="HirePilot — Team oversight">
      <div style={{ padding: 14 }}>
        {team.map(([n, jobs, fill]) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
            <span style={{ width: 52, fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{n}</span>
            <div style={{ flex: 1, height: 8, background: '#EEF0FA', borderRadius: 5 }}><div style={{ width: `${(jobs / max) * 100}%`, height: '100%', borderRadius: 5, background: `linear-gradient(90deg,${T.violet},${T.blue})` }} /></div>
            <span style={{ fontSize: 10.5, color: '#64748B', width: 44 }}>{jobs} jobs</span>
            <span style={{ ...pill('#059669'), width: 40, textAlign: 'center' }}>{fill}%</span>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {[['Placements', '18'], ['Avg TTF', '21d'], ['Stalled', '2']].map(([k, v]) => (
            <div key={k} style={{ flex: 1, background: '#F7F8FD', borderRadius: 8, padding: '8px 10px' }}><div style={{ fontSize: 9.5, color: '#94A3B8' }}>{k}</div><div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{v}</div></div>
          ))}
        </div>
      </div>
    </Chrome>
  )
}

// 9 — enterprise connector diagram (HirePilot ↔ ATS) + security
export function ConnectorMock() {
  return (
    <Chrome title="HirePilot — Connectors">
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, textAlign: 'center', border: `1px solid ${T.violet}33`, background: 'rgba(124,58,237,0.06)', borderRadius: 12, padding: '14px 8px' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.violet }}>HirePilot</div>
            <div style={{ fontSize: 10, color: '#94A3B8' }}>scoring · interviews · pipeline</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: '#94A3B8', fontSize: 10 }}>
            <span style={{ color: T.indigo }}>→ writes back</span>
            <span style={{ color: T.violet }}>← reads in</span>
          </div>
          <div style={{ flex: 1, textAlign: 'center', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 8px' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>Your ATS</div>
            <div style={{ fontSize: 10, color: '#94A3B8' }}>system of record</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
          {['SOC 2 Type II', 'ISO 27001', 'RBAC', 'Encrypted', 'Audit log'].map((b) => (
            <span key={b} style={{ fontSize: 10, fontWeight: 700, color: '#334155', background: '#F1F5F9', border: '1px solid #E7E9F5', borderRadius: 6, padding: '3px 9px' }}>🛡 {b}</span>
          ))}
        </div>
      </div>
    </Chrome>
  )
}
