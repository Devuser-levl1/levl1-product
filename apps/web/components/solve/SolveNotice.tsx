'use client'

// ── Solve captured-data notice (Screen-scoped) ─────────────────────────────
// Every statement must stay true to the implementation — see
// lib/screen/solve/notice.ts for the list and SOLVE_NOTICE_VERSION.

const plural = (n: number) => `${n} day${n === 1 ? '' : 's'}`

export function SolveNotice({ orgName, retentionDays, defense, aiAllowed }: { orgName: string; retentionDays: number; defense: boolean; aiAllowed: boolean }) {
  const rows: { what: string; detail: string; why: string }[] = [
    { what: 'Your code', detail: 'What you write in the editor, saved as you go, and the code you submit.', why: `So ${orgName} can review your solution.` },
    { what: 'How you worked', detail: 'A timeline of edits, runs and test results, the size of any paste (never what you copied), and how often you left this tab.', why: 'Shows your process, not just the final answer. Flags are reviewed by a person and never reject you automatically.' },
    ...(defense ? [{ what: 'The follow-up conversation', detail: 'After you submit, a short spoken conversation about your solution. Your speech is turned into text as you talk. No audio is recorded or stored, only the text.', why: 'So you can explain your decisions in your own words.' }] : []),
  ]
  return (
    <div style={{ textAlign: 'left', fontSize: 13, lineHeight: 1.55, color: 'var(--lv-text-body)' }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--lv-text)', marginBottom: 8 }}>What this take-home captures, and why</div>
      <dl style={{ margin: 0, display: 'grid', gap: 8 }}>
        {rows.map((r) => (
          <div key={r.what} style={{ padding: '8px 10px', border: '1px solid var(--lv-border)', borderRadius: 6, background: 'var(--lv-surface)' }}>
            <dt style={{ fontWeight: 600, color: 'var(--lv-text)' }}>{r.what}</dt>
            <dd style={{ margin: '2px 0 0' }}>{r.detail} <span style={{ color: 'var(--lv-text-muted)' }}>Why: {r.why}</span></dd>
          </div>
        ))}
      </dl>
      <ul style={{ listStyle: 'disc', margin: '10px 0 0', paddingLeft: 18, display: 'grid', gap: 4 }}>
        <li><strong>No camera, no photo, no recording.</strong></li>
        <li><strong>Outside help:</strong> {aiAllowed ? 'you may use AI tools and documentation, but you must understand and be able to explain every line you submit.' : 'please work on your own. Documentation and search are fine; AI coding assistants are not.'}</li>
        <li><strong>How it&apos;s stored:</strong> encrypted in transit (HTTPS) and at rest (AES-256). Only {orgName}&apos;s hiring team can access it.</li>
        <li><strong>Who processes it:</strong> Levl1, for {orgName}, with {defense ? 'two service providers: Anthropic (AI evaluation) and ElevenLabs (speech-to-text and the interviewer’s voice)' : 'one service provider: Anthropic (AI evaluation)'}. It is not shared with anyone else and never sold.</li>
        <li><strong>How long it&apos;s kept:</strong> your code, the work timeline{defense ? ' and the conversation text' : ''} are deleted automatically {plural(retentionDays)} after you submit. Your evaluation report stays with your application until {orgName} deletes it.</li>
        <li><strong>Your choices:</strong> you can stop at any time by closing this page. To see or delete your data, contact {orgName}.</li>
      </ul>
    </div>
  )
}
