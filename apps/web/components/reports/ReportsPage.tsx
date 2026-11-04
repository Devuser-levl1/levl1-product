"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, Position, Candidate, CandidateReport } from "@/store/appStore";

/* Row returned by GET /api/reports/pending */
interface PendingReport {
  id: string; candidateId: string; completedAt: string | null; terminationReason: string | null;
  reportStatus: "generating" | "ready" | "failed" | null; reportError: string | null;
  reportAttempts: number; autoRetryExhausted: boolean;
}

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
  BarChart2, Sparkles, ChevronRight, Clock,
  FileText, Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { ExportResults } from "./ExportResults";
import { Page, PageHeader, Button, Badge, EmptyState, type Tone } from "@/components/screen/ui";
import { lv, space, text, radius } from "@/lib/screen/ui/tokens";

// Design-System Pass 3 (group 5): presentation on the Screen design system.
// Report loading, manual generation and AI summaries are unchanged.

/* ─── Helpers ────────────────────────────────────────────────────── */
const REC_CFG: Record<string, { label: string; tone: Tone }> = {
  strong_yes: { label: "Strong Yes", tone: "success" },
  yes:        { label: "Yes",        tone: "brand"   },
  maybe:      { label: "Maybe",      tone: "warning" },
  no:         { label: "No",         tone: "danger"  },
};

function scoreColor(s: number) {
  if (s >= 85) return lv.success;
  if (s >= 70) return lv.brandText;
  if (s >= 55) return lv.warning;
  return lv.danger;
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
    <svg width={w} height={h} style={{ overflow: "visible" }} role="img" aria-label={`Score trend: ${scores.join(", ")}`}>
      <polyline
        points={pts}
        fill="none"
        stroke={lv.brand}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {scores.map((s, i) => {
        const x = (i / (scores.length - 1)) * w;
        const y = h - ((s - min) / range) * h * 0.8 - h * 0.1;
        return <circle key={i} cx={x} cy={y} r={2.5} fill={lv.brand} />;
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

  const statusTone: Record<string, Tone> = {
    active: "success", pending_approval: "warning", draft: "neutral", paused: "warning", closed: "neutral", won: "success", lost: "danger",
  };
  const none = completedCandidates.length === 0;

  return (
    <article className="lv-card lv-card--hover" aria-label={position.title} style={{ padding: `${space[5]}px ${space[6]}px`, display: "flex", flexDirection: "column" }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: space[3] }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: space[1] }}>
            <Badge tone={statusTone[position.status] ?? "neutral"}>
              <span style={{ textTransform: "capitalize" }}>{position.status.replace("_", " ")}</span>
            </Badge>
          </div>
          <h3 style={{
            fontFamily: lv.fontDisplay, fontSize: text.md, fontWeight: 600,
            color: lv.text, margin: "0 0 3px", letterSpacing: "-0.01em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {position.title}
          </h3>
          <p style={{ fontSize: text.sm, color: lv.textBody, fontWeight: 600, margin: "0 0 2px" }}>
            {position.company}
          </p>
          <p style={{ fontSize: text.xs, color: lv.textMuted, margin: 0 }}>{position.department}</p>
        </div>
        {scores.length > 0 && (
          <div style={{ flexShrink: 0, paddingLeft: space[4] }}>
            <Sparkline scores={scores} />
          </div>
        )}
      </div>

      {/* Stats strip */}
      <dl style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, margin: `0 0 ${space[4]}px`,
        background: lv.surfaceSunken, borderRadius: radius.md, overflow: "hidden", border: `1px solid ${lv.border}`,
      }}>
        {[
          { label: "Interviewed", value: completedCandidates.length },
          { label: "Shortlisted", value: shortlisted },
          { label: "Avg Score",   value: completedCandidates.length ? avg : "—" },
        ].map((s, i) => (
          <div key={s.label} style={{ padding: `${space[2]}px ${space[3]}px`, textAlign: "center", borderRight: i < 2 ? `1px solid ${lv.border}` : "none" }}>
            <dd style={{ margin: 0, fontFamily: lv.fontDisplay, fontSize: text.lg, fontWeight: 600, color: lv.text, lineHeight: 1 }}>{s.value}</dd>
            <dt style={{ fontSize: text.xs, color: lv.textMuted, marginTop: 3, fontWeight: 500 }}>{s.label}</dt>
          </div>
        ))}
      </dl>

      {/* Actions */}
      <div style={{ display: "flex", gap: space[2], marginTop: "auto" }}>
        <Button variant="secondary" size="sm" style={{ flex: 1 }} onClick={onViewRankings} disabled={none}
          leftIcon={<BarChart2 size={14} />} rightIcon={<ChevronRight size={14} />}>
          View Rankings
        </Button>
        <Button variant="secondary" size="sm" onClick={onGenerateSummary} disabled={none} loading={generating}
          title={hasReport ? "Regenerate AI summary" : "Generate AI summary"}
          aria-label={hasReport ? `Regenerate AI summary for ${position.title}` : `Generate AI summary for ${position.title}`}
          leftIcon={<Sparkles size={14} />}>
          {generating ? "…" : hasReport ? "Regen" : "AI Summary"}
        </Button>
      </div>
    </article>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */
export default function ReportsPage() {
  const router = useRouter();
  const { positions, candidates, reports, positionReports, addPositionReport, addReport, updateCandidate } = useAppStore();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [reportGenId, setReportGenId] = useState<string | null>(null);

  /* Report pipeline status for completed interviews with no report (Fixpack 6 #3) */
  const [pending, setPending] = useState<Record<string, PendingReport>>({});
  const loadPending = useCallback(() => {
    fetch("/api/reports/pending")
      .then((r) => (r.ok ? r.json() : null))
      .then((rows) => {
        if (!Array.isArray(rows)) return;
        const byCandidate: Record<string, PendingReport> = {};
        for (const row of rows as PendingReport[]) byCandidate[row.candidateId] = row;
        setPending(byCandidate);
      })
      .catch(() => {});
  }, []);

  /* Load existing reports from DB — the page only shows reports that exist in the DB */
  const loadReports = useCallback(() => {
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

  useEffect(() => {
    loadReports();
    // Kick the server-side sweep for this agency (generates any missing reports
    // in the background), then poll status so nothing stays silently blank.
    fetch("/api/reports/sweep", { method: "POST" }).catch(() => {});
    loadPending();
    const iv = setInterval(() => { loadPending(); loadReports(); }, 20000);
    return () => clearInterval(iv);
  }, [loadReports, loadPending]);

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
      toast.error("Couldn't generate the report. It's marked as failed — please try again.");
    } finally {
      setReportGenId(null);
      loadPending();
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

  const sectionHead = (title: string, meta: string, id: string) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space[3], marginBottom: space[4] }}>
      <h2 id={id} style={{ fontFamily: lv.fontDisplay, fontSize: text.md, fontWeight: 600, color: lv.text, margin: 0 }}>{title}</h2>
      <span style={{ fontSize: text.xs, color: lv.textMuted }}>{meta}</span>
    </div>
  );

  return (
    <Page style={{ maxWidth: 1100 }}>
      <PageHeader
        title="Reports"
        description="View candidate rankings, reports, and position-level insights."
        actions={<ExportResults />}
      />

      {/* ── Position cards grid ── */}
      <section aria-labelledby="rp-positions" style={{ marginBottom: space[10] }}>
        {sectionHead("Positions", `${allPositions.length} positions total`, "rp-positions")}

        {allPositions.length === 0 ? (
          <EmptyState icon={<BarChart2 size={22} />} title="No positions yet"
            description="Create a position to get started — rankings and reports appear here once candidates finish their interviews." />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))", gap: space[4] }}>
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
      </section>

      {/* ── Completed interviews missing a report ── */}
      {needsReport.length > 0 && (
        <section aria-labelledby="rp-awaiting" style={{ marginBottom: space[10] }}>
          {sectionHead("Awaiting Report", `${needsReport.length} completed without a report`, "rp-awaiting")}
          <ul className="lv-card" style={{ padding: 0, overflow: "hidden", listStyle: "none", margin: 0 }}>
            {needsReport.map((c, idx) => (
              <li key={c.id} style={{
                display: "flex", alignItems: "center", gap: space[3], padding: `${space[3]}px ${space[6]}px`, flexWrap: "wrap",
                borderBottom: idx < needsReport.length - 1 ? `1px solid ${lv.border}` : "none",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: text.base, fontWeight: 600, color: lv.text }}>{c.name}</div>
                  <div style={{ fontSize: text.xs, color: lv.textMuted }}>{c.positionTitle}</div>
                  {pending[c.id]?.reportStatus === "failed" && (
                    <div style={{ fontSize: text.xs, color: lv.danger, marginTop: 2 }}>
                      Report failed{pending[c.id]?.autoRetryExhausted ? " — automatic retries stopped" : " — retrying automatically"}. {pending[c.id]?.reportError ?? ""}
                    </div>
                  )}
                </div>
                {(() => {
                  const st = pending[c.id]?.reportStatus;
                  if (st === "generating" && reportGenId !== c.id) return <Badge tone="neutral">Generating…</Badge>;
                  if (st === "failed") return <Badge tone="danger">Report failed</Badge>;
                  return <Badge tone="neutral">Pending</Badge>;
                })()}
                <Button variant="secondary" size="sm" onClick={() => generateReportManually(c)} loading={reportGenId === c.id} leftIcon={<Sparkles size={14} />}>
                  {reportGenId === c.id ? "Generating…" : pending[c.id]?.reportStatus === "failed" ? "Retry" : "Generate Report"}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Recent individual reports ── */}
      <section aria-labelledby="rp-recent">
        {sectionHead("Recent Candidate Reports", `${Object.keys(reports).length} reports generated`, "rp-recent")}

        {recentReports.length === 0 ? (
          <EmptyState icon={<FileText size={22} />} title="No reports yet"
            description="Reports are generated automatically after each interview completes." />
        ) : (
          <ul className="lv-card" style={{ padding: 0, overflow: "hidden", listStyle: "none", margin: 0 }}>
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
                <li key={r.interviewId} style={{ borderBottom: idx < recentReports.length - 1 ? `1px solid ${lv.border}` : "none" }}>
                  <div
                    role="button"
                    tabIndex={0}
                    className="rp-row"
                    aria-label={`Open report for ${r.candidateName}, score ${r.overallScore}`}
                    style={{ display: "flex", alignItems: "center", gap: space[3], padding: `${space[4]}px ${space[6]}px`, cursor: "pointer", flexWrap: "wrap" }}
                    onClick={() => router.push(`/report/${r.interviewId}`)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(`/report/${r.interviewId}`); } }}
                  >
                    {/* Avatar */}
                    <div aria-hidden="true" style={{
                      width: 38, height: 38, borderRadius: radius.md, flexShrink: 0,
                      background: lv.surfaceMuted, border: `1px solid ${lv.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: text.xs, fontWeight: 600, color: lv.textBody,
                    }}>
                      {initials(r.candidateName)}
                    </div>

                    {/* Info */}
                    <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                      <div style={{ fontSize: text.base, fontWeight: 600, color: lv.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.candidateName}
                      </div>
                      <div style={{ fontSize: text.xs, color: lv.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.positionTitle} · {r.company}
                      </div>
                    </div>

                    {/* Score */}
                    <div style={{ textAlign: "center", flexShrink: 0 }}>
                      <div style={{ fontFamily: lv.fontDisplay, fontSize: text.xl, fontWeight: 600, color: sColor, lineHeight: 1 }}>
                        {r.overallScore}
                      </div>
                      <div style={{ fontSize: 11, color: lv.textMuted, marginTop: 2 }}>score</div>
                    </div>

                    {/* Recommendation */}
                    {rec && <Badge tone={rec.tone}>{rec.label}</Badge>}

                    {/* Time */}
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      <Clock size={12} color={lv.textMuted} aria-hidden="true" />
                      <span style={{ fontSize: text.xs, color: lv.textMuted }}>{timeAgo}</span>
                    </div>

                    <ChevronRight size={16} color={lv.textMuted} aria-hidden="true" />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Quick-access tips ── */}
      {(activePositions.length > 0 || recentReports.length > 0) && (
        <div style={{
          marginTop: space[8], padding: `${space[4]}px ${space[5]}px`,
          background: lv.brandSoft, border: `1px solid ${lv.brandSoftBorder}`,
          borderRadius: radius.md, display: "flex", alignItems: "center", gap: space[3],
        }}>
          <Zap size={14} fill="currentColor" aria-hidden="true" />
          <span style={{ fontSize: text.sm, color: lv.textBody, lineHeight: 1.5 }}>
            <strong style={{ color: lv.brandText }}>Tip:</strong> Click any position card&apos;s &ldquo;View Rankings&rdquo; to see the full candidate table. Click &ldquo;AI Summary&rdquo; to generate talent pool insights for that position.
          </span>
        </div>
      )}
      <style>{`.rp-row:hover { background: var(--lv-surface-muted); } .rp-row:focus-visible { outline: none; box-shadow: inset var(--lv-focus-ring); }`}</style>
    </Page>
  );
}
