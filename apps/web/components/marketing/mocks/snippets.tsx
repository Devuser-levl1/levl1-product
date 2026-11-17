import { Frame } from './frame'

// Focused crops of single interview moments, used in the Screen page tabs.
// Illustrative content; text meets AA contrast on its own background.

function Line({ who, children }: { who: 'AI' | 'Candidate'; children: React.ReactNode }) {
  return (
    <p className="text-[12.5px] leading-relaxed text-zinc-700">
      <span className={`mr-2 font-mono text-[10.5px] font-medium ${who === 'AI' ? 'text-indigo-700' : 'text-zinc-900'}`}>{who === 'AI' ? 'AI' : 'CANDIDATE'}</span>{children}
    </p>
  )
}

export function VoiceSnippet() {
  return (
    <Frame title="levl1 · live interview · transcript" label="Live transcript: the AI asks a question, the candidate interrupts to push back, and the AI adapts.">
      <div className="space-y-3 p-5">
        <Line who="AI">How would you keep one tenant’s burst from slowing down everyone else?</Line>
        <Line who="Candidate">Sorry — can I push back on the premise? I’d first check whether the limit should be per tenant or per endpoint.</Line>
        <Line who="AI">Fair point. Take per endpoint — what changes in your design?</Line>
        <p className="font-mono text-[10.5px] text-zinc-600">barge-in handled · question adapted</p>
      </div>
    </Frame>
  )
}

export function CodeSnippet() {
  return (
    <Frame title="levl1 · work sample · ratelimit.ts" label="Coding workspace: the candidate's code and the test results after pressing Run.">
      <div className="bg-zinc-950">
        <pre className="overflow-hidden px-5 py-4 font-mono text-[11.5px] leading-[1.7] text-zinc-200">
<span className="text-zinc-400">{'// token bucket per tenant'}</span>{'\n'}
<span className="text-indigo-300">export function</span>{' allow(tenant: string) {\n'}
{'  const b = buckets.get(tenant) ?? create(tenant)\n'}
{'  b.refill(Date.now())\n'}
{'  '}<span className="text-indigo-300">return</span>{' b.take(1)\n}'}
        </pre>
        <div className="space-y-1 border-t border-white/10 px-5 py-3 font-mono text-[11px] text-zinc-300">
          {['allows within limit', 'blocks after burst', 'refills over time', 'isolates tenants'].map((t) => (
            <p key={t}><span className="mr-2 text-emerald-400">✓</span>{t}</p>
          ))}
          <p className="pt-1 text-zinc-400">4 passed · 0 failed · 38 ms</p>
        </div>
      </div>
    </Frame>
  )
}

export function WhiteboardSnippet() {
  const box = 'rounded-md border border-zinc-300 bg-white px-3 py-2 text-center font-mono text-[11px] text-zinc-800'
  return (
    <Frame title="levl1 · whiteboard" label="Whiteboard: the candidate sketches a client, load balancer, API servers and a shared Redis store.">
      <div className="bg-[#FBFAF7] p-6">
        <div className="flex items-center justify-between gap-2">
          <span className={box}>client</span><span className="text-zinc-400">→</span>
          <span className={box}>load balancer</span><span className="text-zinc-400">→</span>
          <span className={box}>api × 3</span>
        </div>
        <div className="mt-4 flex justify-end pr-6"><span className="text-zinc-400">↓</span></div>
        <div className="mt-2 flex justify-end"><span className={`${box} border-indigo-300`}>redis · token buckets</span></div>
        <p className="mt-5 border-t border-zinc-200 pt-3 text-[12px] leading-relaxed text-zinc-700"><span className="mr-2 font-mono text-[10.5px] font-medium text-indigo-700">AI</span>What happens to the buckets if Redis is unavailable?</p>
      </div>
    </Frame>
  )
}

export function FollowupSnippet() {
  return (
    <Frame title="levl1 · follow-up" label="A follow-up question that quotes the candidate's own earlier answer.">
      <div className="space-y-3 p-5">
        <p className="rounded-md border border-zinc-200 bg-[#FBFAF7] px-3 py-2 text-[12px] italic leading-relaxed text-zinc-700">“…we sharded by tenant id, so hot tenants were isolated.”</p>
        <Line who="AI">You said sharding isolated hot tenants. What happened when one tenant outgrew its shard?</Line>
        <Line who="Candidate">We had to split it — and our routing table wasn’t built for that, so…</Line>
        <p className="font-mono text-[10.5px] text-zinc-600">follow-up grounded in answer at 04:12</p>
      </div>
    </Frame>
  )
}

export function LogisticsSnippet() {
  const rows: [string, string, boolean][] = [
    ['Notice period', '30 days', true], ['Location', 'Bengaluru · open to relocate', true],
    ['Work authorization', 'Yes', true], ['Knockout · on-call rotation', 'Comfortable', true],
  ]
  return (
    <Frame title="levl1 · logistics & must-haves" label="Logistics captured in the interview: notice period, location, work authorization and a knockout question.">
      <div className="divide-y divide-zinc-200 px-5">
        {rows.map(([k, v, ok]) => (
          <div key={k} className="flex items-center gap-3 py-3">
            <span className="flex-1 text-[12px] text-zinc-600">{k}</span>
            <span className="text-[12.5px] font-medium text-zinc-900">{v}</span>
            <span className={`font-mono text-[11px] ${ok ? 'text-emerald-700' : 'text-amber-800'}`}>{ok ? '✓' : '!'}</span>
          </div>
        ))}
      </div>
    </Frame>
  )
}

export function CultureSnippet() {
  const opts = ['Strongly disagree', 'Disagree', 'Somewhat agree', 'Agree', 'Strongly agree']
  return (
    <Frame title="levl1 · culture-fit" label="Culture-fit segment: a statement with a five-point agreement scale, scored separately from technical skill.">
      <div className="p-5">
        <p className="text-[13px] font-medium leading-relaxed text-zinc-900">“I’d rather own a problem end to end than hand off parts of it.”</p>
        <div className="mt-4 grid grid-cols-5 gap-1.5">
          {opts.map((o, i) => (
            <span key={o} className={`rounded-md border px-1 py-2 text-center text-[10px] font-medium leading-tight ${i === 3 ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-zinc-200 text-zinc-700'}`}>{o}</span>
          ))}
        </div>
        <p className="mt-4 font-mono text-[10.5px] text-zinc-600">scored separately from technical depth</p>
      </div>
    </Frame>
  )
}
