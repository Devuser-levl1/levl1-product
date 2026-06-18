"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/appStore";

// ── Interview Analytics (Build I-P0-2) ──────────────────────────────────────
// Six metrics over the agency's real (non-demo) interviews. All aggregation is
// done in-DB by /api/analytics/interviews; this component only renders.
//
// Render-loop safety (the bug fixed in Part 1):
//   • ONE effect, keyed on a SERIALIZED filter string (`key`) — never on object
//     identities, so it can't refetch every render.
//   • An `alive` guard prevents setState after unmount/filter-change races.
//   • The default date range is computed once in a useState initializer, never
//     from `new Date()` during render — so no SSR/client hydration mismatch.

const INDIGO = "#4F46E5";
const VIOLET = "#7C3AED";

interface Rate { n: number; count: number; rate: number | null }
interface Analytics {
  filters: { positionId: string | null; from: string; to: string };
  passFail: { threshold: number; pass: number; fail: number; insufficient: number } & Rate;
  scoreDistribution: { buckets: { label: string; lo: number; hi: number; count: number }[]; n: number };
  l2: Rate;
  completion: { byReason: Record<string, number> } & Rate;
  timeToComplete: { avgMin: number | null; medianMin: number | null; n: number };
  integrity: Rate;
}

function isoDay(d: Date) { return d.toISOString().slice(0, 10); }
const pct = (r: number | null) => (r == null ? "—" : `${Math.round(r * 100)}%`);

export default function AnalyticsPage() {
  const positions = useAppStore((s) => s.positions);

  // Defaults computed ONCE (initializer) — not during render → no hydration flash.
  const [from, setFrom] = useState(() => isoDay(new Date(Date.now() - 90 * 86400000)));
  const [to, setTo] = useState(() => isoDay(new Date()));
  const [positionId, setPositionId] = useState("");

  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable string key: the effect only re-runs when an actual filter value changes.
  const key = useMemo(() => `${positionId}|${from}|${to}`, [positionId, from, to]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (positionId) qs.set("positionId", positionId);
    qs.set("from", from);
    qs.set("to", to);
    fetch(`/api/analytics/interviews?${qs.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: Analytics) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "Failed to load analytics"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` encodes from/to/positionId
  }, [key]);

  return (
    <div style={{ padding: "36px 40px", display: "flex", flexDirection: "column", gap: 24, maxWidth: 1180 }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, color: INDIGO, letterSpacing: "-0.025em" }}>
          Interview Analytics
        </h1>
        <p style={{ fontSize: 14, color: "#94A3B8", marginTop: 6, fontWeight: 500 }}>
          Real interviews only — demo sessions are excluded. Rates show their sample size (N).
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
        <Field label="Position / role">
          <select value={positionId} onChange={(e) => setPositionId(e.target.value)} style={selStyle}>
            <option value="">All positions</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>{p.title}{p.company ? ` · ${p.company}` : ""}</option>
            ))}
          </select>
        </Field>
        <Field label="From"><input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} style={selStyle} /></Field>
        <Field label="To"><input type="date" value={to} min={from} max={isoDay(new Date())} onChange={(e) => setTo(e.target.value)} style={selStyle} /></Field>
      </div>

      {error && <Banner tone="error">Couldn&apos;t load analytics: {error}</Banner>}
      {loading && !data && <Banner tone="muted">Loading analytics…</Banner>}

      {data && (
        <div style={{ opacity: loading ? 0.55 : 1, transition: "opacity 0.15s", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Headline metric cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16 }}>
            <Metric label="Pass rate" value={pct(data.passFail.rate)} n={data.passFail.n}
              sub={`${data.passFail.pass} pass · ${data.passFail.fail} fail · ≥${data.passFail.threshold}`} accent={INDIGO} />
            <Metric label="L2 advance rate" value={pct(data.l2.rate)} n={data.l2.n}
              sub={`${data.l2.count} advanced to L2`} accent={VIOLET} />
            <Metric label="Completion rate" value={pct(data.completion.rate)} n={data.completion.n}
              sub={`${data.completion.count} completed of ${data.completion.n} started`} accent="#10B981" />
            <Metric label="Integrity-flag rate" value={pct(data.integrity.rate)} n={data.integrity.n}
              sub={`${data.integrity.count} flagged for review`} accent="#F59E0B" />
            <Metric label="Avg time-to-complete" value={data.timeToComplete.avgMin == null ? "—" : `${data.timeToComplete.avgMin}m`} n={data.timeToComplete.n}
              sub={`median ${data.timeToComplete.medianMin == null ? "—" : `${data.timeToComplete.medianMin}m`} · 30m envelope`} accent="#0EA5E9" />
            <Metric label="Insufficient evidence" value={String(data.passFail.insufficient)} n={data.passFail.insufficient}
              sub="Excluded from pass/fail (not failed)" accent="#94A3B8" />
          </div>

          {/* Score distribution histogram */}
          <Card title="Score distribution" badge={`N = ${data.scoreDistribution.n}`}>
            <Histogram buckets={data.scoreDistribution.buckets} threshold={data.passFail.threshold} />
          </Card>

          {/* Completion breakdown by termination reason */}
          <Card title="How sessions ended" badge={`N = ${data.completion.n}`}>
            <ReasonBars byReason={data.completion.byReason} total={data.completion.n} />
          </Card>
        </div>
      )}
    </div>
  );
}

// ── presentational bits ─────────────────────────────────────────────────────
const selStyle: React.CSSProperties = {
  height: 38, padding: "0 12px", borderRadius: 9, border: "1px solid #E2E8F0",
  background: "#fff", fontSize: 13, color: "#334155", fontFamily: "var(--font-sans)", minWidth: 150,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      {children}
    </label>
  );
}

function Banner({ tone, children }: { tone: "error" | "muted"; children: React.ReactNode }) {
  const c = tone === "error" ? { bg: "#FEF2F2", fg: "#B91C1C", bd: "#FECACA" } : { bg: "#F8FAFC", fg: "#64748B", bd: "#E2E8F0" };
  return <div style={{ padding: "12px 16px", borderRadius: 10, background: c.bg, color: c.fg, border: `1px solid ${c.bd}`, fontSize: 13, fontWeight: 600 }}>{children}</div>;
}

function Metric({ label, value, sub, n, accent }: { label: string; value: string; sub: string; n: number; accent: string }) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, color: accent, lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</span>
        <span className="font-mono" style={{ fontSize: 11, color: "#CBD5E1", fontWeight: 600 }}>N={n}</span>
      </div>
      <span style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 500 }}>{sub}</span>
    </div>
  );
}

function Card({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: INDIGO, fontFamily: "var(--font-display)" }}>{title}</h2>
        {badge && <span className="font-mono" style={{ fontSize: 11, color: "#94A3B8" }}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function Histogram({ buckets, threshold }: { buckets: { label: string; lo: number; count: number }[]; threshold: number }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  if (buckets.every((b) => b.count === 0)) return <Empty>No scored interviews in this range.</Empty>;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 180, paddingTop: 8 }}>
      {buckets.map((b) => {
        const isPass = b.lo >= threshold;
        return (
          <div key={b.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
            <span className="font-mono" style={{ fontSize: 11, color: "#64748B", fontWeight: 700 }}>{b.count || ""}</span>
            <div title={`${b.label}: ${b.count}`} style={{
              width: "100%", height: `${(b.count / max) * 100}%`, minHeight: b.count ? 4 : 0,
              borderRadius: "6px 6px 0 0",
              background: isPass ? `linear-gradient(180deg, ${VIOLET}, ${INDIGO})` : "#E2E8F0",
            }} />
            <span style={{ fontSize: 10, color: "#94A3B8", fontFamily: "var(--font-mono)" }}>{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}

const REASON_META: Record<string, { label: string; color: string }> = {
  COMPLETED: { label: "Completed", color: "#10B981" },
  TERMINATED_BY_CANDIDATE: { label: "Ended by candidate", color: "#F59E0B" },
  CONSENT_WITHDRAWN: { label: "Consent withdrawn", color: "#EF4444" },
  ABANDONED: { label: "Abandoned", color: "#94A3B8" },
};

function ReasonBars({ byReason, total }: { byReason: Record<string, number>; total: number }) {
  if (total === 0) return <Empty>No interviews started in this range.</Empty>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Object.entries(REASON_META).map(([k, meta]) => {
        const v = byReason[k] ?? 0;
        const p = total > 0 ? Math.round((v / total) * 100) : 0;
        return (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 150, fontSize: 12.5, color: "#475569", fontWeight: 600 }}>{meta.label}</span>
            <div style={{ flex: 1, height: 8, borderRadius: 4, background: "#F1F5F9", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${p}%`, background: meta.color, borderRadius: 4, transition: "width 0.4s ease" }} />
            </div>
            <span className="font-mono" style={{ width: 64, textAlign: "right", fontSize: 12, color: "#64748B" }}>{v} · {p}%</span>
          </div>
        );
      })}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ textAlign: "center", padding: "28px 0", color: "#94A3B8", fontSize: 13 }}>{children}</div>;
}
