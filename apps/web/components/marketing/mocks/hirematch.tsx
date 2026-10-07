import { Frame } from './frame'

// Recreated HireMatch view: rubric-weighted score with the reasons and gaps
// shown next to it. Names and numbers are illustrative.
export function HireMatchMock() {
  const rows: [string, number, number, string][] = [
    ['Distributed systems', 5, 92, 'Led sharding of a write-heavy service'],
    ['Go', 4, 85, '4 yrs Go in production microservices'],
    ['Event streaming', 3, 55, 'Some RabbitMQ; no Kafka in production'],
    ['Mentoring', 2, 80, 'Ran onboarding for two new hires'],
  ]
  return (
    <Frame title="HirePilot — HireMatch" label="HireMatch: a match score built from rubric weights, with the reason for each skill score and the gaps called out.">
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-50 to-blue-50 text-xl font-extrabold text-mk-purple">81</div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-extrabold text-mk-ink">Meera Iyer</p>
            <p className="text-[11px] text-slate-500">vs. Senior Backend Engineer · weighted rubric</p>
          </div>
          <span className="rounded-md bg-violet-50 px-2 py-1 text-[10px] font-bold text-mk-purple">Verify in interview</span>
        </div>
        <div className="mt-4 space-y-2.5">
          {rows.map(([skill, w, s, why]) => (
            <div key={skill} className="rounded-xl border border-[#EEF0FA] bg-[#FBFBFE] p-2.5">
              <div className="flex items-center gap-2">
                <span className="flex-1 text-[11.5px] font-semibold text-slate-700">{skill}</span>
                <span className="rounded bg-white px-1.5 text-[10px] font-bold text-slate-500">×{w}</span>
                <span className={`w-7 text-right text-[11.5px] font-bold ${s >= 70 ? 'text-emerald-700' : 'text-amber-700'}`}>{s}</span>
              </div>
              <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500">{why}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[10.5px] font-medium text-amber-800">Gap to probe: production event streaming</p>
      </div>
    </Frame>
  )
}
