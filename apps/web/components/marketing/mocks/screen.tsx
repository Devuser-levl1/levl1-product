import { INTERVIEW_LENGTH_LABEL } from '@/config/site'
import { Frame } from './frame'

// Recreated product UI, flattened to the site palette (zinc + one indigo).
// The live room follows the locked product layout: question on top · AI video
// above candidate video (left) · code/whiteboard + live transcript (right).
// Names and content are illustrative. Text on overlays meets AA contrast.

export function ScreenRoomMock() {
  return (
    <Frame title="Levl1 — Live interview" label="Interview room: the question across the top, the AI interviewer above the candidate's video on the left, and a code editor with test results and a live transcript on the right.">
      <div className="bg-zinc-50 p-3 sm:p-4">
        {/* Question bar */}
        <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3">
          <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">Q3 · Work sample</span>
          <p className="flex-1 truncate text-[12.5px] font-medium text-zinc-900 sm:text-[13px]">Implement a per-tenant rate limiter. Then tell me how it behaves under burst load.</p>
          <span className="hidden items-center gap-1.5 text-[11px] font-medium text-zinc-600 sm:flex"><span className="mk-pulse h-1.5 w-1.5 rounded-full bg-indigo-600" />14:08</span>
        </div>

        <div className="mt-3 grid grid-cols-[0.8fr_1.2fr] gap-3">
          {/* Left: AI above candidate */}
          <div className="flex flex-col gap-3">
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-zinc-900">
              <div className="mk-pulse h-11 w-11 rounded-full bg-indigo-500/90 ring-8 ring-indigo-500/15 sm:h-12 sm:w-12" />
              <span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">AI interviewer</span>
              <span className="mk-wave absolute bottom-2.5 right-2.5 flex h-4 items-center gap-[3px] text-indigo-200">{[0, 1, 2, 3].map((i) => <i key={i} style={{ height: 14, animationDelay: `${i * 0.15}s` }} />)}</span>
            </div>
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-zinc-200">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-sm font-semibold text-zinc-600 sm:h-12 sm:w-12">AK</div>
              <span className="absolute bottom-2 left-2 rounded bg-zinc-900/85 px-1.5 py-0.5 text-[10px] font-medium text-white">Candidate</span>
            </div>
          </div>

          {/* Right: code / whiteboard + transcript */}
          <div className="flex flex-col gap-3">
            <div className="overflow-hidden rounded-lg bg-zinc-950">
              <div className="flex items-center gap-1 border-b border-white/10 px-2 pt-2">
                <span className="rounded-t bg-white/10 px-2.5 py-1 text-[10px] font-medium text-white">Code</span>
                <span className="px-2.5 py-1 text-[10px] font-medium text-zinc-300">Whiteboard</span>
                <span className="mb-1 ml-auto rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-medium text-white">Run</span>
              </div>
              <pre className="overflow-hidden px-3 py-2.5 font-mono text-[9px] leading-[1.6] text-zinc-200 sm:text-[11px]">
<span className="text-zinc-400">{'// token bucket per tenant'}</span>{'\n'}
<span className="text-indigo-300">function</span> allow{'(tenant) {\n'}
{'  '}<span className="text-indigo-300">const</span>{' b = buckets.get(tenant)\n'}
{'  b.refill(now())\n'}
{'  '}<span className="text-indigo-300">return</span>{' b.take(1)'}<span className="mk-caret ml-0.5" />{'\n}'}
              </pre>
              <div className="flex items-center gap-2 whitespace-nowrap border-t border-white/10 px-3 py-1.5 font-mono text-[9px] text-zinc-300 sm:text-[10px]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />tests: 4 passed · 0 failed
              </div>
            </div>
            <div className="flex-1 rounded-lg border border-zinc-200 bg-white p-3">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-medium text-zinc-600"><span className="mk-pulse h-1.5 w-1.5 rounded-full bg-indigo-600" />Live transcript</p>
              <p className="text-[11px] leading-relaxed text-zinc-600"><b className="font-medium text-indigo-700">AI</b> · Why a bucket per tenant rather than one global limit?</p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-600"><b className="font-medium text-zinc-900">Candidate</b> · So one noisy tenant can’t drain everyone else’s budget…</p>
            </div>
          </div>
        </div>
      </div>
    </Frame>
  )
}

export function ScreenReportMock() {
  const dims: [string, number, string][] = [
    ['System design', 88, 'Separated per-tenant and global limits; reasoned about hot keys.'],
    ['Coding', 84, 'Working token bucket; all tests passed. Fixed a refill edge case when asked.'],
    ['Problem solving', 81, 'Compared sliding window and token bucket with clear trade-offs.'],
  ]
  const must: [string, boolean][] = [['Go', true], ['Distributed systems', true], ['Kafka', false]]
  return (
    <Frame title="Levl1 — Interview report" label="Interview report: the recommendation first, competencies ranked with a reason for each, must-have skills, and integrity shown separately.">
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-zinc-600">Recommendation</p>
            <p className="text-[14px] font-semibold text-zinc-900">Advance to panel</p>
          </div>
          <div className="text-right">
            <p className="text-[12px] font-medium text-zinc-900">Arjun Kapoor</p>
            <p className="text-[10.5px] text-zinc-600">Senior Backend · {INTERVIEW_LENGTH_LABEL}</p>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {dims.map(([d, v, why]) => (
            <div key={d}>
              <div className="flex items-center gap-3">
                <span className="w-28 flex-none text-[11.5px] font-medium text-zinc-800">{d}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${v}%` }} /></div>
                <span className="w-6 text-right text-[11.5px] font-medium text-zinc-800">{v}</span>
              </div>
              <p className="mt-1 pl-[7.75rem] text-[10.5px] leading-snug text-zinc-600">{why}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-medium text-zinc-600">Must-haves</span>
          {must.map(([m, ok]) => (
            <span key={m} className={`rounded-md border px-2 py-0.5 text-[10.5px] font-medium ${ok ? 'border-zinc-200 text-zinc-800' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>{ok ? '✓' : '○'} {m}</span>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2">
          <span className="text-[10px] font-medium text-zinc-800">Integrity · scored separately</span>
          <span className="flex-1 text-right text-[10.5px] text-zinc-600">1 flag for human review</span>
        </div>
      </div>
    </Frame>
  )
}

export function ScreenIntegrityMock() {
  const flags: [string, string][] = [
    ['Paste anomaly', 'Large pre-formed block pasted into the editor at 07:14'],
    ['Reading pattern', 'Gaze and delivery consistent with reading an answer, 11:40'],
    ['Multiple faces', 'A second person visible in frame for 6s at 12:02'],
  ]
  return (
    <Frame title="Levl1 — Integrity review" label="Integrity review: each flag shows its evidence and timestamp and waits for a human decision. Nothing is auto-rejected.">
      <div className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[12px] font-semibold text-zinc-900">3 flags · awaiting review</p>
          <span className="rounded-md border border-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-700">Never auto-rejected</span>
        </div>
        {flags.map(([t, ev]) => (
          <div key={t} className="mb-2 flex items-start gap-3 rounded-lg border border-zinc-200 p-3">
            <span className="mt-1 h-2 w-2 flex-none rounded-full bg-amber-500" />
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-medium text-zinc-900">{t}</p>
              <p className="text-[10.5px] leading-snug text-zinc-600">{ev}</p>
            </div>
            <span className="rounded-md border border-zinc-200 px-2 py-0.5 text-[10px] font-medium text-indigo-700">Review</span>
          </div>
        ))}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-zinc-200 p-3"><p className="text-[10px] font-medium text-zinc-600">Competency</p><p className="text-lg font-semibold text-zinc-900">84</p></div>
          <div className="rounded-lg border border-zinc-200 p-3"><p className="text-[10px] font-medium text-zinc-600">Integrity</p><p className="text-[12px] font-medium text-zinc-900">A reviewer decides</p></div>
        </div>
      </div>
    </Frame>
  )
}

export function ScreenConsentMock() {
  return (
    <Frame title="Levl1 — Your interview" label="Candidate scheduling: told up front the interview is AI-led, gives two separate consents, then picks a time.">
      <div className="p-4 sm:p-5">
        <p className="text-[12px] font-semibold text-zinc-900">This interview is conducted by an AI interviewer.</p>
        <p className="mt-1 text-[10.5px] leading-snug text-zinc-600">It takes {INTERVIEW_LENGTH_LABEL}, including a short tour of the interface. A person reviews every result.</p>
        <div className="mt-3 space-y-2">
          {['I agree to an AI-led interview', 'I agree to photo, audio and camera recording'].map((c) => (
            <div key={c} className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-[10.5px] font-medium text-zinc-800">
              <span className="flex h-4 w-4 items-center justify-center rounded bg-indigo-600 text-[9px] text-white">✓</span>{c}
            </div>
          ))}
        </div>
        <p className="mb-2 mt-4 text-[10px] font-medium text-zinc-600">Pick a time that suits you</p>
        <div className="grid grid-cols-3 gap-2">
          {['Today 21:30', 'Tomorrow 07:00', 'Tomorrow 14:30', 'Thu 11:00', 'Thu 23:00', 'Fri 06:30'].map((t, i) => (
            <span key={t} className={`rounded-md border py-2 text-center text-[10.5px] font-medium ${i === 1 ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-zinc-200 bg-white text-zinc-700'}`}>{t}</span>
          ))}
        </div>
        <div className="mt-4 flex gap-2 text-[10px] font-medium text-zinc-700">
          <span className="rounded-md border border-zinc-200 px-2 py-1">Invite by email</span><span className="rounded-md border border-zinc-200 px-2 py-1">Reminder on WhatsApp</span>
        </div>
      </div>
    </Frame>
  )
}

export function ScreenApprovalMock() {
  const qs: [string, string, boolean][] = [
    ['Distributed systems', 'Must-have', true], ['Go', 'Must-have', true],
    ['Work sample — rate limiter', 'Must-have', true], ['Kafka', 'Good-to-have', false],
  ]
  return (
    <Frame title="Levl1 — Rubric approval" label="Rubric approval: must-have and good-to-have skills drafted from the job description, approved by the team before interviews run.">
      <div className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[12px] font-semibold text-zinc-900">Senior Backend Engineer</p>
          <span className="text-[10px] font-medium text-zinc-600">Drafted from your JD</span>
        </div>
        {qs.map(([q, tier, ok]) => (
          <div key={q} className="flex items-center gap-3 border-t border-zinc-200 py-2.5">
            <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] ${ok ? 'bg-indigo-600 text-white' : 'border border-zinc-300 text-zinc-600'}`}>{ok ? '✓' : '·'}</span>
            <span className="flex-1 text-[11.5px] text-zinc-800">{q}</span>
            <span className="rounded border border-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700">{tier}</span>
            <span className={`w-14 text-right text-[10px] font-medium ${ok ? 'text-zinc-900' : 'text-zinc-600'}`}>{ok ? 'Approved' : 'Pending'}</span>
          </div>
        ))}
      </div>
    </Frame>
  )
}

export function ScreenControlMock() {
  const rows: [string, string, number, boolean, boolean][] = [
    ['Meera Iyer', 'Data Engineer', 72, true, true],
    ['Arjun Kapoor', 'Senior Backend', 45, true, true],
    ['Sam Okafor', 'Full-Stack', 18, true, false],
  ]
  return (
    <Frame title="Levl1 — Control Room" label="Control Room: live interviews in progress with camera, microphone and progress health, visible without joining.">
      <div className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-2 text-[12px] font-semibold text-zinc-900"><span className="mk-pulse h-1.5 w-1.5 rounded-full bg-indigo-600" />3 interviews live</p>
          <span className="text-[10px] font-medium text-zinc-600">Updated just now</span>
        </div>
        {rows.map(([n, r, pct, cam, mic]) => (
          <div key={n} className="flex items-center gap-3 border-t border-zinc-200 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11.5px] font-medium text-zinc-900">{n}</p>
              <p className="text-[10px] text-zinc-600">{r}</p>
            </div>
            <span className="text-[10px] font-medium text-zinc-700">Cam {cam ? '✓' : '—'}</span>
            <span className={`text-[10px] font-medium ${mic ? 'text-zinc-700' : 'text-amber-800'}`}>Mic {mic ? '✓' : 'low'}</span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-200"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${pct}%` }} /></div>
          </div>
        ))}
      </div>
    </Frame>
  )
}
