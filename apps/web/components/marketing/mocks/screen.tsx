import { INTERVIEW_LENGTH_LABEL } from '@/config/site'
import { Frame } from './frame'

// Recreated Screen UI. The live room follows the locked product layout:
// question on top · AI video above candidate video (left) · code/whiteboard
// + live transcript (right). Names and content are illustrative.

export function ScreenRoomMock() {
  return (
    <Frame title="Levl1 Screen — Live interview" label="Screen interview room: the question across the top, the AI interviewer above the candidate's video on the left, and a code editor with a live transcript on the right.">
      <div className="bg-[#F7F8FD] p-3 sm:p-4">
        {/* Question bar */}
        <div className="flex items-center gap-3 rounded-xl border border-[#E7E9F5] bg-white px-4 py-3">
          <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-mk-purple">Q3 · Technical</span>
          <p className="flex-1 truncate text-[12.5px] font-semibold text-mk-ink sm:text-[13px]">Design a rate limiter for a multi-tenant API. How do you keep it fair under burst load?</p>
          <span className="hidden items-center gap-1.5 text-[11px] font-semibold text-slate-500 sm:flex"><span className="mk-pulse h-1.5 w-1.5 rounded-full bg-rose-500" />11:42</span>
        </div>

        <div className="mt-3 grid grid-cols-[0.8fr_1.2fr] gap-3">
          {/* Left: AI above candidate */}
          <div className="flex flex-col gap-3">
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#1E1B4B] via-[#3B0764] to-[#1E3A8A]">
              <div className="mk-pulse h-12 w-12 rounded-full bg-[radial-gradient(circle_at_35%_35%,#C4B5FD,#7C3AED_55%,#4338CA)] shadow-[0_0_40px_rgba(167,139,250,0.7)] sm:h-14 sm:w-14" />
              <span className="absolute bottom-2 left-2 rounded-md bg-black/35 px-2 py-0.5 text-[10px] font-semibold text-white">AI interviewer</span>
              <span className="mk-wave absolute bottom-2.5 right-2.5 flex h-4 items-center gap-[3px] text-violet-100">{[0, 1, 2, 3].map((i) => <i key={i} style={{ height: 14, animationDelay: `${i * 0.15}s` }} />)}</span>
            </div>
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-200 to-slate-300">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/70 text-sm font-extrabold text-slate-500 sm:h-14 sm:w-14">AK</div>
              <span className="absolute bottom-2 left-2 rounded-md bg-black/35 px-2 py-0.5 text-[10px] font-semibold text-white">Candidate</span>
            </div>
          </div>

          {/* Right: code / whiteboard + transcript */}
          <div className="flex flex-col gap-3">
            <div className="overflow-hidden rounded-xl bg-[#0B1020]">
              <div className="flex gap-1 border-b border-white/10 px-2 pt-2">
                <span className="rounded-t-md bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white">Code</span>
                <span className="px-2.5 py-1 text-[10px] font-semibold text-slate-300">Whiteboard</span>
              </div>
              <pre className="px-3 py-2.5 font-mono text-[10.5px] leading-[1.6] text-[#C9D1FF] sm:text-[11px]">
<span className="text-slate-400">{'// token bucket per tenant'}</span>{'\n'}
<span className="text-[#C792EA]">function</span> <span className="text-[#82AAFF]">allow</span>{'(tenant) {\n'}
{'  '}<span className="text-[#C792EA]">const</span>{' b = buckets.get(tenant)\n'}
{'  b.refill(now())\n'}
{'  '}<span className="text-[#C792EA]">return</span>{' b.take('}<span className="text-[#F78C6C]">1</span>{')'}<span className="mk-caret ml-0.5" />{'\n}'}
              </pre>
            </div>
            <div className="flex-1 rounded-xl border border-[#E7E9F5] bg-white p-3">
              <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500"><span className="mk-pulse h-1.5 w-1.5 rounded-full bg-emerald-500" />Live transcript</p>
              <p className="text-[11px] leading-relaxed text-slate-600"><b className="text-mk-purple">AI</b> · What happens when one tenant bursts?</p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600"><b className="text-mk-ink">Candidate</b> · Each tenant gets its own bucket, so a burst only drains theirs…</p>
            </div>
          </div>
        </div>
      </div>
    </Frame>
  )
}

export function ScreenReportMock() {
  const dims: [string, number, string][] = [
    ['System design', 88, 'Separated per-tenant buckets from global limits; reasoned about hot keys.'],
    ['Coding', 84, 'Working token-bucket implementation; handled refill edge case when prompted.'],
    ['Problem solving', 81, 'Weighed sliding window vs. token bucket with clear trade-offs.'],
    ['Communication', 90, 'Structured answers; checked assumptions before designing.'],
  ]
  return (
    <Frame title="Levl1 Screen — Report" label="Screen report: competency scores per dimension, each with the reason behind it, and integrity shown separately.">
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-mk-purple to-mk-blue text-sm font-extrabold text-white">AK</div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-extrabold text-mk-ink">Arjun Kapoor</p>
            <p className="text-[11px] text-slate-500">Senior Backend Engineer · {INTERVIEW_LENGTH_LABEL}</p>
          </div>
          <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">Recommend</span>
        </div>
        <div className="mt-4 space-y-3">
          {dims.map(([d, v, why]) => (
            <div key={d}>
              <div className="flex items-center gap-3">
                <span className="w-28 flex-none text-[11.5px] font-semibold text-slate-700">{d}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EEF0FA]"><div className="h-full rounded-full bg-gradient-to-r from-mk-indigo to-mk-sky" style={{ width: `${v}%` }} /></div>
                <span className="w-6 text-right text-[11.5px] font-bold text-slate-700">{v}</span>
              </div>
              <p className="ml-[7.75rem] mt-1 text-[10.5px] italic leading-snug text-slate-500">“{why}”</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {['Transcript', 'Code', 'Whiteboard'].map((t) => <span key={t} className="rounded-lg border border-[#EEF0FA] bg-[#FBFBFE] py-1.5 text-[10.5px] font-semibold text-slate-600">{t}</span>)}
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Integrity · separate</span>
          <span className="flex-1 text-[10.5px] text-amber-800">1 flag for review · not part of the competency score</span>
        </div>
      </div>
    </Frame>
  )
}

export function ScreenIntegrityMock() {
  const flags: [string, string, string][] = [
    ['Paste origin', 'Large pre-formed block pasted into the editor at 07:14', 'Review'],
    ['Response latency', 'Unusual pause pattern before three answers', 'Review'],
    ['Second face', 'Another person visible in frame for 6s at 12:02', 'Review'],
  ]
  return (
    <Frame title="Levl1 Screen — Integrity review" label="Integrity review panel: each flag shows its evidence and timestamp and waits for a human decision. Nothing is auto-rejected.">
      <div className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[12px] font-bold text-mk-ink">3 flags · awaiting human review</p>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Never auto-rejected</span>
        </div>
        {flags.map(([t, ev, s]) => (
          <div key={t} className="mb-2 flex items-start gap-3 rounded-xl border border-[#EEF0FA] bg-[#FBFBFE] p-3">
            <span className="mt-1 h-2 w-2 flex-none rounded-full bg-amber-500" />
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-bold text-slate-800">{t}</p>
              <p className="text-[10.5px] leading-snug text-slate-500">{ev}</p>
            </div>
            <span className="rounded-md border border-violet-200 bg-white px-2 py-0.5 text-[10px] font-bold text-mk-purple">{s}</span>
          </div>
        ))}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-violet-50 p-3"><p className="text-[10px] font-semibold text-slate-500">Competency</p><p className="text-lg font-extrabold text-mk-purple">86</p></div>
          <div className="rounded-xl bg-amber-50 p-3"><p className="text-[10px] font-semibold text-slate-500">Integrity</p><p className="text-[12px] font-bold text-amber-700">Reviewer decides</p></div>
        </div>
      </div>
    </Frame>
  )
}

export function ScreenConsentMock() {
  return (
    <Frame title="Levl1 Screen — Your interview" label="Candidate scheduling screen: told up front the interview is AI-led, gives consent, and picks a time.">
      <div className="p-4 sm:p-5">
        <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3">
          <p className="text-[11.5px] font-bold text-mk-ink">This interview is conducted by an AI interviewer.</p>
          <p className="mt-1 text-[10.5px] leading-snug text-slate-600">It takes {INTERVIEW_LENGTH_LABEL}, including a short tour of the interface. A recruiter reviews every result.</p>
          <div className="mt-2.5 flex items-center gap-2 text-[10.5px] font-semibold text-slate-700"><span className="flex h-4 w-4 items-center justify-center rounded bg-mk-purple text-[9px] text-white">✓</span>I understand and consent</div>
        </div>
        <p className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Pick a time that suits you</p>
        <div className="grid grid-cols-3 gap-2">
          {['Today 6:30 pm', 'Tomorrow 10:00', 'Tomorrow 2:30', 'Thu 11:00', 'Thu 4:00', 'Fri 9:30'].map((t, i) => (
            <span key={t} className={`rounded-lg border py-2 text-center text-[10.5px] font-semibold ${i === 1 ? 'border-mk-purple bg-mk-purple text-white' : 'border-[#E7E9F5] bg-white text-slate-600'}`}>{t}</span>
          ))}
        </div>
        <div className="mt-4 flex gap-2 text-[10px] font-semibold text-slate-500">
          <span className="rounded-md bg-slate-100 px-2 py-1">Invite by email</span><span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">Reminder on WhatsApp</span>
        </div>
      </div>
    </Frame>
  )
}

export function ScreenApprovalMock() {
  const qs: [string, boolean][] = [['System design — rate limiting', true], ['Coding — token bucket', true], ['Debugging — production incident', true], ['Culture fit — working style', false]]
  return (
    <Frame title="Levl1 Screen — Question bank" label="Question bank approval: your team reviews and approves the questions before interviews run.">
      <div className="p-4 sm:p-5">
        <p className="mb-3 text-[12px] font-bold text-mk-ink">Senior Backend Engineer · question bank</p>
        {qs.map(([q, ok]) => (
          <div key={q} className="flex items-center gap-3 border-t border-[#EEF0FA] py-2.5">
            <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] ${ok ? 'bg-emerald-500 text-white' : 'bg-[#EEF0FA] text-slate-500'}`}>{ok ? '✓' : '·'}</span>
            <span className="flex-1 text-[11.5px] text-slate-700">{q}</span>
            <span className={`text-[10px] font-bold ${ok ? 'text-emerald-700' : 'text-slate-500'}`}>{ok ? 'Approved' : 'Pending'}</span>
          </div>
        ))}
      </div>
    </Frame>
  )
}
