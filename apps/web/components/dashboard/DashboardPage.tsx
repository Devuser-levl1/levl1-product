"use client";

import { useAppStore } from "@/store/appStore";
import { Briefcase, Users, Video, TrendingUp, ArrowRight } from "lucide-react";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accentColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub: string;
  accentColor: string;
}) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `${accentColor}14`,
            border: `1px solid ${accentColor}22`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={17} color={accentColor} strokeWidth={2} />
        </div>
      </div>
      <div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 36,
            fontWeight: 800,
            color: "#0F2147",
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {value}
        </div>
        <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 8, fontWeight: 500 }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

const REC_CONFIG = {
  strong_yes: { label: "Strong Yes", color: "#059669" },
  yes:         { label: "Yes",         color: "#10B981" },
  maybe:       { label: "Maybe",       color: "#D97706" },
  no:          { label: "No",          color: "#DC2626" },
} as const;

const STATUS_CONFIG = {
  active:           { label: "Active",           badge: "badge-success" },
  pending_approval: { label: "Pending Approval", badge: "badge-warning" },
  draft:            { label: "Draft",            badge: "badge-muted"   },
  paused:           { label: "Paused",           badge: "badge-muted"   },
  closed:           { label: "Closed",           badge: "badge-danger"  },
} as const;

export default function DashboardPage() {
  const { positions, candidates, interviews } = useAppStore();

  const activePositions  = positions.filter((p) => p.status === "active").length;
  const totalCandidates  = candidates.length;
  const upcomingInterviews = interviews.filter(
    (i) => i.status === "scheduled" || i.status === "in_progress"
  );
  const scoredCandidates = candidates.filter((c) => c.score !== undefined);
  const avgScore =
    scoredCandidates.length > 0
      ? Math.round(scoredCandidates.reduce((a, c) => a + (c.score ?? 0), 0) / scoredCandidates.length)
      : 0;

  const topCandidates = [...candidates]
    .filter((c) => c.status === "completed" && c.score !== undefined)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const now    = new Date();
  const hour   = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr  = now.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div style={{ padding: "36px 40px", display: "flex", flexDirection: "column", gap: 28, maxWidth: 1280 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 30,
              fontWeight: 800,
              color: "#0F2147",
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
            }}
          >
            {greeting} 👋
          </h1>
          <p style={{ fontSize: 14, color: "#94A3B8", marginTop: 6, fontWeight: 500 }}>
            Here&apos;s your recruitment pipeline at a glance.
          </p>
        </div>
        <div className="font-mono" style={{ fontSize: 12, color: "#94A3B8", paddingBottom: 2 }}>
          {dateStr}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <StatCard icon={Briefcase}   label="Active Positions"   value={activePositions}      sub={`${positions.length} total positions`}         accentColor="#0EA5E9" />
        <StatCard icon={Users}       label="Candidates"         value={totalCandidates}      sub={`${topCandidates.length} interviews completed`} accentColor="#10B981" />
        <StatCard icon={Video}       label="Upcoming"           value={upcomingInterviews.length} sub="Interviews scheduled"                      accentColor="#F59E0B" />
        <StatCard icon={TrendingUp}  label="Avg Score"          value={scoredCandidates.length > 0 ? avgScore : "—"} sub={`Across ${scoredCandidates.length} evaluations`} accentColor="#8B5CF6" />
      </div>

      {/* Middle row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Upcoming Interviews */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0F2147", fontFamily: "var(--font-display)" }}>
              Upcoming Interviews
            </h2>
            <span className="badge badge-brand">{upcomingInterviews.length} scheduled</span>
          </div>

          {upcomingInterviews.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#94A3B8", fontSize: 13 }}>
              No interviews scheduled
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {upcomingInterviews.map((iv) => (
                <div
                  key={iv.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    background: "#F8FAFF",
                    borderRadius: 10,
                    border: "1px solid #EEF2FF",
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: "rgba(14,165,233,0.08)",
                      border: "1px solid rgba(14,165,233,0.18)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Video size={17} color="#0EA5E9" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0F2147", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {iv.candidateName}
                    </div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {iv.positionTitle}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div className="font-mono" style={{ fontSize: 12, color: "#0F2147", fontWeight: 600 }}>
                      {new Date(iv.scheduledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </div>
                    <div className="font-mono" style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
                      {new Date(iv.scheduledAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: iv.agentOnline ? "#10B981" : "#E2E8F0",
                      flexShrink: 0,
                      boxShadow: iv.agentOnline ? "0 0 6px rgba(16,185,129,0.5)" : "none",
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Candidates */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0F2147", fontFamily: "var(--font-display)" }}>
              Top Candidates
            </h2>
            <span className="badge badge-success">{topCandidates.length} evaluated</span>
          </div>

          {topCandidates.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#94A3B8", fontSize: 13 }}>
              No evaluations yet
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {topCandidates.map((c, idx) => {
                const rec   = REC_CONFIG[c.recommendation as keyof typeof REC_CONFIG];
                const initials = c.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

                return (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "11px 14px",
                      background: "#FAFAFA",
                      borderRadius: 10,
                      border: "1px solid #F1F5F9",
                    }}
                  >
                    <div style={{ width: 22, fontSize: 11, fontWeight: 700, color: idx === 0 ? "#F59E0B" : "#94A3B8", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                      #{idx + 1}
                    </div>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: idx === 0
                          ? "linear-gradient(135deg, rgba(14,165,233,0.15), rgba(56,189,248,0.1))"
                          : "#F1F5F9",
                        border: `1px solid ${idx === 0 ? "rgba(14,165,233,0.25)" : "#E2E8F0"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        color: idx === 0 ? "#0284C7" : "#64748B",
                        flexShrink: 0,
                      }}
                    >
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0F2147", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.name}
                      </div>
                      <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.positionTitle}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <div className="font-mono" style={{ fontSize: 18, fontWeight: 800, color: "#0F2147", lineHeight: 1 }}>
                        {c.score}
                      </div>
                      {rec && (
                        <div style={{ fontSize: 10, fontWeight: 700, color: rec.color, letterSpacing: "0.03em" }}>
                          {rec.label}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Positions Overview */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0F2147", fontFamily: "var(--font-display)" }}>
            Positions Overview
          </h2>
          <ArrowRight size={15} color="#CBD5E1" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {positions.map((pos) => {
            const cfg   = STATUS_CONFIG[pos.status as keyof typeof STATUS_CONFIG];
            const total = pos.interviewsScheduled + pos.interviewsCompleted;
            const pct   = total > 0 ? Math.round((pos.interviewsCompleted / total) * 100) : 0;

            return (
              <div
                key={pos.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "12px 16px",
                  background: "#FAFAFA",
                  borderRadius: 10,
                  border: "1px solid #F1F5F9",
                  transition: "border-color 0.15s, background 0.15s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#F1F5F9";
                  e.currentTarget.style.borderColor = "#E2E8F0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#FAFAFA";
                  e.currentTarget.style.borderColor = "#F1F5F9";
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0F2147", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {pos.title}
                  </div>
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3 }}>
                    {pos.company} &middot; {pos.department}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                  {total > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 72, height: 4, borderRadius: 2, background: "#E2E8F0", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "#0EA5E9", borderRadius: 2, transition: "width 0.5s ease" }} />
                      </div>
                      <span className="font-mono" style={{ fontSize: 11, color: "#94A3B8", minWidth: 32 }}>
                        {pos.interviewsCompleted}/{total}
                      </span>
                    </div>
                  )}
                  {cfg && <span className={`badge ${cfg.badge}`}>{cfg.label}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
