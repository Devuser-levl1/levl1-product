"use client";

import { Lock, MapPin, CalendarClock, Wallet, BadgeCheck } from "lucide-react";
import { LogisticsConfig, WORK_MODES, WORK_MODE_LABEL, Relocation, CompPeriod } from "@/lib/screen/logistics/config";

// ── Position logistics constraints editor (Screen) ─────────────────────────
// Everything is optional. A blank field = "not specified" → the interviewer
// just records the candidate's answer for that filter instead of negotiating.
// The comp band is recruiter-only (never shown to the candidate or the AI).

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD"];

export function LogisticsEditor({ value, onChange, disabled }: { value: LogisticsConfig; onChange: (v: LogisticsConfig) => void; disabled?: boolean }) {
  const set = (patch: Partial<LogisticsConfig>) => {
    const next: LogisticsConfig = { ...value, ...patch };
    for (const k of Object.keys(next) as (keyof LogisticsConfig)[]) if (next[k] === undefined || next[k] === "") delete next[k];
    onChange(next);
  };
  const comp = value.comp;
  const setComp = (patch: Partial<NonNullable<LogisticsConfig["comp"]>>) => {
    const c = { currency: comp?.currency ?? "INR", period: comp?.period ?? ("annual" as CompPeriod), ...comp, ...patch };
    if (c.min === undefined && c.max === undefined) set({ comp: undefined });
    else set({ comp: c });
  };
  const numOrUndef = (v: string) => (v.trim() === "" || !Number.isFinite(Number(v)) ? undefined : Math.max(0, Math.round(Number(v))));
  const toggleMode = (m: (typeof WORK_MODES)[number]) => {
    const cur = value.workModes ?? [];
    const next = cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m];
    set({ workModes: next.length ? WORK_MODES.filter((x) => next.includes(x)) : undefined });
  };

  const row: React.CSSProperties = { display: "grid", gridTemplateColumns: "28px 1fr", gap: 12, alignItems: "start", padding: "14px 0", borderTop: "1px solid #F1F5F9" };
  const label: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" };
  const hint: React.CSSProperties = { fontSize: 11.5, color: "#94A3B8", marginTop: 6 };
  const icon = (I: React.ElementType) => <div style={{ width: 28, height: 28, borderRadius: 8, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center" }}><I size={14} color="#4F46E5" /></div>;

  return (
    <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: "2px 16px", background: "#fff" }}>
      {/* Location / work mode */}
      <div style={{ ...row, borderTop: "none" }}>
        {icon(MapPin)}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 12 }}>
          <div>
            <span style={label}>Job location</span>
            <input className="input" disabled={disabled} placeholder="e.g. Pune, India" value={value.location ?? ""} onChange={(e) => set({ location: e.target.value || undefined })} />
          </div>
          <div>
            <span style={label}>Allowed work modes</span>
            <div style={{ display: "flex", gap: 6 }}>
              {WORK_MODES.map((m) => {
                const on = value.workModes?.includes(m);
                return (
                  <button key={m} type="button" disabled={disabled} onClick={() => toggleMode(m)} aria-pressed={on}
                    style={{ flex: 1, padding: "8px 4px", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: `1px solid ${on ? "#4F46E5" : "#E2E8F0"}`, background: on ? "#EEF2FF" : "#fff", color: on ? "#4F46E5" : "#64748B" }}>
                    {WORK_MODE_LABEL[m]}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <span style={label}>Relocation</span>
            <select className="input" disabled={disabled} value={value.relocation ?? ""} onChange={(e) => set({ relocation: (e.target.value || undefined) as Relocation | undefined })}>
              <option value="">Not specified</option>
              <option value="required">Must relocate</option>
              <option value="supported">Relocation supported</option>
              <option value="not_required">Not required</option>
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1", ...hint, marginTop: 0 }}>If a candidate wants a mode you don&apos;t allow, the interviewer states the constraint honestly and works toward a concrete arrangement.</div>
        </div>
      </div>

      {/* Notice / start */}
      <div style={row}>
        {icon(CalendarClock)}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <span style={label}>Max acceptable notice (days)</span>
            <input className="input" type="number" min={0} max={365} disabled={disabled} placeholder="e.g. 60" value={value.maxNoticeDays ?? ""} onChange={(e) => set({ maxNoticeDays: numOrUndef(e.target.value) })} />
          </div>
          <div>
            <span style={label}>Target start by</span>
            <input className="input" type="date" disabled={disabled} value={value.targetStartBy ?? ""} onChange={(e) => set({ targetStartBy: e.target.value || undefined })} />
          </div>
        </div>
      </div>

      {/* Comp band — recruiter only */}
      <div style={row}>
        {icon(Wallet)}
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 110px 120px", gap: 12 }}>
            <div>
              <span style={label}>Salary band — min</span>
              <input className="input" type="number" min={0} disabled={disabled} placeholder={comp?.currency === "INR" || !comp ? "e.g. 1800000" : "e.g. 90000"} value={comp?.min ?? ""} onChange={(e) => setComp({ min: numOrUndef(e.target.value) })} />
            </div>
            <div>
              <span style={label}>Max</span>
              <input className="input" type="number" min={0} disabled={disabled} placeholder={comp?.currency === "INR" || !comp ? "e.g. 2400000" : "e.g. 120000"} value={comp?.max ?? ""} onChange={(e) => setComp({ max: numOrUndef(e.target.value) })} />
            </div>
            <div>
              <span style={label}>Currency</span>
              <select className="input" disabled={disabled} value={comp?.currency ?? "INR"} onChange={(e) => setComp({ currency: e.target.value })}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <span style={label}>Per</span>
              <select className="input" disabled={disabled} value={comp?.period ?? "annual"} onChange={(e) => setComp({ period: e.target.value as CompPeriod })}>
                <option value="annual">Year</option>
                <option value="monthly">Month</option>
              </select>
            </div>
          </div>
          <div style={{ ...hint, display: "flex", alignItems: "center", gap: 6 }}>
            <Lock size={11} /> Recruiter-only. Never shown to the candidate or given to the AI — the interviewer just asks for their expectation, and Levl1 compares it to this band.
          </div>
        </div>
      </div>

      {/* Work authorization */}
      <div style={row}>
        {icon(BadgeCheck)}
        <div>
          <span style={label}>Work authorization for the job location</span>
          <select className="input" disabled={disabled} style={{ maxWidth: 320 }}
            value={value.workAuthRequired === undefined ? "" : value.workAuthRequired ? "yes" : "no"}
            onChange={(e) => set({ workAuthRequired: e.target.value === "" ? undefined : e.target.value === "yes" })}>
            <option value="">Not specified</option>
            <option value="yes">Required</option>
            <option value="no">Not required (sponsorship available)</option>
          </select>
          <div style={hint}>The candidate is asked one neutral question — whether they&apos;re authorized to work in the job location. Never nationality or immigration status.</div>
        </div>
      </div>
    </div>
  );
}
