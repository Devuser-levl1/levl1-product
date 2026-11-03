"use client";

import { useMemo, useState } from "react";
import { Download, SlidersHorizontal } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import { Button, Field, Select, Input } from "@/components/screen/ui";
import { lv, space, text, radius } from "@/lib/screen/ui/tokens";

// ── CSV export of interview results (Screen F1) ────────────────────────────
// Builds the /api/reports/export URL from optional filters; the API scopes to
// the agency and always excludes demo interviews.

export function ExportResults() {
  const positions = useAppStore((s) => s.positions);
  const [open, setOpen] = useState(false);
  const [positionId, setPositionId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [recommendation, setRecommendation] = useState("");

  const href = useMemo(() => {
    const q = new URLSearchParams();
    if (positionId) q.set("positionId", positionId);
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    if (recommendation) q.set("recommendation", recommendation);
    const qs = q.toString();
    return `/api/reports/export${qs ? `?${qs}` : ""}`;
  }, [positionId, from, to, recommendation]);

  const realPositions = positions.filter((p) => !p.isDemo);
  const filtered = !!(positionId || from || to || recommendation);

  // Design-System Pass 3 (group 5): split button + filter popover on Screen tokens.
  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", borderRadius: radius.md, overflow: "hidden", boxShadow: lv.shadowSm }}>
        <a href={href} download className="lv-btn lv-btn--primary" style={{ borderRadius: 0, boxShadow: "none" }}>
          <Download size={16} aria-hidden="true" /> Export results CSV{filtered ? " (filtered)" : ""}
        </a>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="dialog" aria-label="Export filters" title="Filters"
          className="lv-btn lv-btn--primary lv-btn--icon" style={{ borderRadius: 0, boxShadow: "none", borderLeft: "1px solid rgba(255,255,255,0.3)", background: open ? lv.brandActive : undefined }}>
          <SlidersHorizontal size={16} aria-hidden="true" />
        </button>
      </div>
      {open && (
        <div role="dialog" aria-label="Export filters" style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 20, width: "min(300px, calc(100vw - 32px))", background: lv.surface, border: `1px solid ${lv.border}`, borderRadius: radius.lg, boxShadow: lv.shadowLg, padding: space[4], display: "flex", flexDirection: "column", gap: space[3] }}>
          <Field label="Position">
            <Select value={positionId} onChange={(e) => setPositionId(e.target.value)}>
              <option value="">All positions</option>
              {realPositions.map((p) => <option key={p.id} value={p.id}>{p.title} · {p.company}</option>)}
            </Select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space[2] }}>
            <Field label="From"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
            <Field label="To"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
          </div>
          <Field label="Recommendation">
            <Select value={recommendation} onChange={(e) => setRecommendation(e.target.value)}>
              <option value="">Any</option>
              <option value="strong_yes">Strong yes</option>
              <option value="yes">Yes</option>
              <option value="maybe">Maybe</option>
              <option value="no">No</option>
            </Select>
          </Field>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: space[2] }}>
            <Button variant="tertiary" size="sm" onClick={() => { setPositionId(""); setFrom(""); setTo(""); setRecommendation(""); }}>Clear</Button>
            <span style={{ fontSize: text.xs, color: lv.textMuted }}>Completed interviews · demos excluded</span>
          </div>
        </div>
      )}
    </div>
  );
}
