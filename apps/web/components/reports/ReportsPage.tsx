"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, Position, Candidate, CandidateReport } from "@/store/appStore";

/* Shape of a report row returned by GET /api/reports */
type DbReport = Omit<
  CandidateReport,
  "interviewId" | "positionId" | "candidateName" | "candidateEmail" | "positionTitle" | "company" | "interviewDate" | "duration"
> & {
  candidate?: {
    name?: string;
    email?: string;
    interview?: { id?: string } | null;
    position?: { id?: string; title?: string; company?: string } | null;
  } | null;
};
import {
  BarChart2, Sparkles, Loader2, ChevronRight, Clock,
  FileText, Zap,
} from "lucide-react";
import toast from "react-hot-toast";

/* ─── Helpers ────────────────────────────────────────────────────── */
const REC_CFG = {
  strong_yes: { label: "Strong Yes", color: "#059669", bg: "rgba(16,185,129,0.10)" },
  yes:        { label: "Yes",        color: "#4F46E5", bg: "rgba(79,70,229,0.10)"  },
  maybe:      { label: "Maybe",      color: "#D97706", bg: "rgba(245,158,11,0.10)" },
  no:         { label: "No",         color: "#DC2626", bg: "rgba(239,68,68,0.10)"  },
} as const;

function scoreColor(s: number) {
  if (s >= 85) return "#10B981";
  if (s >= 70) return "#4F46E5";
  if (s >= 55) return "#F59E0B";
  return "#EF4444";
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

/* ─── Sparkline ─────────────────────────────────────────────────── */
function Sparkline({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null;
  const w = 72, h = 24;
  const min = Math.min(...scores), max = Math.max(...scores);
  const range = Math.max(max - min, 10);
  const pts = scores
    .map((s, i) => {
      const x = (i / (scores.length - 1)) * w;
      const y = h - ((s - min) / range) * h * 0.8 - h * 0.1;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <polyline
        points={pts}
        fill="none"
        stroke="#7C3AED"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {scores.map((s, i) => {
        const x = (i / (scores.length - 1)) * w;
        const y = h - ((s - min) / range) * h * 0.8 - h * 0.1;
        return <circle key={i} cx={x} cy={y} r={2.5} fill="#7C3AED" />;
      })}
    </svg>
  );
}

/* ─── Position card ─────────────────────────────────────────────── */
function PositionCard({
  position,
  completedCandidates,
  hasReport,
  onViewRankings,
  onGenerateSummary,
  generating,
}: {
  position: Position;
  completedCandidates: Candidate[];
  hasReport: boolean;
  onViewRankings: () => void;
  onGenerateSummary: () => void;
  generating: boolean;
}) {
  const scores = completedCandidates.map((c) => c.score ?? 0).sort((a, b) => b - a);
  const avg = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;
  const shortlisted = completedCandidates.filter(
    (c) => c.recommendation === "strong_yes" || c.recommendation === "yes"
  ).length;

  const statusColors: Record<string, { color: string; bg: string }> = {
    active:           { color: "#059669", bg: "rgba(16,185,129,0.10)" },
    pending_approval: { color: "#D97706", bg: "rgba(245,158,11,0.10)" },
    draft:            { color: "#94A3B8", bg: "rgba(148,163,184,0.10)" },
    paused:           { color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
    closed:           { color: "#475569", bg: "rgba(71,85,105,0.08)"  },
  };
  const sc = statusColors[position.status] ?? statusColors.draft;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 14,
        padding: "22px 24px",
        boxShadow: "0 1px 4px rgba(79,70,229,0.05)",
        display: "flex",
        flexDirection: "column",
        gap: 0,
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 6px 20px rgba(79,70,229,0.10)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 4px rgba(79,70,229,0.05)";
      }}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span
              style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                color: sc.color, background: sc.bg, textTransform: "capitalize",
              }}
            >
              {position.status.replace("_", " ")}
            </span>
          </div>
          <h3
            style={{
              fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700,
              color: "#1E293B", margin: "0 0 3px", letterSpacing: "-0.01em",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            {position.title}
          </h3>
          <p style={{ fontSize: 13, color: "#7C3AED", fontWeight: 600, margin: "0 0 2px" }}>
            {position.company}
          </p>
          <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>{position.department}</p>
        </div>
        {scores.length > 0 && (
          <div style={{ flexShrink: 0, paddingLeft: 16 }}>
            <Sparkline scores={scores} />
          </div>
        )}
      </div>

      {/* Stats strip */}
      <div
        style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0,
          background: "#F8FAFF", borderRadius: 10, overflow: "hidden",
          border: "1px solid #E2E8F0", marginBottom: 14,
        }}
      >
        {[
          { label: "Interviewed", value: completedCandidates.length },
          { label: "Shortlisted", value: shortlisted },
          { label: "Avg Score",   value: completedCandidates.length ? avg : "—" },
        ].map((s, i) => (
          <div
            key={s.label}
            style={{
              padding: "10px 12px", textAlign: "center",
              borderRight: i < 2 ? "1px solid #E2E8F0" : "none",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800,
                color: "#4F46E5", lineHeight: 1,
              }}
            >
              {s.value}
            </div>
            <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 3, fontWeight: 500 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onViewRankings}
          disabled={completedCandidates.length === 0}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            background: completedCandidates.length > 0 ? "#4F46E5" : "#E2E8F0",
            color: completedCandidates.length > 0 ? "#fff" : "#94A3B8",
            border: "none", borderRadius: 9, padding: "10px 14px",
            fontSize: 13, fontWeight: 700, cursor: completedCandidates.length > 0 ? "pointer" : "not-allowed",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            if (completedCandidates.length > 0)
              e.currentTarget.style.background = "#4338CA";
          }}
          onMouseLeave={(e) => {
            if (completedCandidates.length > 0)
              e.currentTarget.style.background = "#4F46E5";
          }}
        >
          <BarChart2 size={13} /> View Rankings <ChevronRight size={12} />
        </button>

        <button
          onClick={onGenerateSummary}
          disabled={generating || completedCandidates.length === 0}
          title={hasReport ? "Regenerate AI summary" : "Generate AI summary"}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            background: generating ? "#E2E8F0" : hasReport ? "rgba(79,70,229,0.08)" : "rgba(124,58,237,0.08)",
            color: generating ? "#94A3B8" : hasReport ? "#4F46E5" : "#7C3AED",
            border: `1px solid ${generating ? "transparent" : hasReport ? "rgba(79,70,229,0.2)" : "rgba(124,58,237,0.2)"}`,
            borderRadius: 9, padding: "10px 12px",
            fontSize: 12, fontWeight: 700, cursor: generating ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {generating
            ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
            : <Sparkles size={12} />}
          {generating ? "…" : hasReport ? "Regen" : "AI Summary"}
        </button>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */
export default function ReportsPage() {
  const router = useRouter();
  const { positions, candidates, reports, positionReports, addPositionReport, addReport, updateCandidate } = useAppStore();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [reportGenId, setReportGenId] = useState<string | null>(null);

  /* Load existing reports from DB — the page only shows reports that exist in the DB */
  useEffect(() => {
    fetch("/api/reports")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!Array.isArray(data)) return;
        data.forEach((rep: DbReport) => {
          const key = rep.candidate?.interview?.id || rep.candidateId;
          const mapped: CandidateReport = {
            interviewId: key,
            candidateId: rep.candidateId,
            positionId: rep.candidate?.position?.id || "",
            generatedAt: rep.generatedAt,
            overallScore: rep.overallScore,
            recommendation: rep.recommendation,
            professionalSummary: rep.professionalSummary,
            sectionScores: rep.sectionScores,
            strengthAreas: rep.strengthAreas || [],
            concernAreas: rep.concernAreas || [],
            questionWiseEvaluation: rep.questionWiseEvaluation || [],
            transcriptHighlights: rep.transcriptHighlights || [],
            hrNote: rep.hrNote || "",
            l2Recommendation: rep.l2Recommendation || "",
            candidateName: rep.candidate?.name || "",
            candidateEmail: rep.candidate?.email || "",
            positionTitle: rep.candidate?.position?.title || "",
            company: rep.candidate?.position?.company || "",
            interviewDate: rep.generatedAt,
            duration: 30,
          };
          addReport(key, mapped);
        });
      })
      .catch((err) => console.warn("Failed to load reports from DB:", err));
  }, [addReport]);

  /* Manually trigger report generation for a completed candidate with no report */
  async function generateReportManually(candidate: Candidate) {
    const pos = positions.find((p) => p.id === candidate.positionId);
    setReportGenId(candidate.id);
    try {
      const res = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewId: candidate.interviewId || candidate.id,
          candidateId: candidate.id,
          candidateName: candidate.name,
          candidateEmail: candidate.email ?? "",
          positionTitle: pos?.title ?? candidate.positionTitle ?? "",
          company: pos?.company ?? "",
          interviewDate: new Date().toISOString().slice(0, 10),
          duration: pos?.interviewDuration ?? 30,
          transcript: [],
          questionResponses: [],
          techStack: pos?.techStack ?? [],
          experienceLevel: pos?.experienceLevel ?? "",
        }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const key = candidate.interviewId || candidate.id;
      addReport(key, { ...data, interviewId: key });
      updateCandidate(candidate.id, { reportGenerated: true, reportGeneratedAt: new Date().toISOString() });
      toast.success("Report generated");
    } catch {
      toast.error("Could not generate report — check API key / logs");
    } finally {
      setReportGenId(null);
    }
  }

  /* Completed candidates that have no report in the DB yet */
  const needsReport = candidates.filter(
    (c) => c.status === "completed" && !(c.interviewId && reports[c.interviewId]) && !c.reportGenerated
  );

  /* Positions that have at least 1 completed interview */
  const activePositions = positions.filter(
    (p) => candidates.some((c) => c.positionId === p.id && c.status === "completed")
  );

  /* All positions (for empty state) */
  const allPositions = positions;

  /* Recent reports (last 5, sorted by generatedAt) */
  const recentReports = Object.values(reports)
    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
    .slice(0, 5);

  async function handleGenerateSummary(positionId: string) {
    const pos = positions.find((p) => p.id === positionId);
    if (!pos) return;
    const completed = candidates.filter(
      (c) => c.positionId === positionId && c.status === "completed"
    );
    if (completed.length === 0) { toast.error("No completed interviews yet"); return; }

    setGeneratingId(positionId);
    try {
      const payload = {
        position: pos,
        completedCandidates: completed.map((c) => {
          const r = c.interviewId ? reports[c.interviewId] : undefined;
          return {
            id: c.id,
            name: c.name,
            score: c.score ?? 0,
            recommendation: c.recommendation ?? "maybe",
            strengthAreas:   r?.strengthAreas ?? [],
            concernAreas:    r?.concernAreas  ?? [],
            sectionScores:   r?.sectionScores ?? {},
            professionalSummary: r?.professionalSummary ?? "",
          };
        }),
      };
      const res = await fetch("/api/generate-position-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      addPositionReport(positionId, { ...data, positionId });
      toast.success("AI summary generated");
    } catch {
      toast.error("Could not generate summary — check API key");
    } finally {
      setGeneratingId(null);
    }
  }

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1100, margin: "0 auto" }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #4F46E5, #7C3AED)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BarChart2 size={15} color="white" />
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#1E293B", margin: 0, letterSpacing: "-0.02em" }}>
            Reports
          </h1>
        </div>
        <p style={{ fontSize: 14, color: "#94A3B8", margin: 0 }}>
          View candidate rankings, AI evaluation reports, and position-level insights.
        </p>
      </div>

      {/* ── Position cards grid ── */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "#334155", margin: 0 }}>
            Positions
          </h2>
          <span style={{ fontSize: 12, color: "#94A3B8" }}>{allPositions.length} positions total</span>
        </div>

        {allPositions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#CBD5E1" }}>
            <BarChart2 size={40} style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 14, color: "#94A3B8" }}>No positions yet — create one to get started.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
            {allPositions.map((pos) => {
              const posCompleted = candidates.filter(
                (c) => c.positionId === pos.id && c.status === "completed"
              );
              return (
                <PositionCard
                  key={pos.id}
                  position={pos}
                  completedCandidates={posCompleted}
                  hasReport={!!positionReports[pos.id]}
                  onViewRankings={() => router.push(`/reports/${pos.id}`)}
                  onGenerateSummary={() => handleGenerateSummary(pos.id)}
                  generating={generatingId === pos.id}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── Completed interviews missing a report ── */}
      {needsReport.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "#334155", margin: 0 }}>
              Awaiting Report
            </h2>
            <span style={{ fontSize: 12, color: "#94A3B8" }}>{needsReport.length} completed without a report</span>
          </div>
          <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 4px rgba(79,70,229,0.05)" }}>
            {needsReport.map((c, idx) => (
              <div key={c.id} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "14px 24px",
                borderBottom: idx < needsReport.length - 1 ? "1px solid #F1F5F9" : "none",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "#94A3B8" }}>{c.positionTitle}</div>
                </div>
                <button
                  onClick={() => generateReportManually(c)}
                  disabled={reportGenId === c.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600,
                    padding: "7px 14px", borderRadius: 8, cursor: reportGenId === c.id ? "default" : "pointer",
                    background: "linear-gradient(135deg, #4F46E5, #7C3AED)", color: "#fff", border: "none",
                    opacity: reportGenId === c.id ? 0.6 : 1,
                  }}
                >
                  {reportGenId === c.id
                    ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                    : <Sparkles size={12} />}
                  {reportGenId === c.id ? "Generating…" : "Generate Report"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent individual reports ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "#334155", margin: 0 }}>
            Recent Candidate Reports
          </h2>
          <span style={{ fontSize: 12, color: "#94A3B8" }}>{Object.keys(reports).length} reports generated</span>
        </div>

        {recentReports.length === 0 ? (
          <div style={{
            background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14,
            padding: "40px 32px", textAlign: "center",
            boxShadow: "0 1px 4px rgba(79,70,229,0.05)",
          }}>
            <FileText size={36} color="#CBD5E1" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 14, color: "#94A3B8", margin: 0 }}>
              No evaluation reports yet. Reports are generated automatically after each interview completes.
            </p>
          </div>
        ) : (
          <div style={{
            background: "#fff", border: "1px solid #E2E8F0", borderRadius: 14,
            overflow: "hidden", boxShadow: "0 1px 4px rgba(79,70,229,0.05)",
          }}>
            {recentReports.map((r, idx) => {
              const rec = r.recommendation ? REC_CFG[r.recommendation] : null;
              const sColor = scoreColor(r.overallScore);
              const timeAgo = (() => {
                const diff = Date.now() - new Date(r.generatedAt).getTime();
                const mins = Math.floor(diff / 60000);
                const hrs  = Math.floor(mins / 60);
                const days = Math.floor(hrs / 24);
                if (days > 0) return `${days}d ago`;
                if (hrs > 0)  return `${hrs}h ago`;
                return `${mins}m ago`;
              })();

              return (
                <div
                  key={r.interviewId}
                  style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "16px 24px",
                    borderBottom: idx < recentReports.length - 1 ? "1px solid #F1F5F9" : "none",
                    cursor: "pointer", transition: "background 0.15s",
                  }}
                  onClick={() => router.push(`/report/${r.interviewId}`)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#FAFAFA" }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#fff" }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 800, color: "#fff",
                  }}>
                    {initials(r.candidateName)}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.candidateName}
                    </div>
                    <div style={{ fontSize: 12, color: "#94A3B8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.positionTitle} · {r.company}
                    </div>
                  </div>

                  {/* Score */}
                  <div style={{ textAlign: "center", flexShrink: 0 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: sColor, lineHeight: 1 }}>
                      {r.overallScore}
                    </div>
                    <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>score</div>
                  </div>

                  {/* Recommendation */}
                  {rec && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                      background: rec.bg, color: rec.color, flexShrink: 0,
                    }}>
                      {rec.label}
                    </span>
                  )}

                  {/* Time */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <Clock size={11} color="#CBD5E1" />
                    <span style={{ fontSize: 12, color: "#CBD5E1" }}>{timeAgo}</span>
                  </div>

                  <ChevronRight size={14} color="#CBD5E1" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Quick-access tips ── */}
      {(activePositions.length > 0 || recentReports.length > 0) && (
        <div style={{
          marginTop: 32, padding: "16px 20px",
          background: "rgba(79,70,229,0.04)", border: "1px solid rgba(79,70,229,0.12)",
          borderRadius: 12, display: "flex", alignItems: "center", gap: 12,
        }}>
          <Zap size={14} color="#7C3AED" fill="#7C3AED" />
          <span style={{ fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
            <strong style={{ color: "#4F46E5" }}>Tip:</strong> Click any position card&apos;s &ldquo;View Rankings&rdquo; to see the full candidate table. Click &ldquo;AI Summary&rdquo; to generate talent pool insights for that position.
          </span>
        </div>
      )}
    </div>
  );
}
