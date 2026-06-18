"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, Candidate } from "@/store/appStore";
import { Filter, Calendar, Mail, Star, Upload, Send, Play, Monitor, FileText, Loader2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import CandidateUploadFlow from "./CandidateUploadFlow";
import { SchedulingBadge, BulkInviteBar } from "./SchedulingAgent";
import StartInterviewModal from "@/components/interview/StartInterviewModal";

type PipelineColumn = {
  key: string;
  label: string;
  statuses: Candidate["status"][];
  dotColor: string;
};

const COLUMNS: PipelineColumn[] = [
  { key: "pending",           label: "Pending",             statuses: ["pending"],             dotColor: "#94A3B8" },
  { key: "invited",           label: "Invited",             statuses: ["invited"],             dotColor: "#F59E0B" },
  { key: "scheduled",         label: "Scheduled",           statuses: ["scheduled"],           dotColor: "#7C3AED" },
  { key: "interviewing",      label: "Interviewing",        statuses: ["interviewing"],        dotColor: "#8B5CF6" },
  { key: "completed",         label: "Completed",           statuses: ["completed"],           dotColor: "#10B981" },
  { key: "no_show_cancelled", label: "No Show / Cancelled", statuses: ["no_show","cancelled"], dotColor: "#EF4444" },
];

const REC_CFG = {
  strong_yes: { label: "Strong Yes", color: "#059669", bg: "rgba(16,185,129,0.10)" },
  yes:         { label: "Yes",        color: "#10B981", bg: "rgba(16,185,129,0.07)" },
  maybe:       { label: "Maybe",      color: "#D97706", bg: "rgba(245,158,11,0.10)" },
  no:          { label: "No",         color: "#DC2626", bg: "rgba(239,68,68,0.10)"  },
} as const;

/* ─── CandidateCard ─────────────────────────────────────────────── */
function CandidateCard({
  candidate,
  onStartInterview,
}: {
  candidate: Candidate;
  onStartInterview: (c: Candidate) => void;
}) {
  const router = useRouter();
  const { positions, interviews, addInterview, updateCandidate } = useAppStore();
  const position = positions.find((p) => p.id === candidate.positionId);
  const [generatingReport, setGeneratingReport] = useState(false);
  const initials = candidate.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const rec = candidate.recommendation ? REC_CFG[candidate.recommendation as keyof typeof REC_CFG] : null;

  const isScheduled    = candidate.status === "scheduled";
  const isInterviewing = candidate.status === "interviewing";
  const isCompleted    = candidate.status === "completed";
  const showActions    = isScheduled || isInterviewing;

  /* Resolve or lazily create an interviewId for the Monitor button */
  function getInterviewId(): string {
    if (candidate.interviewId) return candidate.interviewId;
    const existing = interviews.find((iv) => iv.candidateId === candidate.id);
    if (existing) { updateCandidate(candidate.id, { interviewId: existing.id }); return existing.id; }
    const newId = `iv-${Date.now()}`;
    addInterview({
      id: newId,
      candidateId: candidate.id,
      candidateName: candidate.name,
      positionId: candidate.positionId,
      positionTitle: candidate.positionTitle,
      scheduledAt: candidate.scheduledAt ?? new Date().toISOString(),
      duration: position?.interviewDuration ?? 30,
      status: "scheduled",
      agentOnline: true,
      candidateJoined: false,
    });
    updateCandidate(candidate.id, { interviewId: newId });
    return newId;
  }

  function handleMonitor(e: React.MouseEvent) {
    e.stopPropagation();
    const id = getInterviewId();
    window.open(`/interview/${id}/monitor`, "_blank");
  }

  async function handleGenerateReport(e: React.MouseEvent) {
    e.stopPropagation();
    if (candidate.reportGenerated) {
      router.push(`/report/${candidate.interviewId}`);
      return;
    }
    setGeneratingReport(true);
    try {
      // Fetch interview data
      const ivRes = await fetch(`/api/interviews/${candidate.interviewId}`);
      const iv = ivRes.ok ? await ivRes.json() : null;

      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewId: candidate.interviewId,
          candidateId: candidate.id,
          candidateName: candidate.name,
          candidateEmail: candidate.email ?? '',
          positionTitle: position?.title ?? candidate.positionTitle ?? '',
          company: position?.company ?? '',
          interviewDate: iv?.completedAt ?? new Date().toISOString(),
          duration: position?.interviewDuration ?? 30,
          transcript: iv?.transcript ?? [],
          questionResponses: iv?.questionResponses ?? [],
          techStack: position?.techStack ?? [],
          experienceLevel: position?.experienceLevel ?? '',
          roleType: (position as unknown as Record<string, string>)?.roleType ?? '',
        }),
      });
      if (res.ok) {
        toast.success('Report generated!');
        updateCandidate(candidate.id, { reportGenerated: true });
        router.push(`/report/${candidate.interviewId}`);
      } else {
        const err = await res.json();
        toast.error(err.error ?? 'Report generation failed');
      }
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  }

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #E2E8F0",
        borderRadius: 10,
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        transition: "all 0.15s",
        boxShadow: "0 1px 3px rgba(79,70,229,0.04)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#7C3AED";
        e.currentTarget.style.boxShadow   = "0 4px 12px rgba(124,58,237,0.10)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "#E2E8F0";
        e.currentTarget.style.boxShadow   = "0 1px 3px rgba(79,70,229,0.04)";
      }}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: isScheduled
            ? "linear-gradient(135deg, #EDE9FE, #F1F5F9)"
            : "linear-gradient(135deg, #EEF2FF, #F1F5F9)",
          border: `1px solid ${isScheduled ? "rgba(124,58,237,0.25)" : "#E2E8F0"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700,
          color: isScheduled ? "#7C3AED" : "#6D28D9",
          flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#4F46E5", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {candidate.name}
          </div>
          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {candidate.positionTitle}
          </div>
        </div>
        {candidate.score !== undefined && (
          <div className="font-mono" style={{ fontSize: 16, fontWeight: 800, color: "#4F46E5", flexShrink: 0 }}>
            {candidate.score}
          </div>
        )}
      </div>

      {/* Email */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#94A3B8" }}>
        <Mail size={10} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{candidate.email}</span>
      </div>

      {/* No-phone warning — WhatsApp invites/reminders require a phone number */}
      {!candidate.phone && (
        <div
          title="Add a phone number to enable WhatsApp invites and reminders. Email invites still send."
          style={{
            display: "inline-flex", alignItems: "center", gap: 4, alignSelf: "flex-start",
            fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 100,
            background: "rgba(245,158,11,0.10)", color: "#B45309",
            border: "1px solid rgba(245,158,11,0.30)",
          }}
        >
          <AlertTriangle size={9} /> No phone — WhatsApp unavailable
        </div>
      )}

      {/* Skills */}
      {candidate.topSkills && candidate.topSkills.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
          {candidate.topSkills.slice(0, 3).map((s) => (
            <span key={s} style={{ fontSize: 9, fontFamily: "var(--font-mono)", padding: "1px 6px", borderRadius: 3, background: "#F1F5F9", color: "#475569", border: "1px solid #E2E8F0" }}>
              {s}
            </span>
          ))}
          {candidate.topSkills.length > 3 && <span style={{ fontSize: 10, color: "#94A3B8" }}>+{candidate.topSkills.length - 3}</span>}
        </div>
      )}

      {/* Scheduled time + recommendation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        {candidate.scheduledAt ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#64748B" }}>
            <Calendar size={10} />
            <span className="font-mono">
              {new Date(candidate.scheduledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}{" "}
              {new Date(candidate.scheduledAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "#94A3B8" }}>
            {candidate.currentTitle
              ? `${candidate.currentTitle}${candidate.totalYearsExperience ? ` · ${candidate.totalYearsExperience}y` : ""}`
              : ""}
          </div>
        )}
        {rec && (
          <div style={{ fontSize: 9, fontWeight: 700, color: rec.color, background: rec.bg, padding: "2px 6px", borderRadius: 100, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 3 }}>
            <Star size={8} /> {rec.label}
          </div>
        )}
      </div>

      {/* Scheduling badge */}
      <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 8 }}>
        <SchedulingBadge candidate={candidate} position={position} />
      </div>

      {/* ── Start Interview / Monitor actions ── */}
      {showActions && (
        <div style={{ display: "flex", gap: 6, borderTop: "1px solid #F1F5F9", paddingTop: 8 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onStartInterview(candidate); }}
            style={{
              flex: 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
              border: "none", borderRadius: 8, color: "#fff",
              fontSize: 12, fontWeight: 700, padding: "8px 10px",
              cursor: "pointer", letterSpacing: "-0.01em",
              boxShadow: "0 3px 10px rgba(124,58,237,0.30)",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 5px 14px rgba(124,58,237,0.45)"; e.currentTarget.style.transform = "translateY(-1px)" }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 3px 10px rgba(124,58,237,0.30)"; e.currentTarget.style.transform = "none" }}
          >
            <Play size={11} fill="white" strokeWidth={0} />
            Start Interview
          </button>

          <button
            onClick={handleMonitor}
            title="Open recruiter monitor in new tab"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              background: "rgba(124,58,237,0.08)",
              border: "1px solid rgba(124,58,237,0.22)",
              borderRadius: 8, color: "#7C3AED",
              fontSize: 12, fontWeight: 700, padding: "8px 10px",
              cursor: "pointer", whiteSpace: "nowrap",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124,58,237,0.14)" }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(124,58,237,0.08)" }}
          >
            <Monitor size={11} />
            Monitor
          </button>
        </div>
      )}

      {/* ── View / Generate Report (completed candidates) ── */}
      {isCompleted && candidate.interviewId && (
        <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 8 }}>
          <button
            onClick={handleGenerateReport}
            disabled={generatingReport}
            style={{
              width: "100%",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              background: candidate.reportGenerated
                ? "rgba(16,185,129,0.08)"
                : "rgba(79,70,229,0.07)",
              border: `1px solid ${candidate.reportGenerated
                ? "rgba(16,185,129,0.25)"
                : "rgba(79,70,229,0.20)"}`,
              borderRadius: 8,
              color: candidate.reportGenerated ? "#059669" : "#4F46E5",
              fontSize: 12, fontWeight: 700, padding: "8px 10px",
              cursor: generatingReport ? "wait" : "pointer", whiteSpace: "nowrap",
              transition: "all 0.15s",
              opacity: generatingReport ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!generatingReport) e.currentTarget.style.background = candidate.reportGenerated
                ? "rgba(16,185,129,0.15)"
                : "rgba(79,70,229,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = candidate.reportGenerated
                ? "rgba(16,185,129,0.08)"
                : "rgba(79,70,229,0.07)";
            }}
          >
            {generatingReport ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : <FileText size={11} />}
            {generatingReport ? "Generating…" : candidate.reportGenerated ? "View Report" : "Generate Report"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function CandidatesPage() {
  const { candidates, positions, showUploadFlow, setShowUploadFlow } = useAppStore();
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [modalCandidate, setModalCandidate] = useState<Candidate | null>(null);

  const filtered =
    selectedPosition === "all"
      ? candidates
      : candidates.filter((c) => c.positionId === selectedPosition);

  const byColumn = COLUMNS.reduce((acc, col) => {
    acc[col.key] = filtered.filter((c) => col.statuses.includes(c.status));
    return acc;
  }, {} as Record<string, Candidate[]>);

  const pendingAll = candidates.filter((c) => c.status === "pending");

  const modalPosition = modalCandidate
    ? positions.find((p) => p.id === modalCandidate.positionId)
    : undefined;

  return (
    <>
      {showUploadFlow && <CandidateUploadFlow onClose={() => setShowUploadFlow(false)} />}

      {/* Start Interview modal */}
      {modalCandidate && (
        <StartInterviewModal
          candidate={modalCandidate}
          position={modalPosition}
          onClose={() => setModalCandidate(null)}
        />
      )}

      <div style={{ padding: "36px 40px", display: "flex", flexDirection: "column", gap: 24, maxWidth: 1600 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "#4F46E5", letterSpacing: "-0.025em" }}>
              Candidates Pipeline
            </h1>
            <p style={{ fontSize: 14, color: "#94A3B8", marginTop: 6, fontWeight: 500 }}>
              {filtered.length} candidate{filtered.length !== 1 ? "s" : ""} across all stages
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Filter size={14} color="#94A3B8" />
              <select
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
                style={{
                  background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8,
                  padding: "8px 14px", fontSize: 13, color: "#4F46E5", fontFamily: "var(--font-sans)",
                  cursor: "pointer", outline: "none", minWidth: 180, boxShadow: "0 1px 3px rgba(79,70,229,0.05)",
                }}
              >
                <option value="all">All Positions</option>
                {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>

            <button className="btn-primary" onClick={() => setShowUploadFlow(true)}>
              <Upload size={15} /> Upload Resumes
            </button>
          </div>
        </div>

        {/* Pending invites banner */}
        {pendingAll.length > 0 && (
          <div style={{
            padding: "12px 18px", background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)",
            borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6D28D9" }}>
              <Send size={14} />
              <span>
                <strong>{pendingAll.length}</strong> candidate{pendingAll.length !== 1 ? "s" : ""} awaiting interview invite
              </span>
            </div>
            <BulkInviteBar candidateIds={pendingAll.map((c) => c.id)} />
          </div>
        )}

        {/* Kanban */}
        <div className="candidates-kanban" style={{ display: "grid", gridTemplateColumns: `repeat(${COLUMNS.length}, 1fr)`, gap: 12, alignItems: "start" }}>
          {COLUMNS.map((col) => {
            const cards = byColumn[col.key] ?? [];
            return (
              <div key={col.key} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Column header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: col.dotColor }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#475569", letterSpacing: "0.02em" }}>
                      {col.label}
                    </span>
                  </div>
                  <span className="font-mono" style={{ fontSize: 11, color: "#94A3B8", background: "#F1F5F9", border: "1px solid #E2E8F0", padding: "1px 7px", borderRadius: 100, fontWeight: 700 }}>
                    {cards.length}
                  </span>
                </div>

                {/* Cards */}
                <div style={{
                  minHeight: 80, background: "#F8FAFC", border: "1px dashed #CBD5E1",
                  borderRadius: 12, padding: "8px", display: "flex", flexDirection: "column", gap: 8,
                }}>
                  {cards.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "24px 0", color: "#CBD5E1", fontSize: 12, fontWeight: 500 }}>
                      No candidates
                    </div>
                  ) : (
                    cards.map((c) => (
                      <CandidateCard
                        key={c.id}
                        candidate={c}
                        onStartInterview={setModalCandidate}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    <style>{`
      @media (max-width: 768px) {
        /* Kanban board: horizontal scroll instead of fixed columns */
        .candidates-kanban {
          grid-template-columns: repeat(${COLUMNS.length}, 280px) !important;
          overflow-x: auto !important;
          padding-bottom: 16px;
        }
      }
    `}</style>
    </>
  );
}
