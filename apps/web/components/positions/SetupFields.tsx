"use client";

import { Minus, Plus, Sparkles, Loader2, Trash2, ShieldAlert } from "lucide-react";
import {
  EXP_MAX_YEARS, MIX_KEYS, MIX_LABEL, MIX_MAX_PER_TYPE, MIX_MAX_TOTAL, mixTotal,
  RUBRIC_MAX, KNOCKOUT_MAX,
  type QuestionMix, type ConceptRubricItem, type KnockoutQuestion,
} from "@/lib/screen/position-config";

// ── Job-setup field components (Screen, Fixpack 3) ─────────────────────────
// Used by the New Position flow and the position page.

const box: React.CSSProperties = { border: "1px solid #E2E8F0", borderRadius: 12, padding: 14, background: "#fff" };
const small: React.CSSProperties = { fontSize: 11.5, color: "#94A3B8" };

/* ── #4 Experience min–max ─────────────────────────────────────────────── */
export function ExperienceRangeInput({ min, max, onChange }: { min: number | ""; max: number | ""; onChange: (min: number | "", max: number | "") => void }) {
  const parse = (v: string): number | "" => (v === "" ? "" : Math.max(0, Math.min(EXP_MAX_YEARS, Math.round(Number(v)))));
  const invalid = min !== "" && max !== "" && min > max;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input className="input" type="number" min={0} max={EXP_MAX_YEARS} aria-label="Minimum years" placeholder="Min" value={min}
          onChange={(e) => onChange(parse(e.target.value), max)} style={{ width: "100%", borderColor: invalid ? "#FCA5A5" : undefined }} />
        <span style={{ color: "#94A3B8", fontSize: 13 }}>to</span>
        <input className="input" type="number" min={0} max={EXP_MAX_YEARS} aria-label="Maximum years" placeholder="Max" value={max}
          onChange={(e) => onChange(min, parse(e.target.value))} style={{ width: "100%", borderColor: invalid ? "#FCA5A5" : undefined }} />
        <span style={{ color: "#94A3B8", fontSize: 13, whiteSpace: "nowrap" }}>years</span>
      </div>
      {invalid && <div role="alert" style={{ fontSize: 12, color: "#DC2626", marginTop: 5 }}>Minimum can&apos;t be more than maximum.</div>}
    </div>
  );
}

export function experienceValid(min: number | "", max: number | ""): boolean {
  return min !== "" && max !== "" && min <= max;
}

/* ── #15 Question mix ──────────────────────────────────────────────────── */
export function QuestionMixEditor({ value, onChange }: { value: QuestionMix; onChange: (v: QuestionMix) => void }) {
  const total = mixTotal(value);
  const set = (k: (typeof MIX_KEYS)[number], d: number) => {
    const n = Math.max(0, Math.min(MIX_MAX_PER_TYPE, value[k] + d));
    const next = { ...value, [k]: n };
    if (mixTotal(next) > MIX_MAX_TOTAL || mixTotal(next) === 0) return;
    onChange(next);
  };
  return (
    <div style={box}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
        {MIX_KEYS.map((k) => (
          <div key={k} style={{ border: "1px solid #F1F5F9", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1E293B" }}>{MIX_LABEL[k].label}</div>
            <div style={{ ...small, marginBottom: 8, minHeight: 30 }}>{MIX_LABEL[k].hint}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button type="button" aria-label={`Fewer ${MIX_LABEL[k].label}`} onClick={() => set(k, -1)} disabled={value[k] === 0} style={stepBtn(value[k] === 0)}><Minus size={13} /></button>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#4F46E5", minWidth: 16, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{value[k]}</span>
              <button type="button" aria-label={`More ${MIX_LABEL[k].label}`} onClick={() => set(k, +1)} disabled={value[k] >= MIX_MAX_PER_TYPE || total >= MIX_MAX_TOTAL} style={stepBtn(value[k] >= MIX_MAX_PER_TYPE || total >= MIX_MAX_TOTAL)}><Plus size={13} /></button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ ...small, marginTop: 10 }}>
        {total} question{total === 1 ? "" : "s"} · max {MIX_MAX_TOTAL} so the Q&amp;A fits the interview. Basic-concept checks are short and asked first; the others get adaptive follow-ups.
      </div>
    </div>
  );
}
function stepBtn(disabled: boolean): React.CSSProperties {
  return { width: 28, height: 28, borderRadius: 8, border: "1px solid #E2E8F0", background: disabled ? "#F8FAFC" : "#fff", color: disabled ? "#CBD5E1" : "#4F46E5", cursor: disabled ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" };
}

/* ── #13 JD-based concept rubric ───────────────────────────────────────── */
export function ConceptRubricEditor({ value, onChange, onGenerate, generating, canGenerate }: {
  value: ConceptRubricItem[]; onChange: (v: ConceptRubricItem[]) => void;
  onGenerate?: () => void; generating?: boolean; canGenerate?: boolean;
}) {
  const update = (i: number, patch: Partial<ConceptRubricItem>) => onChange(value.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const add = () => value.length < RUBRIC_MAX && onChange([...value, { id: `c${Date.now().toString(36)}`, concept: "", strong: "", weak: "" }]);
  return (
    <div style={box}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: value.length ? 12 : 0, flexWrap: "wrap" }}>
        <div style={{ flex: 1, fontSize: 12.5, color: "#64748B", minWidth: 220 }}>
          The concepts this role needs, with what a strong vs weak answer looks like. Steers question generation and grounds the report&apos;s scoring.
        </div>
        {onGenerate && (
          <button type="button" className="btn-primary" onClick={onGenerate} disabled={generating || !canGenerate} style={{ fontSize: 12.5, padding: "7px 12px", display: "inline-flex", gap: 6, alignItems: "center" }}>
            {generating ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={13} />}
            {generating ? "Generating…" : value.length ? "Regenerate from JD" : "Generate from JD"}
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {value.map((c, i) => (
          <div key={c.id} style={{ border: "1px solid #F1F5F9", borderRadius: 10, padding: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "start" }}>
            <input className="input" aria-label="Concept" placeholder="Concept, e.g. Kafka consumer groups" value={c.concept} onChange={(e) => update(i, { concept: e.target.value })} />
            <textarea className="input" aria-label="Strong answer" placeholder="Strong answer shows…" value={c.strong} onChange={(e) => update(i, { strong: e.target.value })} style={{ minHeight: 58, resize: "vertical" }} />
            <textarea className="input" aria-label="Weak answer" placeholder="Weak answer looks like…" value={c.weak} onChange={(e) => update(i, { weak: e.target.value })} style={{ minHeight: 58, resize: "vertical" }} />
            <button type="button" aria-label={`Remove ${c.concept || "concept"}`} onClick={() => onChange(value.filter((_, j) => j !== i))} style={{ border: "none", background: "none", color: "#94A3B8", cursor: "pointer", padding: 6 }}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
      <button type="button" className="btn-ghost" onClick={add} disabled={value.length >= RUBRIC_MAX} style={{ marginTop: 10, fontSize: 12.5, padding: "5px 10px", display: "inline-flex", gap: 6, alignItems: "center" }}>
        <Plus size={13} /> Add concept {value.length ? `(${value.length}/${RUBRIC_MAX})` : ""}
      </button>
    </div>
  );
}

/* ── #14 Knockout questions ────────────────────────────────────────────── */
export function KnockoutEditor({ value, onChange }: { value: KnockoutQuestion[]; onChange: (v: KnockoutQuestion[]) => void }) {
  const update = (i: number, patch: Partial<KnockoutQuestion>) => onChange(value.map((k, j) => (j === i ? { ...k, ...patch } : k)));
  const add = () => value.length < KNOCKOUT_MAX && onChange([...value, { id: `k${Date.now().toString(36)}`, question: "", requiredAnswer: "Yes" }]);
  return (
    <div style={box}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: "#64748B", marginBottom: value.length ? 12 : 0 }}>
        <ShieldAlert size={15} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Optional yes/no criteria the interviewer asks word-for-word (e.g. &ldquo;Do you hold an active AWS certification?&rdquo;). A disqualifying answer is <strong>flagged in the report for you to decide</strong> — it never rejects anyone automatically.</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {value.map((k, i) => (
          <div key={k.id} style={{ display: "grid", gridTemplateColumns: "1fr 170px auto", gap: 8, alignItems: "center" }}>
            <input className="input" aria-label="Knockout question" placeholder="e.g. Are you willing to relocate to Pune?" value={k.question} onChange={(e) => update(i, { question: e.target.value })} maxLength={200} />
            <input className="input" aria-label="Required answer" placeholder="Required answer" value={k.requiredAnswer} onChange={(e) => update(i, { requiredAnswer: e.target.value })} maxLength={120} title="The answer that passes, e.g. Yes" />
            <button type="button" aria-label="Remove knockout question" onClick={() => onChange(value.filter((_, j) => j !== i))} style={{ border: "none", background: "none", color: "#94A3B8", cursor: "pointer", padding: 6 }}><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
      <button type="button" className="btn-ghost" onClick={add} disabled={value.length >= KNOCKOUT_MAX} style={{ marginTop: 10, fontSize: 12.5, padding: "5px 10px", display: "inline-flex", gap: 6, alignItems: "center" }}>
        <Plus size={13} /> Add knockout question {value.length ? `(${value.length}/${KNOCKOUT_MAX})` : ""}
      </button>
    </div>
  );
}
