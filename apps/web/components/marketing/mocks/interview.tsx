import { Frame } from './frame'

// Recreated previews of Interview (Stage 3) — a product IN DEVELOPMENT. These
// are illustrative design previews (light tokens, AA contrast), not
// screenshots of a shipped product; the page captions them as such.

function Tick({ ok }: { ok: boolean }) {
  return ok
    ? <span className="flex h-4 w-4 flex-none items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white">✓</span>
    : <span className="h-4 w-4 flex-none rounded-full border-[1.5px] border-dashed border-amber-600" />
}

/** The room: interviewer + candidate video, and the copilot panel beside them. */
export function InterviewCopilotMock() {
  const coverage: [string, boolean][] = [['System design', true], ['Data modeling', true], ['Concurrency', false], ['Communication', true]]
  return (
    <Frame title="levl1 · interview · copilot" label="Interview room preview: the interviewer and candidate on video, and an AI copilot panel with a suggested follow-up, rubric coverage with concurrency not yet assessed, and an identity check that matches the Screen stage.">
      <div className="grid gap-3 bg-zinc-50 p-3 sm:grid-cols-[1fr_1.1fr] sm:p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 sm:gap-3">
          <div className="relative flex aspect-[4/3] items-center justify-center rounded-lg bg-zinc-200">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[12px] font-semibold text-zinc-600">RM</span>
            <span className="absolute bottom-1.5 left-1.5 rounded bg-zinc-900/85 px-1.5 py-0.5 text-[9.5px] font-medium text-white">Interviewer</span>
          </div>
          <div className="relative flex aspect-[4/3] items-center justify-center rounded-lg bg-zinc-300">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[12px] font-semibold text-zinc-600">AK</span>
            <span className="absolute bottom-1.5 left-1.5 rounded bg-zinc-900/85 px-1.5 py-0.5 text-[9.5px] font-medium text-white">Candidate</span>
            <span className="absolute right-1.5 top-1.5 rounded bg-white/90 px-1.5 py-0.5 font-mono text-[9.5px] font-medium text-zinc-800">24:10</span>
          </div>
        </div>
        <div className="space-y-2.5 rounded-lg border border-zinc-200 bg-white p-3">
          <p className="font-mono text-[10px] font-medium text-indigo-700">COPILOT · ONLY YOU SEE THIS</p>
          <div className="rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-2">
            <p className="text-[10px] font-medium text-indigo-800">Suggested follow-up</p>
            <p className="mt-0.5 text-[11.5px] leading-snug text-zinc-900">You said the cache is per-region. What happens to in-flight writes during a region failover?</p>
            <p className="mt-1 font-mono text-[9.5px] text-zinc-600">grounded in answer at 21:52</p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-zinc-600">Coverage · shared rubric</p>
            <ul className="mt-1.5 space-y-1.5">
              {coverage.map(([c, ok]) => (
                <li key={c} className="flex items-center gap-2 text-[11.5px] text-zinc-800"><Tick ok={ok} />{c}{!ok && <span className="ml-auto text-[10px] font-medium text-amber-800">not yet assessed</span>}</li>
              ))}
            </ul>
          </div>
          <p className="flex items-center gap-2 border-t border-zinc-200 pt-2 text-[10.5px] text-zinc-700"><span className="h-1.5 w-1.5 flex-none rounded-full bg-emerald-600" />Identity matches the Screen stage</p>
        </div>
      </div>
    </Frame>
  )
}

/** TA view: how each interviewer's scores sit against the panel. */
export function InterviewCalibrationMock() {
  // offset from the panel median, in rubric points (illustrative)
  const rows: [string, number][] = [['R. Mehta', 0.1], ['S. Iyer', -0.7], ['D. Khan', 0.6], ['A. Rao', -0.1], ['P. Nair', 0.2]]
  return (
    <Frame title="levl1 · interview · panel calibration" label="Panel calibration preview: five interviewers, each shown scoring harder or softer than the panel median for one role, with a note to review two of them together.">
      <div className="p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[12.5px] font-semibold text-zinc-900">Senior Backend · 5 interviewers</p>
          <p className="text-[10px] text-zinc-600">vs panel median</p>
        </div>
        <div className="mt-2 flex items-center gap-3 text-[9.5px] font-medium text-zinc-600">
          <span className="w-[4.75rem] flex-none" />
          <span className="flex flex-1 justify-between"><span>← scores harder</span><span>softer →</span></span>
          <span className="w-8 flex-none" />
        </div>
        <ul className="mt-1.5 space-y-2.5">
          {rows.map(([n, v]) => {
            const w = Math.min(Math.abs(v) / 1, 1) * 50
            const far = Math.abs(v) >= 0.5
            return (
              <li key={n} className="flex items-center gap-3">
                <span className="w-[4.75rem] flex-none text-[11.5px] font-medium text-zinc-800">{n}</span>
                <div className="relative h-2 flex-1 rounded-full bg-zinc-100">
                  <span aria-hidden className="absolute left-1/2 top-[-3px] h-[14px] w-px bg-zinc-400" />
                  <span className={`absolute top-0 h-2 rounded-full ${far ? 'bg-amber-500' : 'bg-indigo-600'}`} style={v < 0 ? { right: '50%', width: `${w}%` } : { left: '50%', width: `${w}%` }} />
                </div>
                <span className={`w-8 flex-none text-right font-mono text-[10.5px] ${far ? 'text-amber-800' : 'text-zinc-700'}`}>{v > 0 ? '+' : ''}{v.toFixed(1)}</span>
              </li>
            )
          })}
        </ul>
        <p className="mt-4 rounded-md border border-zinc-200 bg-[#FBFAF7] px-3 py-2 text-[11px] leading-relaxed text-zinc-700">Suggested: a calibration session for S. Iyer and D. Khan on the system-design rubric.</p>
      </div>
    </Frame>
  )
}

/** Hiring-manager view: candidates side by side on the same parameters. */
export function InterviewCompareMock() {
  const cols = ['Design', 'Coding', 'Depth', 'Comms']
  const rows: [string, number[], string][] = [['A. Kapoor', [4, 4, 3, 4], 'Advance'], ['M. Das', [3, 4, 4, 3], 'Advance'], ['J. Thomas', [3, 2, 3, 4], 'Hold']]
  return (
    <Frame title="levl1 · interview · compare" label="Candidate comparison preview: three candidates for one role scored on the same four competencies, each with a recommendation.">
      <div className="p-4 sm:p-5">
        <p className="text-[12.5px] font-semibold text-zinc-900">Senior Backend · same rubric, every candidate</p>
        <table className="mt-3 w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-zinc-200 text-[10px] font-medium text-zinc-600">
              <th className="py-1.5 pr-2 font-medium">Candidate</th>
              {cols.map((c) => <th key={c} className="px-0.5 py-1.5 text-center font-medium sm:px-1">{c}</th>)}
              <th className="py-1.5 pl-2 text-right font-medium">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([n, s, v]) => (
              <tr key={n} className="border-b border-zinc-100 last:border-0">
                <td className="whitespace-nowrap py-2 pr-1 text-[11px] font-medium text-zinc-900 sm:pr-2 sm:text-[11.5px]">{n}</td>
                {s.map((x, i) => <td key={i} className="px-0.5 py-2 text-center font-mono text-[11px] text-zinc-800 sm:px-1">{x}<span className="hidden text-zinc-500 sm:inline">/5</span></td>)}
                <td className="py-2 pl-1 text-right sm:pl-2"><span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${v === 'Advance' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{v}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 font-mono text-[10px] text-zinc-600">every must-have covered · evidence on each score</p>
      </div>
    </Frame>
  )
}

/** Interviewer view: private coaching on how the interview ran. */
export function InterviewCoachingMock() {
  const signals: [string, string, boolean][] = [['Talk time', 'You 34% · candidate 66%', true], ['Interruptions', '1 while the candidate was answering', true], ['Plan coverage', '5 of 6 competencies', false]]
  return (
    <Frame title="levl1 · interview · your coaching" label="Interviewer coaching preview: private feedback on talk time, interruptions and plan coverage, with one suggestion for next time.">
      <div className="p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[12.5px] font-semibold text-zinc-900">Your interview with A. Kapoor</p>
          <p className="font-mono text-[10px] font-medium text-indigo-700">PRIVATE</p>
        </div>
        <ul className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200">
          {signals.map(([k, v, ok]) => (
            <li key={k} className="flex items-center gap-3 px-3 py-2.5">
              <Tick ok={ok} />
              <span className="flex-1 text-[11.5px] font-medium text-zinc-800">{k}</span>
              <span className="text-right text-[11px] text-zinc-700">{v}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-[11px] leading-relaxed text-zinc-800">Next time: leave ten minutes for concurrency — it’s a must-have for this role.</p>
      </div>
    </Frame>
  )
}
