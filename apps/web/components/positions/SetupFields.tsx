"use client";

import { Minus, Plus, Sparkles, Trash2, ShieldAlert } from "lucide-react";
import {
  EXP_MAX_YEARS, MIX_KEYS, MIX_LABEL, MIX_MAX_PER_TYPE, MIX_MAX_TOTAL, mixTotal,
  RUBRIC_MAX, KNOCKOUT_MAX,
  type QuestionMix, type ConceptRubricItem, type KnockoutQuestion,
} from "@/lib/screen/position-config";
import { Button, Input, Textarea } from "@/components/screen/ui";
import { lv, space, text, radius } from "@/lib/screen/ui/tokens";

// ── Job-setup field components (Screen, Fixpack 3) ─────────────────────────
// Used by the New Position flow and the position page.

const box: React.CSSProperties = { border: `1px solid ${lv.border}`, borderRadius: radius.md, padding: space[3], background: lv.surface };
const small: React.CSSProperties = { fontSize: text.xs, color: lv.textMuted };

/* ── #4 Experience min–max ─────────────────────────────────────────────── */
export function ExperienceRangeInput({ min, max, onChange }: { min: number | ""; max: number | ""; onChange: (min: number | "", max: number | "") => void }) {
  const parse = (v: string): number | "" => (v === "" ? "" : Math.max(0, Math.min(EXP_MAX_YEARS, Math.round(Number(v)))));
  const invalid = min !== "" && max !== "" && min > max;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
        <Input type="number" min={0} max={EXP_MAX_YEARS} aria-label="Minimum years" placeholder="Min" value={min}
          onChange={(e) => onChange(parse(e.target.value), max)} aria-invalid={invalid || undefined} style={{ width: "100%" }} />
        <span style={{ color: lv.textMuted, fontSize: text.sm }}>to</span>
        <Input type="number" min={0} max={EXP_MAX_YEARS} aria-label="Maximum years" placeholder="Max" value={max}
          onChange={(e) => onChange(min, parse(e.target.value))} aria-invalid={invalid || undefined} style={{ width: "100%" }} />
        <span style={{ color: lv.textMuted, fontSize: text.sm, whiteSpace: "nowrap" }}>years</span>
      </div>
      {invalid && <div role="alert" className="lv-error" style={{ display: "block", marginTop: space[1] }}>Minimum can&apos;t be more than maximum.</div>}
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: space[3] }}>
        {MIX_KEYS.map((k) => (
          <div key={k} role="group" aria-label={MIX_LABEL[k].label} style={{ border: `1px solid ${lv.border}`, borderRadius: radius.md, padding: `${space[3]}px ${space[3]}px`, background: lv.surfaceSunken }}>
            <div style={{ fontSize: text.sm, fontWeight: 700, color: lv.text }}>{MIX_LABEL[k].label}</div>
            <div style={{ ...small, marginBottom: space[2], minHeight: 30 }}>{MIX_LABEL[k].hint}</div>
            <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
              <Button variant="secondary" size="sm" iconOnly aria-label={`Fewer ${MIX_LABEL[k].label}`} onClick={() => set(k, -1)} disabled={value[k] === 0}><Minus size={14} /></Button>
              <span aria-live="polite" style={{ fontSize: text.md, fontWeight: 800, color: lv.brandText, minWidth: 16, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{value[k]}</span>
              <Button variant="secondary" size="sm" iconOnly aria-label={`More ${MIX_LABEL[k].label}`} onClick={() => set(k, +1)} disabled={value[k] >= MIX_MAX_PER_TYPE || total >= MIX_MAX_TOTAL}><Plus size={14} /></Button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ ...small, marginTop: space[3] }}>
        {total} question{total === 1 ? "" : "s"} · max {MIX_MAX_TOTAL} so the Q&amp;A fits the interview. Basic-concept checks are short and asked first; the others get adaptive follow-ups.
      </div>
    </div>
  );
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
      <div style={{ display: "flex", alignItems: "center", gap: space[3], marginBottom: value.length ? space[3] : 0, flexWrap: "wrap" }}>
        <div style={{ flex: 1, fontSize: text.sm, color: lv.textMuted, minWidth: 220 }}>
          The concepts this role needs, with what a strong vs weak answer looks like. Steers question generation and grounds the report&apos;s scoring.
        </div>
        {onGenerate && (
          <Button size="sm" onClick={onGenerate} disabled={!canGenerate} loading={generating} leftIcon={<Sparkles size={14} />}>
            {generating ? "Generating…" : value.length ? "Regenerate from JD" : "Generate from JD"}
          </Button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
        {value.map((c, i) => (
          <div key={c.id} style={{ border: `1px solid ${lv.border}`, borderRadius: radius.md, padding: space[3], display: "flex", flexWrap: "wrap", gap: space[2], alignItems: "flex-start", background: lv.surfaceSunken }}>
            <Input aria-label="Concept" placeholder="Concept, e.g. Kafka consumer groups" value={c.concept} onChange={(e) => update(i, { concept: e.target.value })} style={{ flex: "1 1 180px", minWidth: 0 }} />
            <Textarea aria-label="Strong answer" placeholder="Strong answer shows…" value={c.strong} onChange={(e) => update(i, { strong: e.target.value })} style={{ flex: "1 1 180px", minWidth: 0, minHeight: 64, resize: "vertical" }} />
            <Textarea aria-label="Weak answer" placeholder="Weak answer looks like…" value={c.weak} onChange={(e) => update(i, { weak: e.target.value })} style={{ flex: "1 1 180px", minWidth: 0, minHeight: 64, resize: "vertical" }} />
            <Button variant="ghost" size="sm" iconOnly aria-label={`Remove ${c.concept || "concept"}`} onClick={() => onChange(value.filter((_, j) => j !== i))}><Trash2 size={15} /></Button>
          </div>
        ))}
      </div>
      <Button variant="tertiary" size="sm" leftIcon={<Plus size={14} />} onClick={add} disabled={value.length >= RUBRIC_MAX} style={{ marginTop: space[3] }}>
        Add concept {value.length ? `(${value.length}/${RUBRIC_MAX})` : ""}
      </Button>
    </div>
  );
}

/* ── #14 Knockout questions ────────────────────────────────────────────── */
export function KnockoutEditor({ value, onChange }: { value: KnockoutQuestion[]; onChange: (v: KnockoutQuestion[]) => void }) {
  const update = (i: number, patch: Partial<KnockoutQuestion>) => onChange(value.map((k, j) => (j === i ? { ...k, ...patch } : k)));
  const add = () => value.length < KNOCKOUT_MAX && onChange([...value, { id: `k${Date.now().toString(36)}`, question: "", requiredAnswer: "Yes" }]);
  return (
    <div style={box}>
      <div style={{ display: "flex", gap: space[2], alignItems: "flex-start", fontSize: text.sm, color: lv.textMuted, marginBottom: value.length ? space[3] : 0 }}>
        <ShieldAlert size={16} color={lv.warning} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Optional yes/no criteria the interviewer asks word-for-word (e.g. &ldquo;Do you hold an active AWS certification?&rdquo;). A disqualifying answer is <strong style={{ color: lv.textBody }}>flagged in the report for you to decide</strong> — it never rejects anyone automatically.</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
        {value.map((k, i) => (
          <div key={k.id} style={{ display: "flex", flexWrap: "wrap", gap: space[2], alignItems: "center" }}>
            <Input aria-label="Knockout question" placeholder="e.g. Are you willing to relocate to Pune?" value={k.question} onChange={(e) => update(i, { question: e.target.value })} maxLength={200} style={{ flex: "3 1 240px", minWidth: 0 }} />
            <Input aria-label="Required answer" placeholder="Required answer" value={k.requiredAnswer} onChange={(e) => update(i, { requiredAnswer: e.target.value })} maxLength={120} title="The answer that passes, e.g. Yes" style={{ flex: "1 1 140px", minWidth: 0 }} />
            <Button variant="ghost" size="sm" iconOnly aria-label="Remove knockout question" onClick={() => onChange(value.filter((_, j) => j !== i))}><Trash2 size={15} /></Button>
          </div>
        ))}
      </div>
      <Button variant="tertiary" size="sm" leftIcon={<Plus size={14} />} onClick={add} disabled={value.length >= KNOCKOUT_MAX} style={{ marginTop: space[3] }}>
        Add knockout question {value.length ? `(${value.length}/${KNOCKOUT_MAX})` : ""}
      </Button>
    </div>
  );
}
