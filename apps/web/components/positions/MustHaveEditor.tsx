"use client";

import { useState, KeyboardEvent } from "react";
import { ShieldCheck, Plus, X } from "lucide-react";
import { MUST_HAVE_LEN, MUST_HAVE_MAX } from "@/lib/screen/recruiter/must-haves";
import { Button, Input } from "@/components/screen/ui";
import { lv, space, text, radius } from "@/lib/screen/ui/tokens";

// ── Must-have requirements editor (Screen F3) ──────────────────────────────
// Mark skills as non-negotiable with one click, or add a free-form requirement
// ("Led a team of 5+"). Used in the New Position flow and on the position page.

export function MustHaveEditor({ value, onChange, suggestions = [], disabled }: {
  value: string[]; onChange: (v: string[]) => void; suggestions?: string[]; disabled?: boolean;
}) {
  const [input, setInput] = useState("");
  const has = (s: string) => value.some((v) => v.toLowerCase() === s.toLowerCase());
  const full = value.length >= MUST_HAVE_MAX;
  const add = (raw: string) => {
    const s = raw.replace(/\s+/g, " ").trim().slice(0, MUST_HAVE_LEN);
    if (!s || has(s) || full) return;
    onChange([...value, s]);
  };
  const remove = (s: string) => onChange(value.filter((v) => v !== s));
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); add(input); setInput(""); }
    if (e.key === "Backspace" && !input && value.length) remove(value[value.length - 1]);
  };
  const open = suggestions.filter((s) => !has(s));

  return (
    <div style={{ border: `1px solid ${lv.brandSoftBorder}`, background: lv.surfaceSunken, borderRadius: radius.md, padding: space[3], display: "flex", flexDirection: "column", gap: space[3] }}>
      <ul aria-label="Must-have requirements" style={{ display: "flex", flexWrap: "wrap", gap: 6, minHeight: 28, alignItems: "center", listStyle: "none", margin: 0, padding: 0 }}>
        {value.length === 0 && <li style={{ fontSize: text.sm, color: lv.textMuted }}>No must-haves yet — the interview treats every skill equally.</li>}
        {value.map((m) => (
          <li key={m} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: lv.brand, color: lv.onBrand, borderRadius: radius.pill, padding: "4px 4px 4px 10px", fontSize: text.sm, fontWeight: 600 }}>
            <ShieldCheck size={14} aria-hidden="true" /> {m}
            {!disabled && (
              <button type="button" onClick={() => remove(m)} aria-label={`Remove ${m}`} className="lv-chip-remove"
                style={{ border: "none", background: "rgba(255,255,255,0.22)", color: lv.onBrand, width: 22, height: 22, borderRadius: 6, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                <X size={12} aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {!disabled && open.length > 0 && !full && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: text.xs, color: lv.textMuted, fontWeight: 600, marginRight: 2 }}>Mark a skill:</span>
          {open.map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="lv-chip-add"
              style={{ display: "inline-flex", alignItems: "center", gap: 4, minHeight: 28, border: `1px dashed ${lv.brandSoftBorder}`, background: lv.surface, color: lv.brandText, borderRadius: radius.pill, padding: "0 10px", fontSize: text.xs, fontWeight: 600, cursor: "pointer" }}>
              <Plus size={12} aria-hidden="true" /> {s}
            </button>
          ))}
        </div>
      )}

      {!disabled && (
        <div style={{ display: "flex", gap: space[2] }}>
          <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey} disabled={full}
            aria-label="Add a must-have requirement"
            maxLength={MUST_HAVE_LEN} placeholder={full ? `Maximum of ${MUST_HAVE_MAX} must-haves` : 'Add a requirement, e.g. "Led a team of 5+" — press Enter'} style={{ flex: 1, minWidth: 0 }} />
          <Button variant="secondary" onClick={() => { add(input); setInput(""); }} disabled={!input.trim() || full}>Add</Button>
        </div>
      )}
      <div style={{ fontSize: text.xs, color: lv.textMuted }}>
        {value.length}/{MUST_HAVE_MAX} · Each must-have gets a dedicated question, and the report marks it met, not met, or insufficient evidence.
      </div>
    </div>
  );
}
