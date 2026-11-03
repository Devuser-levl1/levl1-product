"use client";

import { useId } from "react";
import { Lock, MapPin, CalendarClock, Wallet, BadgeCheck } from "lucide-react";
import { LogisticsConfig, WORK_MODES, WORK_MODE_LABEL, Relocation, CompPeriod } from "@/lib/screen/logistics/config";
import { Field, Input, Select } from "@/components/screen/ui";
import { lv, space, text, radius } from "@/lib/screen/ui/tokens";

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
  const modesId = useId();
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
    set({ workModes: next.length ? WORK_MODES.filter((x) => next.includes(x)) : undefined, ...(next.includes("hybrid") ? {} : { hybridDaysPerWeek: undefined }) });
  };

  const row: React.CSSProperties = { display: "grid", gridTemplateColumns: "28px minmax(0, 1fr)", gap: space[3], alignItems: "start", padding: `${space[4]}px 0`, borderTop: `1px solid ${lv.border}` };
  const grid = (min: number): React.CSSProperties => ({ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: space[3] });
  const hint: React.CSSProperties = { fontSize: text.xs, color: lv.textMuted, marginTop: space[2] };
  const icon = (I: React.ElementType) => <div aria-hidden="true" style={{ width: 28, height: 28, borderRadius: radius.sm, background: lv.brandSoft, display: "flex", alignItems: "center", justifyContent: "center" }}><I size={14} color={lv.brand} /></div>;

  return (
    <div style={{ border: `1px solid ${lv.border}`, borderRadius: radius.md, padding: `2px ${space[4]}px`, background: lv.surface }}>
      {/* Location / work mode */}
      <div style={{ ...row, borderTop: "none" }}>
        {icon(MapPin)}
        <div style={grid(180)}>
          <Field label="Job location">
            <Input disabled={disabled} placeholder="e.g. Pune, India" value={value.location ?? ""} onChange={(e) => set({ location: e.target.value || undefined })} />
          </Field>
          <div role="group" aria-labelledby={modesId}>
            <span id={modesId} className="lv-label" style={{ display: "block", marginBottom: space[1] }}>Allowed work modes</span>
            <div style={{ display: "flex", gap: 6 }}>
              {WORK_MODES.map((m) => {
                const on = value.workModes?.includes(m);
                return (
                  <button key={m} type="button" disabled={disabled} onClick={() => toggleMode(m)} aria-pressed={!!on} className="lv-toggle"
                    style={{ flex: 1, minHeight: 40, padding: "0 4px", borderRadius: radius.md, fontSize: text.sm, fontWeight: 600, cursor: "pointer", border: `1px solid ${on ? lv.brand : lv.borderControl}`, background: on ? lv.brandSoft : lv.surface, color: on ? lv.brandText : lv.textBody }}>
                    {WORK_MODE_LABEL[m]}
                  </button>
                );
              })}
            </div>
          </div>
          <Field label="Relocation">
            <Select disabled={disabled} value={value.relocation ?? ""} onChange={(e) => set({ relocation: (e.target.value || undefined) as Relocation | undefined })}>
              <option value="">Not specified</option>
              <option value="required">Must relocate</option>
              <option value="supported">Relocation supported</option>
              <option value="not_required">Not required</option>
            </Select>
          </Field>
          {value.workModes?.includes("hybrid") && (
            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: space[3], flexWrap: "wrap", background: lv.brandSoft, border: `1px solid ${lv.brandSoftBorder}`, borderRadius: radius.md, padding: `${space[2]}px ${space[3]}px` }}>
              <span style={{ fontSize: text.sm, fontWeight: 600, color: lv.textBody }}>Hybrid — in-office days per week</span>
              <Select disabled={disabled} style={{ width: 140 }} aria-label="In-office days per week"
                value={value.hybridDaysPerWeek ?? ""} onChange={(e) => set({ hybridDaysPerWeek: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">Not specified</option>
                {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>)}
              </Select>
              <span style={{ fontSize: text.xs, color: lv.textMuted }}>The interviewer confirms the candidate can do this.</span>
            </div>
          )}
          <div style={{ gridColumn: "1 / -1", ...hint, marginTop: 0 }}>If a candidate wants a mode you don&apos;t allow, the interviewer states the constraint honestly and works toward a concrete arrangement.</div>
        </div>
      </div>

      {/* Notice / start */}
      <div style={row}>
        {icon(CalendarClock)}
        <div style={grid(180)}>
          <Field label="Max acceptable notice (days)">
            <Input type="number" min={0} max={365} disabled={disabled} placeholder="e.g. 60" value={value.maxNoticeDays ?? ""} onChange={(e) => set({ maxNoticeDays: numOrUndef(e.target.value) })} />
          </Field>
          <Field label="Target start by">
            <Input type="date" disabled={disabled} value={value.targetStartBy ?? ""} onChange={(e) => set({ targetStartBy: e.target.value || undefined })} />
          </Field>
        </div>
      </div>

      {/* Comp band — recruiter only */}
      <div style={row}>
        {icon(Wallet)}
        <div>
          <div style={grid(120)}>
            <Field label="Salary band — min">
              <Input type="number" min={0} disabled={disabled} placeholder={comp?.currency === "INR" || !comp ? "e.g. 1800000" : "e.g. 90000"} value={comp?.min ?? ""} onChange={(e) => setComp({ min: numOrUndef(e.target.value) })} />
            </Field>
            <Field label="Max">
              <Input type="number" min={0} disabled={disabled} placeholder={comp?.currency === "INR" || !comp ? "e.g. 2400000" : "e.g. 120000"} value={comp?.max ?? ""} onChange={(e) => setComp({ max: numOrUndef(e.target.value) })} />
            </Field>
            <Field label="Currency">
              <Select disabled={disabled} value={comp?.currency ?? "INR"} onChange={(e) => setComp({ currency: e.target.value })}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Per">
              <Select disabled={disabled} value={comp?.period ?? "annual"} onChange={(e) => setComp({ period: e.target.value as CompPeriod })}>
                <option value="annual">Year</option>
                <option value="monthly">Month</option>
              </Select>
            </Field>
          </div>
          <div style={{ ...hint, display: "flex", alignItems: "flex-start", gap: 6 }}>
            <Lock size={12} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} /> Recruiter-only. Never shown to the candidate or given to the AI — the interviewer just asks for their expectation, and Levl1 compares it to this band.
          </div>
        </div>
      </div>

      {/* Work authorization */}
      <div style={row}>
        {icon(BadgeCheck)}
        <Field label="Work authorization for the job location"
          hint="The candidate is asked one neutral question — whether they're authorized to work in the job location. Never nationality or immigration status.">
          <Select disabled={disabled} style={{ maxWidth: 320 }}
            value={value.workAuthRequired === undefined ? "" : value.workAuthRequired ? "yes" : "no"}
            onChange={(e) => set({ workAuthRequired: e.target.value === "" ? undefined : e.target.value === "yes" })}>
            <option value="">Not specified</option>
            <option value="yes">Required</option>
            <option value="no">Not required (sponsorship available)</option>
          </Select>
        </Field>
      </div>
    </div>
  );
}
