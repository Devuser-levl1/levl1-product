"use client";

import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import {
  Award, BarChart2, TrendingUp, Users, Star, Download,
  ChevronDown, ChevronUp, Sparkles, Loader2, AlertTriangle,
  CheckCircle2, Target, Lightbulb, Globe, Flag, Trophy,
} from "lucide-react";
import toast from "react-hot-toast";

/* ─── Recommendation config ─────────────────────────────────────────── */
const REC_CFG = {
  strong_yes: { label: "Strong Yes", color: "#059669", bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.22)" },
  yes:        { label: "Yes",        color: "#10B981", bg: "rgba(16,185,129,0.07)", border: "rgba(16,185,129,0.15)" },
  maybe:      { label: "Maybe",      color: "#D97706", bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.22)" },
  no:         { label: "No",         color: "#DC2626", bg: "rgba(239,68,68,0.10)",  border: "rgba(239,68,68,0.22)"  },
} as const;

/* ─── Helpers ────────────────────────────────────────────────────────── */
function ScoreBar({ score, max = 120 }: { score: number; max?: number }) {
  const color = score >= 85 ? "#10B981" : score >= 70 ? "#0EA5E9" : "#F59E0B";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: "#F1F5F9", overflow: "hidden", maxWidth: max }}>
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

/** Derive plausible section scores from an overall score with mild jitter */
function deriveSectionScores(overall: number, seed: string) {
  const hash = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const jitter = (offset: number) => Math.min(100, Math.max(30, Math.round(overall + (((hash + offset) % 21) - 10))));
  return {
    technical:  jitter(1),
    behavioral: jitter(7),
    scenario:   jitter(13),
    eq:         jitter(17),
  };
}

/* ─── Main component ─────────────────────────────────────────────────── */
export default function ReportsPage() {
  const { positions, candidates, positionReports, addPositionReport } = useAppStore();

  const [selectedPositionId, setSelectedPositionId]   = useState<string>(positions[0]?.id ?? "");
  const [reportTab, setReportTab]                     = useState<"rankings" | "summary">("rankings");
  const [expandedId, setExpandedId]                   = useState<string | null>(null);
  const [candidateSummaries, setCandidateSummaries]   = useState<Record<string, string>>({});
  const [generatingSummary, setGeneratingSummary]     = useState<Record<string, boolean>>({});
  const [generatingPosSummary, setGeneratingPosSummary] = useState(false);

  /* ── Derived data ── */
  const selectedPosition   = positions.find((p) => p.id === selectedPositionId);
  const positionCandidates = [...candidates]
    .filter((c) => c.positionId === selectedPositionId && c.status === "completed" && c.score !== undefined)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const allForPosition     = candidates.filter((c) => c.positionId === selectedPositionId);
  const completedCount     = positionCandidates.length;
  const avgScore           = completedCount > 0
    ? Math.round(positionCandidates.reduce((a, c) => a + (c.score ?? 0), 0) / completedCount)
    : 0;
  const strongYes          = positionCandidates.filter((c) => c.recommendation === "strong_yes" || c.recommendation === "yes").length;
  const existingReport     = positionReports[selectedPositionId] ?? null;

  /* ── Toggle / generate candidate summary ── */
  async function toggleCandidateReport(candidateId: string, candidateName: string, score: number) {
    if (expandedId === candidateId) { setExpandedId(null); return; }
    setExpandedId(candidateId);

    if (candidateSummaries[candidateId]) return; // already fetched
    setGeneratingSummary((p) => ({ ...p, [candidateId]: true }));

    const sectionScores = deriveSectionScores(score, candidateId);
    const candidate     = candidates.find((c) => c.id === candidateId);

    try {
      const res = await fetch("/api/generate-candidate-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName,
          positionTitle: selectedPosition?.title ?? "",
          resumeHighlights:
            [
              candidate?.currentTitle && candidate?.currentCompany
                ? `${candidate.currentTitle} at ${candidate.currentCompany}`
                : null,
              candidate?.totalYearsExperience != null
                ? `${candidate.totalYearsExperience} years of experience`
                : null,
              candidate?.topSkills?.length
                ? `Key skills: ${candidate.topSkills.join(", ")}`
                : null,
            ]
              .filter(Boolean)
              .join(". ") || "Senior professional with relevant domain experience.",
          sectionScores,
          recommendation: candidate?.recommendation ?? "maybe",
          strengthAreas:  candidate?.topSkills?.slice(0, 2) ?? [],
          concernAreas:   [],
        }),
      });
      const data = await res.json();
      if (data.summary) {
        setCandidateSummaries((p) => ({ ...p, [candidateId]: data.summary }));
      } else {
        toast.error("Could not generate summary");
      }
    } catch {
      toast.error("Summary generation failed");
    } finally {
      setGeneratingSummary((p) => ({ ...p, [candidateId]: false }));
    }
  }

  /* ── Generate position summary ── */
  async function handleGeneratePositionSummary() {
    if (completedCount < 3) {
      toast.error("Need at least 3 completed interviews to generate a position summary.");
      return;
    }
    setGeneratingPosSummary(true);
    try {
      const completedCandidates = positionCandidates.map((c) => {
        const ss = deriveSectionScores(c.score ?? 0, c.id);
        return {
          name:          c.name,
          score:         c.score ?? 0,
          recommendation: c.recommendation ?? "maybe",
          strengthAreas: c.topSkills?.slice(0, 3) ?? [],
          concernAreas:  [],
          sectionScores: ss,
        };
      });
      const res = await fetch("/api/generate-position-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position: {
            title:           selectedPosition?.title,
            company:         selectedPosition?.company,
            department:      selectedPosition?.department,
            techStack:       selectedPosition?.techStack,
            experienceLevel: selectedPosition?.experienceLevel,
          },
          completedCandidates,
        }),
      });
      const data = await res.json();
      if (data.overallInsights) {
        addPositionReport(selectedPositionId, {
          positionId:        selectedPositionId,
          generatedAt:       new Date().toISOString(),
          overallInsights:   data.overallInsights,
          commonStrengths:   data.commonStrengths ?? [],
          commonGaps:        data.commonGaps ?? [],
          marketObservation: data.marketObservation ?? "",
          questionHealthFlags: data.questionHealthFlags ?? [],
        });
        toast.success("Position summary generated!");
      } else {
        toast.error(data.error ?? "Generation failed");
      }
    } catch {
      toast.error("Position summary generation failed");
    } finally {
      setGeneratingPosSummary(false);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ padding: "36px 40px", display: "flex", flexDirection: "column", gap: 28, maxWidth: 1280 }}>

      {/* ── Header ── */}
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

      {/* ── Position selector ── */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 12,
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
          onChange={(e) => { setSelectedPositionId(e.target.value); setExpandedId(null); setReportTab("rankings"); }}
          style={{
            background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8,
            padding: "7px 14px", fontSize: 13, color: "#0F2147",
            fontFamily: "var(--font-sans)", cursor: "pointer", outline: "none",
            flex: 1, maxWidth: 400, fontWeight: 500,
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

      {/* ── Stats row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { icon: Users,      label: "Total Candidates", value: allForPosition.length,              sub: "uploaded for this position", color: "#0EA5E9" },
          { icon: Award,      label: "Evaluated",        value: completedCount,                     sub: "interviews completed",       color: "#10B981" },
          { icon: TrendingUp, label: "Avg Score",        value: completedCount > 0 ? avgScore : "—", sub: "across all evaluations",   color: "#8B5CF6" },
          { icon: Star,       label: "Recommended",      value: strongYes,                          sub: "Yes or Strong Yes",          color: "#F59E0B" },
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

      {/* ── Tab switcher ── */}
      <div style={{ display: "flex", gap: 4, background: "#F1F5F9", padding: 4, borderRadius: 10, width: "fit-content" }}>
        {(["rankings", "summary"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setReportTab(tab)}
            style={{
              padding: "8px 20px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer",
              border: "none", transition: "all 0.15s",
              background: reportTab === tab ? "#fff" : "transparent",
              color: reportTab === tab ? "#0F2147" : "#64748B",
              boxShadow: reportTab === tab ? "0 1px 3px rgba(15,33,71,0.08)" : "none",
            }}
          >
            {tab === "rankings" ? "Candidate Rankings" : "Position Summary"}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          TAB: Candidate Rankings
      ════════════════════════════════════════════════════════════════ */}
      {reportTab === "rankings" && (
        <>
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
                const isOpen   = expandedId === c.id;
                const sScores  = deriveSectionScores(c.score ?? 0, c.id);

                return (
                  <div key={c.id}>
                    {/* Main row */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "60px 2fr 160px 130px 130px 120px",
                        padding: "16px 24px",
                        borderBottom: isOpen ? "none" : (idx < positionCandidates.length - 1 ? "1px solid #F1F5F9" : "none"),
                        background: isTop ? "#F8FAFF" : "transparent",
                        alignItems: "center",
                      }}
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
                            fontSize: 13, fontWeight: 700, color: isTop ? "#0284C7" : "#64748B", flexShrink: 0,
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
                              display: "inline-flex", alignItems: "center", gap: 5,
                              fontSize: 11, fontWeight: 700, color: rec.color,
                              background: rec.bg, border: `1px solid ${rec.border}`,
                              padding: "3px 10px", borderRadius: 100, whiteSpace: "nowrap",
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
                        <button
                          className="btn-ghost"
                          style={{ fontSize: 12, padding: "6px 14px", display: "flex", alignItems: "center", gap: 5 }}
                          onClick={() => toggleCandidateReport(c.id, c.name, c.score ?? 0)}
                        >
                          {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          {isOpen ? "Close" : "View Report"}
                        </button>
                      </div>
                    </div>

                    {/* Expanded candidate report panel */}
                    {isOpen && (
                      <div
                        style={{
                          margin: "0 16px 16px",
                          borderRadius: 12,
                          border: "1px solid #E2E8F0",
                          background: "#FAFBFF",
                          overflow: "hidden",
                        }}
                      >
                        {/* Panel header */}
                        <div
                          style={{
                            padding: "14px 20px",
                            background: "linear-gradient(135deg, rgba(14,165,233,0.06), rgba(139,92,246,0.04))",
                            borderBottom: "1px solid #E2E8F0",
                            display: "flex", alignItems: "center", gap: 8,
                          }}
                        >
                          <Sparkles size={14} color="#8B5CF6" />
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#0F2147" }}>
                            AI Candidate Report — {c.name}
                          </span>
                          {rec && (
                            <span
                              style={{
                                marginLeft: "auto", fontSize: 11, fontWeight: 700, color: rec.color,
                                background: rec.bg, border: `1px solid ${rec.border}`,
                                padding: "2px 10px", borderRadius: 100,
                              }}
                            >
                              {rec.label}
                            </span>
                          )}
                        </div>

                        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 20 }}>
                          {/* Section scores grid */}
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                              Section Scores
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                              {[
                                { label: "Technical",  score: sScores.technical,  color: "#0EA5E9" },
                                { label: "Behavioral", score: sScores.behavioral, color: "#10B981" },
                                { label: "Scenario",   score: sScores.scenario,   color: "#8B5CF6" },
                                { label: "EQ",         score: sScores.eq,         color: "#F59E0B" },
                              ].map((s) => (
                                <div
                                  key={s.label}
                                  style={{
                                    padding: "14px 16px", borderRadius: 10,
                                    background: "#fff", border: "1px solid #E2E8F0",
                                    display: "flex", flexDirection: "column", gap: 10,
                                  }}
                                >
                                  <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B" }}>{s.label}</div>
                                  <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1 }}>
                                    {s.score}
                                  </div>
                                  <div style={{ height: 4, borderRadius: 2, background: "#F1F5F9", overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${s.score}%`, background: s.color, borderRadius: 2 }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Professional summary */}
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                              Professional Summary
                            </div>
                            {generatingSummary[c.id] ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px", color: "#8B5CF6" }}>
                                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                                <span style={{ fontSize: 13, fontWeight: 500 }}>Generating AI summary…</span>
                              </div>
                            ) : candidateSummaries[c.id] ? (
                              <p style={{ fontSize: 14, lineHeight: 1.7, color: "#334155", margin: 0, padding: "16px 20px", background: "#fff", borderRadius: 10, border: "1px solid #E2E8F0" }}>
                                {candidateSummaries[c.id]}
                              </p>
                            ) : (
                              <div style={{ padding: "16px 20px", background: "#fff", borderRadius: 10, border: "1px solid #E2E8F0", color: "#94A3B8", fontSize: 13 }}>
                                Summary could not be loaded.
                              </div>
                            )}
                          </div>

                          {/* Skills */}
                          {c.topSkills && c.topSkills.length > 0 && (
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                                Key Skills Observed
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {c.topSkills.map((skill) => (
                                  <span
                                    key={skill}
                                    style={{
                                      fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 6,
                                      background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.18)",
                                      color: "#0284C7",
                                    }}
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Score Distribution chart */}
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
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB: Position Summary
      ════════════════════════════════════════════════════════════════ */}
      {reportTab === "summary" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {!existingReport ? (
            /* ── Generate prompt ── */
            <div
              className="card"
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 20, padding: "56px 40px", textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 60, height: 60, borderRadius: 16,
                  background: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(14,165,233,0.08))",
                  border: "1px solid rgba(139,92,246,0.18)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Sparkles size={24} color="#8B5CF6" />
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "#0F2147", marginBottom: 8 }}>
                  Generate Position Summary
                </div>
                <div style={{ fontSize: 14, color: "#64748B", maxWidth: 420, lineHeight: 1.6 }}>
                  {completedCount < 3
                    ? `This report requires at least 3 completed interviews. You currently have ${completedCount}.`
                    : `Analyse all ${completedCount} completed interviews with Claude to surface talent pool insights, common strengths, gaps, and question health.`
                  }
                </div>
              </div>
              <button
                className="btn-primary"
                disabled={completedCount < 3 || generatingPosSummary}
                onClick={handleGeneratePositionSummary}
                style={{ display: "flex", alignItems: "center", gap: 8, opacity: completedCount < 3 ? 0.5 : 1 }}
              >
                {generatingPosSummary ? (
                  <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Generating…</>
                ) : (
                  <><Sparkles size={15} /> Generate Position Summary</>
                )}
              </button>
            </div>
          ) : (
            /* ── Report UI ── */
            <>
              {/* Report header */}
              <div
                style={{
                  padding: "18px 24px",
                  background: "linear-gradient(135deg, rgba(139,92,246,0.06), rgba(14,165,233,0.04))",
                  border: "1px solid rgba(139,92,246,0.14)",
                  borderRadius: 12,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Sparkles size={16} color="#8B5CF6" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0F2147" }}>
                      AI Position Summary · {selectedPosition?.title}
                    </div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
                      Generated {new Date(existingReport.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {" · "}{completedCount} interviews analysed
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => toast.success("Shortlist pushed (mock)")}>
                    <Trophy size={13} /> Push Shortlist
                  </button>
                  <button className="btn-ghost" style={{ fontSize: 12 }} onClick={() => toast.success("PDF exported (mock)")}>
                    <Download size={13} /> Export PDF
                  </button>
                </div>
              </div>

              {/* Pipeline overview */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
                {[
                  { label: "Evaluated",       value: completedCount,  color: "#0EA5E9", sub: "completed interviews"  },
                  { label: "Avg Score",        value: avgScore,        color: "#10B981", sub: "talent pool average"   },
                  { label: "Recommended",      value: strongYes,       color: "#8B5CF6", sub: "Yes or Strong Yes"     },
                  { label: "Hire Rate",        value: `${completedCount > 0 ? Math.round((strongYes / completedCount) * 100) : 0}%`, color: "#F59E0B", sub: "recommended / total" },
                ].map((s) => (
                  <div key={s.label} className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</span>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500 }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Candidate ranking mini-table */}
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 8 }}>
                  <Trophy size={15} color="#F59E0B" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0F2147", fontFamily: "var(--font-display)" }}>
                    Candidate Ranking
                  </span>
                </div>
                {positionCandidates.map((c, idx) => {
                  const rec = c.recommendation ? REC_CFG[c.recommendation as keyof typeof REC_CFG] : null;
                  return (
                    <div
                      key={c.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 16,
                        padding: "12px 20px",
                        borderBottom: idx < positionCandidates.length - 1 ? "1px solid #F1F5F9" : "none",
                        background: idx === 0 ? "#FAFBFF" : "transparent",
                      }}
                    >
                      <RankMedal rank={idx} />
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#0F2147" }}>{c.name}</div>
                      <ScoreBar score={c.score ?? 0} max={80} />
                      {rec && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: rec.color, background: rec.bg, border: `1px solid ${rec.border}`, padding: "2px 8px", borderRadius: 100, whiteSpace: "nowrap" }}>
                          {rec.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Overall insights */}
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Lightbulb size={15} color="#8B5CF6" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0F2147", fontFamily: "var(--font-display)" }}>
                    AI Talent Pool Insights
                  </span>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.75, color: "#334155", margin: 0 }}>
                  {existingReport.overallInsights}
                </p>
              </div>

              {/* Strengths & Gaps */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {/* Common Strengths */}
                <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CheckCircle2 size={15} color="#10B981" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0F2147", fontFamily: "var(--font-display)" }}>
                      Common Strengths
                    </span>
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                    {existingReport.commonStrengths.map((s, i) => (
                      <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <span style={{ marginTop: 3, flexShrink: 0, width: 16, height: 16, borderRadius: "50%", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <CheckCircle2 size={9} color="#10B981" />
                        </span>
                        <span style={{ fontSize: 13, color: "#334155", lineHeight: 1.5 }}>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Common Gaps */}
                <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Target size={15} color="#F59E0B" />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0F2147", fontFamily: "var(--font-display)" }}>
                      Common Gaps
                    </span>
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                    {existingReport.commonGaps.map((g, i) => (
                      <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <span style={{ marginTop: 3, flexShrink: 0, width: 16, height: 16, borderRadius: "50%", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <AlertTriangle size={9} color="#D97706" />
                        </span>
                        <span style={{ fontSize: 13, color: "#334155", lineHeight: 1.5 }}>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Market observation */}
              <div
                style={{
                  padding: "16px 20px",
                  background: "rgba(14,165,233,0.05)",
                  border: "1px solid rgba(14,165,233,0.15)",
                  borderRadius: 12,
                  display: "flex", alignItems: "flex-start", gap: 10,
                }}
              >
                <Globe size={15} color="#0EA5E9" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#0284C7", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                    Market Observation
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.65, color: "#334155", margin: 0 }}>
                    {existingReport.marketObservation}
                  </p>
                </div>
              </div>

              {/* Question health flags */}
              {existingReport.questionHealthFlags.length > 0 && (
                <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Flag size={15} color="#DC2626" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0F2147", fontFamily: "var(--font-display)" }}>
                        Question Health Flags
                      </span>
                    </div>
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 12 }}
                      onClick={() => toast.success("Flagged questions sent for review (mock)")}
                    >
                      Send for Review
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {existingReport.questionHealthFlags.map((f, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "14px 16px", borderRadius: 10,
                          background: "rgba(239,68,68,0.04)",
                          border: "1px solid rgba(239,68,68,0.14)",
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6, lineHeight: 1.5 }}>
                          &ldquo;{f.question}&rdquo;
                        </div>
                        <div style={{ fontSize: 12, color: "#64748B", display: "flex", alignItems: "flex-start", gap: 6 }}>
                          <AlertTriangle size={12} color="#D97706" style={{ marginTop: 1, flexShrink: 0 }} />
                          {f.recommendation}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Regenerate button */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  className="btn-ghost"
                  style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
                  disabled={generatingPosSummary}
                  onClick={handleGeneratePositionSummary}
                >
                  {generatingPosSummary
                    ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Regenerating…</>
                    : <><Sparkles size={13} /> Regenerate Summary</>
                  }
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
