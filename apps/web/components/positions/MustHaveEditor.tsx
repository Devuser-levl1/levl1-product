"use client";

import { useState, KeyboardEvent } from "react";
import { ShieldCheck, Plus, X } from "lucide-react";
import { MUST_HAVE_LEN, MUST_HAVE_MAX } from "@/lib/screen/recruiter/must-haves";

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
    <div style={{ border: "1px solid #E0E7FF", background: "#FAFBFF", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, minHeight: 28, alignItems: "center" }}>
        {value.length === 0 && <span style={{ fontSize: 12.5, color: "#94A3B8" }}>No must-haves yet — the interview treats every skill equally.</span>}
        {value.map((m) => (
          <span key={m} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#4F46E5", color: "#fff", borderRadius: 100, padding: "5px 6px 5px 10px", fontSize: 12.5, fontWeight: 600 }}>
            <ShieldCheck size={13} /> {m}
            {!disabled && (
              <button type="button" onClick={() => remove(m)} aria-label={`Remove ${m}`} style={{ border: "none", background: "rgba(255,255,255,0.2)", color: "#fff", width: 18, height: 18, borderRadius: 9, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                <X size={11} />
              </button>
            )}
          </span>
        ))}
      </div>

      {!disabled && open.length > 0 && !full && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11.5, color: "#64748B", fontWeight: 600, marginRight: 2 }}>Mark a skill:</span>
          {open.map((s) => (
            <button key={s} type="button" onClick={() => add(s)}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, border: "1px dashed #A5B4FC", background: "#fff", color: "#4F46E5", borderRadius: 100, padding: "3px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <Plus size={11} /> {s}
            </button>
          ))}
        </div>
      )}

      {!disabled && (
        <div style={{ display: "flex", gap: 8 }}>
          <input className="input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey} disabled={full}
            maxLength={MUST_HAVE_LEN} placeholder={full ? `Maximum of ${MUST_HAVE_MAX} must-haves` : 'Add a requirement, e.g. "Led a team of 5+" — press Enter'} style={{ flex: 1 }} />
          <button type="button" className="btn-ghost" onClick={() => { add(input); setInput(""); }} disabled={!input.trim() || full}>Add</button>
        </div>
      )}
      <div style={{ fontSize: 11.5, color: "#94A3B8" }}>
        {value.length}/{MUST_HAVE_MAX} · Each must-have gets a dedicated question, and the report marks it met, not met, or insufficient evidence.
      </div>
    </div>
  );
}
