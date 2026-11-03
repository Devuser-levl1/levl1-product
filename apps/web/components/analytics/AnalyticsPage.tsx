"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { Page, PageHeader, Alert, Field as FormField, Select, Input, Badge } from "@/components/screen/ui";
import { lv, space, text, radius } from "@/lib/screen/ui/tokens";

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

// Design-System Pass 3 (group 5): chart + card colours come from the Screen tokens.
const INDIGO = lv.brand;
const VIOLET = lv.accent;

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
    <Page style={{ maxWidth: 1180 }}>
      <PageHeader
        title="Analytics"
        description="Real interviews only — demo interviews are excluded. Rates show their sample size (N)."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: space[6] }}>
      {/* Filters */}
      <div role="group" aria-label="Analytics filters" style={{ display: "flex", flexWrap: "wrap", gap: space[3], alignItems: "flex-end" }}>
        <FormField label="Position" style={{ minWidth: 200 }}>
          <Select value={positionId} onChange={(e) => setPositionId(e.target.value)}>
            <option value="">All positions</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>{p.title}{p.company ? ` · ${p.company}` : ""}</option>
            ))}
          </Select>
        </FormField>
        <FormField label="From"><Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></FormField>
        <FormField label="To"><Input type="date" value={to} min={from} max={isoDay(new Date())} onChange={(e) => setTo(e.target.value)} /></FormField>
      </div>

      {error && <Alert tone="danger" title="Couldn't load analytics">{error}</Alert>}
      {loading && !data && (
        <div role="status" style={{ display: "flex", alignItems: "center", gap: space[2], color: lv.textMuted, fontSize: text.sm, padding: space[4] }}>
          <span className="lv-spinner" aria-hidden="true" style={{ color: lv.brand }} /> Loading analytics…
        </div>
      )}

      {data && (
        <div aria-busy={loading || undefined} style={{ opacity: loading ? 0.55 : 1, transition: "opacity 0.15s", display: "flex", flexDirection: "column", gap: space[5] }}>
          {/* Headline metric cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: space[4] }}>
            <Metric label="Pass rate" value={pct(data.passFail.rate)} n={data.passFail.n}
              sub={`${data.passFail.pass} pass · ${data.passFail.fail} fail · ≥${data.passFail.threshold}`} accent={INDIGO} />
            <Metric label="L2 advance rate" value={pct(data.l2.rate)} n={data.l2.n}
              sub={`${data.l2.count} advanced to L2`} accent={VIOLET} />
            <Metric label="Completion rate" value={pct(data.completion.rate)} n={data.completion.n}
              sub={`${data.completion.count} completed of ${data.completion.n} started`} accent={lv.success} />
            <Metric label="Integrity-flag rate" value={pct(data.integrity.rate)} n={data.integrity.n}
              sub={`${data.integrity.count} flagged for review`} accent={lv.warning} />
            <Metric label="Avg time-to-complete" value={data.timeToComplete.avgMin == null ? "—" : `${data.timeToComplete.avgMin}m`} n={data.timeToComplete.n}
              sub={`median ${data.timeToComplete.medianMin == null ? "—" : `${data.timeToComplete.medianMin}m`} · 30m envelope`} accent={lv.info} />
            <Metric label="Insufficient evidence" value={String(data.passFail.insufficient)} n={data.passFail.insufficient}
              sub="Excluded from pass/fail (not failed)" accent={lv.textMuted} />
          </div>

          {/* Score distribution histogram */}
          <Card title="Score distribution" badge={`N = ${data.scoreDistribution.n}`}>
            <Histogram buckets={data.scoreDistribution.buckets} threshold={data.passFail.threshold} />
          </Card>

          {/* Completion breakdown by termination reason */}
          <Card title="How interviews ended" badge={`N = ${data.completion.n}`}>
            <ReasonBars byReason={data.completion.byReason} total={data.completion.n} />
          </Card>
        </div>
      )}
      </div>
    </Page>
  );
}

// ── presentational bits ─────────────────────────────────────────────────────
function Metric({ label, value, sub, n, accent }: { label: string; value: string; sub: string; n: number; accent: string }) {
  return (
    <section className="lv-card lv-card--pad" aria-label={label} style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
      <span className="lv-eyebrow" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 4, background: accent }} />{label}
      </span>
      <div style={{ display: "flex", alignItems: "baseline", gap: space[2] }}>
        <span style={{ fontFamily: lv.fontDisplay, fontSize: text["2xl"], fontWeight: 700, color: lv.text, lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</span>
        <span className="font-mono" style={{ fontSize: 11, color: lv.textMuted, fontWeight: 600 }}>N={n}</span>
      </div>
      <span style={{ fontSize: text.xs, color: lv.textMuted, fontWeight: 500 }}>{sub}</span>
    </section>
  );
}

function Card({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <section className="lv-card lv-card--pad" style={{ display: "flex", flexDirection: "column", gap: space[4] }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 className="lv-card__title">{title}</h2>
        {badge && <Badge tone="neutral">{badge}</Badge>}
      </div>
      {children}
    </section>
  );
}

function Histogram({ buckets, threshold }: { buckets: { label: string; lo: number; count: number }[]; threshold: number }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  if (buckets.every((b) => b.count === 0)) return <Empty>No scored interviews in this range.</Empty>;
  return (
    <figure style={{ margin: 0 }}>
      <div role="img" aria-label={`Score distribution: ${buckets.map((b) => `${b.label}: ${b.count}`).join(", ")}. Pass threshold ${threshold}.`}
        style={{ display: "flex", alignItems: "flex-end", gap: space[2], height: 180, paddingTop: space[2] }}>
        {buckets.map((b) => {
          const isPass = b.lo >= threshold;
          return (
            <div key={b.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
              <span className="font-mono" style={{ fontSize: 11, color: lv.textBody, fontWeight: 700 }}>{b.count || ""}</span>
              <div title={`${b.label}: ${b.count}`} style={{
                width: "100%", height: `${(b.count / max) * 100}%`, minHeight: b.count ? 4 : 0,
                borderRadius: `${radius.sm}px ${radius.sm}px 0 0`,
                background: isPass ? INDIGO : lv.borderStrong,
              }} />
              <span style={{ fontSize: 11, color: lv.textMuted, fontFamily: lv.fontMono }}>{b.label}</span>
            </div>
          );
        })}
      </div>
      <figcaption style={{ display: "flex", gap: space[4], marginTop: space[3], fontSize: text.xs, color: lv.textMuted }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 2, background: INDIGO }} /> At or above pass threshold ({threshold})</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 2, background: lv.borderStrong }} /> Below</span>
      </figcaption>
    </figure>
  );
}

const REASON_META: Record<string, { label: string; color: string }> = {
  COMPLETED: { label: "Completed", color: lv.success },
  TERMINATED_BY_CANDIDATE: { label: "Ended by candidate", color: lv.warning },
  CONSENT_WITHDRAWN: { label: "Consent withdrawn", color: lv.danger },
  ABANDONED: { label: "Abandoned", color: lv.textMuted },
};

function ReasonBars({ byReason, total }: { byReason: Record<string, number>; total: number }) {
  if (total === 0) return <Empty>No interviews started in this range.</Empty>;
  return (
    <ul style={{ display: "flex", flexDirection: "column", gap: space[3], listStyle: "none", margin: 0, padding: 0 }}>
      {Object.entries(REASON_META).map(([k, meta]) => {
        const v = byReason[k] ?? 0;
        const p = total > 0 ? Math.round((v / total) * 100) : 0;
        return (
          <li key={k} style={{ display: "flex", alignItems: "center", gap: space[3], flexWrap: "wrap" }}>
            <span style={{ width: 150, fontSize: text.sm, color: lv.textBody, fontWeight: 600 }}>{meta.label}</span>
            <div aria-hidden="true" style={{ flex: "1 1 120px", height: 8, borderRadius: 4, background: lv.surfaceMuted, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${p}%`, background: meta.color, borderRadius: 4, transition: "width 0.4s ease" }} />
            </div>
            <span className="font-mono" style={{ width: 72, textAlign: "right", fontSize: text.xs, color: lv.textBody }}>{v} · {p}%</span>
          </li>
        );
      })}
    </ul>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ textAlign: "center", padding: `${space[6]}px 0`, color: lv.textMuted, fontSize: text.sm }}>{children}</div>;
}
