"use client";

import { useMemo, useState } from "react";
import { Download, SlidersHorizontal } from "lucide-react";
import { useAppStore } from "@/store/appStore";

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
  const label = { fontSize: 11.5, fontWeight: 600, color: "#64748B", display: "block", marginBottom: 4 } as const;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", borderRadius: 9, overflow: "hidden", border: "1px solid #C7D2FE", boxShadow: "0 1px 2px rgba(79,70,229,0.06)" }}>
        <a href={href} download style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", background: "#4F46E5", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
          <Download size={14} /> Export results CSV{filtered ? " (filtered)" : ""}
        </a>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Export filters" title="Filters"
          style={{ border: "none", borderLeft: "1px solid rgba(255,255,255,0.25)", background: open ? "#4338CA" : "#4F46E5", color: "#fff", padding: "0 10px", cursor: "pointer", display: "flex", alignItems: "center" }}>
          <SlidersHorizontal size={14} />
        </button>
      </div>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 20, width: 300, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, boxShadow: "0 12px 32px rgba(15,23,42,0.12)", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={label}>Position</label>
            <select className="input" value={positionId} onChange={(e) => setPositionId(e.target.value)}>
              <option value="">All positions</option>
              {realPositions.map((p) => <option key={p.id} value={p.id}>{p.title} · {p.company}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div><label style={label}>From</label><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><label style={label}>To</label><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </div>
          <div>
            <label style={label}>Recommendation</label>
            <select className="input" value={recommendation} onChange={(e) => setRecommendation(e.target.value)}>
              <option value="">Any</option>
              <option value="strong_yes">Strong yes</option>
              <option value="yes">Yes</option>
              <option value="maybe">Maybe</option>
              <option value="no">No</option>
            </select>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button type="button" className="btn-ghost" style={{ fontSize: 12.5, padding: "5px 10px" }} onClick={() => { setPositionId(""); setFrom(""); setTo(""); setRecommendation(""); }}>Clear</button>
            <span style={{ fontSize: 11.5, color: "#94A3B8" }}>Completed interviews · demos excluded</span>
          </div>
        </div>
      )}
    </div>
  );
}
