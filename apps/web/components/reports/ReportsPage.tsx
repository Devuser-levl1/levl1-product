"use client";

import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import { Award, BarChart2, TrendingUp, Users, Star, Download } from "lucide-react";
import toast from "react-hot-toast";

const REC_CFG = {
  strong_yes: { label: "Strong Yes", color: "#059669", bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.22)" },
  yes:         { label: "Yes",         color: "#10B981", bg: "rgba(16,185,129,0.07)", border: "rgba(16,185,129,0.15)" },
  maybe:       { label: "Maybe",       color: "#D97706", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.22)" },
  no:          { label: "No",          color: "#DC2626", bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.22)"  },
} as const;

function ScoreBar({ score }: { score: number }) {
  const color = score >= 85 ? "#10B981" : score >= 70 ? "#0EA5E9" : "#F59E0B";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#F1F5F9", overflow: "hidden", maxWidth: 120 }}>
        <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 3, transition: "width 0.6s ease" }} />
      </div>
      <span className="font-mono" style={{ fontSize: 15, fontWeight: 800, color: "#0F2147", minWidth: 28, textAlign: "right" }}>
        {score}
      </span>
    </div>
  );
}

function RankMedal({ rank }: { rank: number }) {
  if (rank === 0) return <span style={{ fontSize: 18 }}>🥇</span>;
  if (rank === 1) return <span style={{ fontSize: 18 }}>🥈</span>;
  if (rank === 2) return <span style={{ fontSize: 18 }}>🥉</span>;
  return <span className="font-mono" style={{ fontSize: 13, color: "#94A3B8", minWidth: 24 }}>#{rank + 1}</span>;
}

export default function ReportsPage() {
  const { positions, candidates } = useAppStore();
  const [selectedPositionId, setSelectedPositionId] = useState<string>(positions[0]?.id ?? "");

  const selectedPosition     = positions.find((p) => p.id === selectedPositionId);
  const positionCandidates   = [...candidates]
    .filter((c) => c.positionId === selectedPositionId && c.status === "completed" && c.score !== undefined)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const allForPosition       = candidates.filter((c) => c.positionId === selectedPositionId);
  const completedCount       = positionCandidates.length;
  const avgScore             = completedCount > 0
    ? Math.round(positionCandidates.reduce((a, c) => a + (c.score ?? 0), 0) / completedCount)
    : 0;
  const strongYes            = positionCandidates.filter((c) => c.recommendation === "strong_yes" || c.recommendation === "yes").length;

  return (
    <div style={{ padding: "36px 40px", display: "flex", flexDirection: "column", gap: 28, maxWidth: 1280 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "#0F2147", letterSpacing: "-0.025em" }}>
            Reports & Rankings
          </h1>
          <p style={{ fontSize: 14, color: "#94A3B8", marginTop: 6, fontWeight: 500 }}>
            AI-evaluated candidate rankings and performance analytics.
          </p>
        </div>
        <button className="btn-ghost" onClick={() => toast.success("Report exported (mock)")}>
          <Download size={15} />
          Export PDF
        </button>
      </div>

      {/* Position selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 20px",
          background: "#fff",
          border: "1px solid #E2E8F0",
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(15,33,71,0.05)",
        }}
      >
        <BarChart2 size={16} color="#0EA5E9" />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#64748B" }}>Viewing report for:</span>
        <select
          value={selectedPositionId}
          onChange={(e) => setSelectedPositionId(e.target.value)}
          style={{
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            padding: "7px 14px",
            fontSize: 13,
            color: "#0F2147",
            fontFamily: "var(--font-sans)",
            cursor: "pointer",
            outline: "none",
            flex: 1,
            maxWidth: 400,
            fontWeight: 500,
          }}
        >
          {positions.map((p) => (
            <option key={p.id} value={p.id}>{p.title} — {p.company}</option>
          ))}
        </select>
        {selectedPosition && (
          <span className={`badge ${
            selectedPosition.status === "active" ? "badge-success"
            : selectedPosition.status === "pending_approval" ? "badge-warning"
            : "badge-muted"
          }`}>
            {selectedPosition.status === "active" ? "Active"
              : selectedPosition.status === "pending_approval" ? "Pending"
              : selectedPosition.status}
          </span>
        )}
      </div>

      {/* Position stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { icon: Users,     label: "Total Candidates", value: allForPosition.length,  sub: "uploaded for this position", color: "#0EA5E9" },
          { icon: Award,     label: "Evaluated",         value: completedCount,          sub: "interviews completed",       color: "#10B981" },
          { icon: TrendingUp, label: "Avg Score",        value: completedCount > 0 ? avgScore : "—", sub: "across all evaluations", color: "#8B5CF6" },
          { icon: Star,      label: "Recommended",       value: strongYes,               sub: "Yes or Strong Yes",          color: "#F59E0B" },
        ].map((s) => (
          <div key={s.label} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {s.label}
              </span>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `${s.color}12`, border: `1px solid ${s.color}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <s.icon size={14} color={s.color} />
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, color: "#0F2147", lineHeight: 1, letterSpacing: "-0.02em" }}>
                {s.value}
              </div>
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 6, fontWeight: 500 }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Rankings table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0F2147", display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-display)" }}>
            <Award size={16} color="#0EA5E9" />
            Candidate Rankings
          </h2>
          {completedCount > 0 && <span className="badge badge-muted">{completedCount} evaluated</span>}
        </div>

        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "60px 2fr 160px 130px 130px 120px", padding: "10px 24px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
          {["Rank", "Candidate", "Score", "Recommendation", "Completed", "Action"].map((h) => (
            <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {h}
            </div>
          ))}
        </div>

        {positionCandidates.length === 0 ? (
          <div style={{ textAlign: "center", padding: "56px 0", color: "#94A3B8" }}>
            <Award size={32} color="#CBD5E1" style={{ margin: "0 auto 12px" }} />
            <div style={{ fontSize: 14, fontWeight: 500 }}>No completed evaluations for this position</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>Evaluations will appear here once interviews are completed.</div>
          </div>
        ) : (
          positionCandidates.map((c, idx) => {
            const rec      = c.recommendation ? REC_CFG[c.recommendation as keyof typeof REC_CFG] : null;
            const initials = c.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
            const isTop    = idx === 0;

            return (
              <div
                key={c.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "60px 2fr 160px 130px 130px 120px",
                  padding: "16px 24px",
                  borderBottom: idx < positionCandidates.length - 1 ? "1px solid #F1F5F9" : "none",
                  background: isTop ? "#F8FAFF" : "transparent",
                  alignItems: "center",
                  transition: "background 0.15s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => { if (!isTop) e.currentTarget.style.background = "#FAFAFA"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = isTop ? "#F8FAFF" : "transparent"; }}
              >
                {/* Rank */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <RankMedal rank={idx} />
                </div>

                {/* Candidate */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: isTop ? "linear-gradient(135deg, rgba(14,165,233,0.12), rgba(56,189,248,0.08))" : "#F1F5F9",
                      border: `1px solid ${isTop ? "rgba(14,165,233,0.22)" : "#E2E8F0"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700,
                      color: isTop ? "#0284C7" : "#64748B",
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0F2147" }}>
                      {c.name}
                      {isTop && (
                        <span style={{ marginLeft: 8, fontSize: 10, color: "#D97706", fontWeight: 700, letterSpacing: "0.05em", background: "rgba(245,158,11,0.10)", padding: "1px 6px", borderRadius: 4 }}>
                          TOP
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{c.email}</div>
                  </div>
                </div>

                {/* Score bar */}
                <div style={{ paddingRight: 16 }}>
                  <ScoreBar score={c.score ?? 0} />
                </div>

                {/* Recommendation */}
                <div>
                  {rec ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 11,
                        fontWeight: 700,
                        color: rec.color,
                        background: rec.bg,
                        border: `1px solid ${rec.border}`,
                        padding: "3px 10px",
                        borderRadius: 100,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Star size={10} />
                      {rec.label}
                    </span>
                  ) : <span style={{ fontSize: 12, color: "#94A3B8" }}>—</span>}
                </div>

                {/* Date */}
                <div className="font-mono" style={{ fontSize: 12, color: "#64748B" }}>
                  {c.uploadedAt ? new Date(c.uploadedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                </div>

                {/* Action */}
                <div>
                  <button className="btn-ghost" style={{ fontSize: 12, padding: "6px 14px" }} onClick={() => toast(`Viewing report for ${c.name}`)}>
                    View Report
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Score distribution chart */}
      {positionCandidates.length > 0 && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0F2147", display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-display)" }}>
            <BarChart2 size={15} color="#0EA5E9" />
            Score Distribution
          </h2>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 100, paddingBottom: 8 }}>
            {positionCandidates.map((c) => {
              const heightPct = ((c.score ?? 0) / 100) * 88 + 12;
              const color     = (c.score ?? 0) >= 85 ? "#10B981" : (c.score ?? 0) >= 70 ? "#0EA5E9" : "#F59E0B";
              return (
                <div key={c.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                  <span className="font-mono" style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700 }}>{c.score}</span>
                  <div
                    style={{ width: "100%", maxWidth: 48, height: `${heightPct}%`, background: color, borderRadius: "5px 5px 0 0", opacity: 0.85, transition: "opacity 0.2s", cursor: "pointer" }}
                    title={`${c.name}: ${c.score}`}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.85")}
                  />
                  <span style={{ fontSize: 10, color: "#94A3B8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", textAlign: "center" }}>
                    {c.name.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ height: 1, background: "#F1F5F9" }} />
          <div style={{ display: "flex", gap: 20, fontSize: 12, color: "#94A3B8" }}>
            {[
              { label: "85–100 · Excellent", color: "#10B981" },
              { label: "70–84 · Good",        color: "#0EA5E9" },
              { label: "< 70 · Average",      color: "#F59E0B" },
            ].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
