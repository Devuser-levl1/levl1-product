import { Frame } from './frame'

// Recreated Solve UI for the marketing site (illustrative content, light
// tokens, AA contrast). Mirrors the real candidate workspace and report.

export function SolveWorkspaceMock() {
  return (
    <Frame title="levl1 · solve · take-home" label="Solve take-home workspace: the task, a countdown, the code editor with test results, and the built-in AI assistant with an exchange the candidate inserted and then edited.">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2">
        <span className="text-[12px] font-semibold text-zinc-900">Cart pricing with promo codes</span>
        <span className="font-mono text-[11px] font-medium text-zinc-800">52:14 left</span>
      </div>
      <div className="grid sm:grid-cols-[1fr_1.2fr]">
        <div className="space-y-2 border-b border-zinc-200 p-4 sm:border-b-0 sm:border-r">
          <p className="font-mono text-[10px] font-medium text-indigo-700">AI ASSISTANT · A3</p>
          <p className="rounded-md bg-indigo-50 px-2.5 py-1.5 text-[11.5px] leading-snug text-zinc-800">Does stacking a percentage and a fixed promo apply in a fixed order?</p>
          <p className="rounded-md bg-zinc-100 px-2.5 py-1.5 text-[11.5px] leading-snug text-zinc-700">Apply the percentage first, then the fixed amount, and clamp at zero…</p>
          <p className="font-mono text-[10px] text-zinc-600">inserted A3.1 · edited 2 of 5 lines</p>
        </div>
        <div className="bg-zinc-950">
          <pre className="mk-code whitespace-pre-wrap break-words px-4 py-3 font-mono text-[10.5px] leading-[1.7] text-zinc-200 sm:text-[11px]">
<span className="text-indigo-300">def</span>{' price(cart, promos):\n'}
{'    total = subtotal(cart)\n'}
{'    for p in ordered(promos):\n'}
{'        total = p.apply(total)\n'}
{'    '}<span className="text-indigo-300">return</span>{' max(0, round(total, 2))'}
          </pre>
          <div className="border-t border-white/10 px-4 py-2.5 font-mono text-[10.5px] text-zinc-300">
            <p><span className="mr-2 text-emerald-400">✓</span>stacked promos</p>
            <p><span className="mr-2 text-emerald-400">✓</span>never below zero</p>
            <p className="pt-1 text-zinc-400">7 of 8 passing · 6 hidden</p>
          </div>
        </div>
      </div>
    </Frame>
  )
}

export function SolveReportMock() {
  const axes: [string, number][] = [['Correctness', 88], ['Approach', 82], ['Defense', 86], ['AI fluency', 84]]
  return (
    <Frame title="levl1 · solve report" label="Solve report: a recommendation first, scores for correctness, approach, defense and AI fluency, the defense interview, and how the candidate used AI.">
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-zinc-600">Recommendation</p>
            <p className="text-[14px] font-semibold text-zinc-900">Yes · 84</p>
          </div>
          <p className="text-right text-[10.5px] text-zinc-600">Hidden tests 5/6<br />Defense completed</p>
        </div>
        <div className="mt-4 space-y-2.5">
          {axes.map(([d, v]) => (
            <div key={d} className="flex items-center gap-3">
              <span className="w-24 flex-none text-[11.5px] font-medium text-zinc-800">{d}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${v}%` }} /></div>
              <span className="w-6 text-right text-[11.5px] font-medium text-zinc-800">{v}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-md border border-zinc-200 bg-[#FBFAF7] px-3 py-2 text-[11.5px] leading-relaxed text-zinc-700">
          <span className="mr-2 font-mono text-[10px] font-medium text-indigo-700">AI</span>You took A3’s suggestion and then changed the rounding. Why?
        </p>
        <p className="mt-2 text-[10.5px] leading-snug text-zinc-600">Caught the AI’s rounding bug from a failing test (M5) and explained the fix in the defense (D4).</p>
      </div>
    </Frame>
  )
}
