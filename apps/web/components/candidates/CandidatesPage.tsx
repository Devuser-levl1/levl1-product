"use client";

import { useState } from "react";
import { useAppStore, Candidate } from "@/store/appStore";
import { Filter, Calendar, Mail, Star, Upload, Send } from "lucide-react";
import CandidateUploadFlow from "./CandidateUploadFlow";
import { SchedulingBadge, BulkInviteBar } from "./SchedulingAgent";

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

function CandidateCard({ candidate }: { candidate: Candidate }) {
  const { positions } = useAppStore();
  const position = positions.find((p) => p.id === candidate.positionId);
  const initials = candidate.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const rec      = candidate.recommendation ? REC_CFG[candidate.recommendation as keyof typeof REC_CFG] : null;

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
          background: "linear-gradient(135deg, #EEF2FF, #F1F5F9)",
          border: "1px solid #E2E8F0",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700, color: "#6D28D9", flexShrink: 0,
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

      {/* Footer */}
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

      {/* Scheduling action */}
      <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 8 }}>
        <SchedulingBadge candidate={candidate} position={position} />
      </div>
    </div>
  );
}

export default function CandidatesPage() {
  const { candidates, positions, showUploadFlow, setShowUploadFlow } = useAppStore();
  const [selectedPosition, setSelectedPosition] = useState<string>("all");

  const filtered =
    selectedPosition === "all"
      ? candidates
      : candidates.filter((c) => c.positionId === selectedPosition);

  const byColumn = COLUMNS.reduce((acc, col) => {
    acc[col.key] = filtered.filter((c) => col.statuses.includes(c.status));
    return acc;
  }, {} as Record<string, Candidate[]>);

  const pendingAll = candidates.filter((c) => c.status === "pending");

  return (
    <>
      {showUploadFlow && <CandidateUploadFlow onClose={() => setShowUploadFlow(false)} />}

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
            {/* Position filter */}
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

            {/* Upload Resumes */}
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
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLUMNS.length}, 1fr)`, gap: 12, alignItems: "start" }}>
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

                {/* Drop zone */}
                <div style={{
                  minHeight: 80, background: "#F8FAFC", border: "1px dashed #CBD5E1",
                  borderRadius: 12, padding: "8px", display: "flex", flexDirection: "column", gap: 8,
                }}>
                  {cards.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "24px 0", color: "#CBD5E1", fontSize: 12, fontWeight: 500 }}>
                      No candidates
                    </div>
                  ) : (
                    cards.map((c) => <CandidateCard key={c.id} candidate={c} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
