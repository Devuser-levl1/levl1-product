"use client";

import { useAppStore, Interview } from "@/store/appStore";
import { Video, Clock, Radio, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

function formatDateTime(dt: string) {
  const d = new Date(dt);
  return {
    date: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
    time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
  };
}

function timeUntil(dt: string): string {
  const diffMs = new Date(dt).getTime() - Date.now();
  if (diffMs < 0) return "Overdue";
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  return h > 0 ? `in ${h}h ${m}m` : `in ${m}m`;
}

function StatusPill({ on, label, onColor }: { on: boolean; label: string; onColor: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 8,
        background: on ? `${onColor}0f` : "#F8FAFC",
        border: `1px solid ${on ? `${onColor}28` : "#E2E8F0"}`,
      }}
    >
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: on ? onColor : "#CBD5E1",
          boxShadow: on ? `0 0 6px ${onColor}` : "none",
        }}
      />
      <span style={{ fontSize: 11, fontWeight: 600, color: on ? onColor : "#94A3B8" }}>
        {label}
      </span>
    </div>
  );
}

function InterviewCard({ interview }: { interview: Interview }) {
  const { date, time } = formatDateTime(interview.scheduledAt);
  const until          = timeUntil(interview.scheduledAt);
  const isLive         = interview.status === "in_progress";

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${isLive ? "rgba(14,165,233,0.4)" : "#E2E8F0"}`,
        borderRadius: 14,
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        position: "relative",
        overflow: "hidden",
        boxShadow: isLive
          ? "0 0 0 1px rgba(14,165,233,0.15), 0 8px 24px rgba(14,165,233,0.10)"
          : "0 1px 3px rgba(15,33,71,0.06)",
        transition: "box-shadow 0.2s",
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: 3,
          background: isLive
            ? "linear-gradient(90deg, #0F2147, #0EA5E9)"
            : "transparent",
        }}
      />

      {/* LIVE badge */}
      {isLive && (
        <div
          style={{
            position: "absolute",
            top: 16, right: 16,
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.22)",
            borderRadius: 100,
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 800,
            color: "#DC2626",
            letterSpacing: "0.05em",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#EF4444", boxShadow: "0 0 6px #EF4444", animation: "pulse 1.5s infinite", display: "inline-block" }} />
          LIVE
        </div>
      )}

      {/* Avatar + name */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, paddingTop: 4 }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 12,
            background: isLive ? "linear-gradient(135deg, rgba(14,165,233,0.12), rgba(56,189,248,0.08))" : "#F1F5F9",
            border: `1px solid ${isLive ? "rgba(14,165,233,0.25)" : "#E2E8F0"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            fontWeight: 800,
            color: isLive ? "#0284C7" : "#64748B",
            flexShrink: 0,
            fontFamily: "var(--font-display)",
          }}
        >
          {interview.candidateName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0F2147", fontFamily: "var(--font-display)" }}>
            {interview.candidateName}
          </div>
          <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {interview.positionTitle}
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: "#F1F5F9" }} />

      {/* Time info */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Video size={14} color="#64748B" />
          </div>
          <div>
            <div className="font-mono" style={{ fontSize: 14, fontWeight: 700, color: "#0F2147" }}>{time}</div>
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>{date}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#64748B", justifyContent: "flex-end" }}>
            <Clock size={11} />
            <span className="font-mono">{interview.duration} min</span>
          </div>
          {!isLive && (
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{until}</div>
          )}
        </div>
      </div>

      {/* Status pills */}
      <div style={{ display: "flex", gap: 8 }}>
        <StatusPill on={interview.agentOnline}      label="AI Agent"  onColor="#10B981" />
        <StatusPill on={interview.candidateJoined}  label="Candidate" onColor="#0EA5E9" />
      </div>

      {/* CTA */}
      <button
        className={isLive ? "btn-primary" : "btn-ghost"}
        style={{ width: "100%", justifyContent: "center", fontSize: 13 }}
        onClick={() =>
          toast(isLive ? `Joining live: ${interview.candidateName}` : `Details: ${new Date(interview.scheduledAt).toLocaleString("en-GB")}`)
        }
      >
        {isLive ? (
          <><Radio size={14} />Join Live Session</>
        ) : (
          <><Clock size={14} />View Details</>
        )}
      </button>
    </div>
  );
}

export default function InterviewsPage() {
  const { interviews, candidates } = useAppStore();

  const liveInterviews     = interviews.filter((i) => i.status === "in_progress");
  const upcomingInterviews = interviews.filter((i) => i.status === "scheduled");
  const noShowCandidates   = candidates.filter((c) => c.status === "no_show");
  const allActive          = [...liveInterviews, ...upcomingInterviews];

  return (
    <div style={{ padding: "36px 40px", display: "flex", flexDirection: "column", gap: 28, maxWidth: 1280 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "#0F2147", letterSpacing: "-0.025em" }}>
            Interviews Monitor
          </h1>
          <p style={{ fontSize: 14, color: "#94A3B8", marginTop: 6, fontWeight: 500 }}>
            Track live and upcoming AI voice interviews in real-time.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            background: "#fff",
            border: "1px solid #E2E8F0",
            borderRadius: 9,
            fontSize: 12,
            color: "#64748B",
            boxShadow: "0 1px 3px rgba(15,33,71,0.05)",
          }}
        >
          <div
            style={{
              width: 7, height: 7, borderRadius: "50%",
              background: liveInterviews.length > 0 ? "#10B981" : "#CBD5E1",
              boxShadow: liveInterviews.length > 0 ? "0 0 6px rgba(16,185,129,0.5)" : "none",
            }}
          />
          {liveInterviews.length > 0 ? (
            <span><strong style={{ color: "#10B981" }}>{liveInterviews.length}</strong> live now</span>
          ) : (
            <span>No sessions live</span>
          )}
        </div>
      </div>

      {/* Stat chips */}
      <div style={{ display: "flex", gap: 12 }}>
        {[
          { label: "Live Now",  value: liveInterviews.length,    color: "#EF4444" },
          { label: "Upcoming",  value: upcomingInterviews.length, color: "#F59E0B" },
          { label: "No Shows",  value: noShowCandidates.length,  color: "#94A3B8" },
        ].map((s) => (
          <div
            key={s.label}
            className="card"
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", flex: 1 }}
          >
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 26,
                fontWeight: 800,
                color: "#0F2147",
                letterSpacing: "-0.02em",
              }}
            >
              {s.value}
            </div>
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Interview cards */}
      {allActive.length > 0 ? (
        <div>
          <h2 style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>
            {liveInterviews.length > 0 ? "Live & Upcoming" : "Upcoming"}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {allActive.map((iv) => <InterviewCard key={iv.id} interview={iv} />)}
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center", padding: "48px 0" }}>
          <Video size={32} color="#CBD5E1" style={{ margin: "0 auto 12px" }} />
          <div style={{ fontSize: 14, color: "#94A3B8" }}>No interviews scheduled</div>
        </div>
      )}

      {/* No-shows table */}
      {noShowCandidates.length > 0 && (
        <div>
          <h2
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#94A3B8",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertCircle size={14} />
            No Shows
          </h2>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1.5fr 100px 100px",
                padding: "10px 20px",
                background: "#F8FAFC",
                borderBottom: "1px solid #E2E8F0",
              }}
            >
              {["Candidate", "Scheduled", "Duration", "Status"].map((h) => (
                <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {h}
                </div>
              ))}
            </div>
            {noShowCandidates.map((c) => {
              const dt = c.scheduledAt ? formatDateTime(c.scheduledAt) : null;
              return (
                <div
                  key={c.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1.5fr 100px 100px",
                    alignItems: "center",
                    padding: "14px 20px",
                    borderBottom: "1px solid #F1F5F9",
                    opacity: 0.75,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0F2147" }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{c.positionTitle}</div>
                  </div>
                  <div className="font-mono" style={{ fontSize: 12, color: "#64748B" }}>
                    {dt ? `${dt.date} · ${dt.time}` : "—"}
                  </div>
                  <div className="font-mono" style={{ fontSize: 12, color: "#94A3B8" }}>30 min</div>
                  <div><span className="badge badge-danger">No Show</span></div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
