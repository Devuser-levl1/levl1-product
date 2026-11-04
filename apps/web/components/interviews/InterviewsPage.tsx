"use client";

import { useState } from "react";
import { useAppStore, Interview, Candidate } from "@/store/appStore";
import { Video, Clock, Radio, AlertCircle, Play, Monitor } from "lucide-react";
import toast from "react-hot-toast";
import { SchedulingOverview, TodayInterviews } from "../candidates/SchedulingAgent";
import StartInterviewModal from "@/components/interview/StartInterviewModal";
import { Page, PageHeader, Button, Badge, Card, EmptyState, Table, Eyebrow, type Column } from "@/components/screen/ui";
import { lv, space, text, radius } from "@/lib/screen/ui/tokens";

// Design-System Pass 3 (group 4): presentation on the Screen design system.
// Start/monitor actions and the interview grouping are unchanged.

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
        display: "flex", alignItems: "center", gap: 6,
        padding: "4px 10px", borderRadius: radius.pill,
        background: on ? lv.surface : lv.surfaceSunken,
        border: `1px solid ${on ? lv.borderStrong : lv.border}`,
      }}
    >
      <div aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: on ? onColor : lv.borderStrong }} />
      <span style={{ fontSize: text.xs, fontWeight: 600, color: on ? lv.text : lv.textMuted }}>
        {label}<span className="lv-sr-only">{on ? " online" : " offline"}</span>
      </span>
    </div>
  );
}

function InterviewCard({ interview, onStart }: { interview: Interview; onStart: (iv: Interview) => void }) {
  const { date, time } = formatDateTime(interview.scheduledAt);
  const until          = timeUntil(interview.scheduledAt);
  const isLive         = interview.status === "in_progress";

  return (
    <article
      className="lv-card"
      aria-label={`${interview.candidateName}${isLive ? " (live)" : ""}`}
      style={{
        padding: space[5],
        display: "flex", flexDirection: "column", gap: space[4],
        position: "relative", overflow: "hidden",
        borderColor: isLive ? lv.brandSoftBorder : undefined,
      }}
    >
      {/* Top accent bar */}

      {/* LIVE badge */}
      {isLive && (
        <span style={{ position: "absolute", top: space[4], right: space[4] }}>
          <Badge tone="danger" dot>LIVE</Badge>
        </span>
      )}

      {/* Avatar + name */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: space[3], paddingTop: 4 }}>
        <div aria-hidden="true" style={{
          width: 46, height: 46, borderRadius: radius.md,
          background: lv.surfaceMuted,
          border: `1px solid ${lv.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: text.md, fontWeight: 600, color: lv.textBody,
          flexShrink: 0, fontFamily: lv.fontDisplay,
        }}>
          {interview.candidateName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingRight: isLive ? 64 : 0 }}>
          <h3 style={{ margin: 0, fontSize: text.md, fontWeight: 600, color: lv.text, fontFamily: lv.fontDisplay }}>
            {interview.candidateName}
          </h3>
          <div style={{ fontSize: text.xs, color: lv.textMuted, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {interview.positionTitle}
          </div>
        </div>
      </div>

      <div aria-hidden="true" style={{ height: 1, background: lv.border }} />

      {/* Time info */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
          <div>
            <div className="font-mono" style={{ fontSize: text.base, fontWeight: 600, color: lv.text }}>{time}</div>
            <div style={{ fontSize: text.xs, color: lv.textMuted, marginTop: 1 }}>{date}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: text.xs, color: lv.textBody, justifyContent: "flex-end" }}>
            <Clock size={12} aria-hidden="true" />
            <span className="font-mono">{interview.duration} min</span>
          </div>
          {!isLive && (
            <div style={{ fontSize: text.xs, color: lv.textMuted, marginTop: 2 }}>{until}</div>
          )}
        </div>
      </div>

      {/* Status pills */}
      <div style={{ display: "flex", gap: space[2], flexWrap: "wrap" }}>
        <StatusPill on={interview.agentOnline}      label="AI Agent"  onColor={lv.success} />
        <StatusPill on={interview.candidateJoined}  label="Candidate" onColor={lv.brand} />
      </div>

      {/* CTA */}
      <div style={{ display: "flex", gap: space[2] }}>
        <Button variant={isLive ? "primary" : "secondary"} style={{ flex: 1 }} onClick={() => onStart(interview)}
          leftIcon={isLive ? <Radio size={14} /> : <Play size={14} fill="currentColor" strokeWidth={0} />}>
          {isLive ? "Join Live" : "Start"}
        </Button>
        <Button variant="secondary" leftIcon={<Monitor size={14} />}
          aria-label={`Monitor ${interview.candidateName}'s interview (opens in new tab)`}
          onClick={() => window.open(`/interview/${interview.id}/monitor`, "_blank")}>
          Monitor
        </Button>
      </div>
    </article>
  );
}

export default function InterviewsPage() {
  const { interviews, candidates, positions } = useAppStore();
  const [modalCandidate, setModalCandidate] = useState<Candidate | null>(null);
  const [modalPosition, setModalPosition] = useState<ReturnType<typeof positions.find>>(undefined);

  const liveInterviews     = interviews.filter((i) => i.status === "in_progress");
  const upcomingInterviews = interviews.filter((i) => i.status === "scheduled");
  const noShowCandidates   = candidates.filter((c) => c.status === "no_show");
  const allActive          = [...liveInterviews, ...upcomingInterviews];

  const noShowColumns: Column<Candidate>[] = [
    { key: "candidate", header: "Candidate", render: (c) => (
      <div>
        <div style={{ fontSize: text.sm, fontWeight: 600, color: lv.text }}>{c.name}</div>
        <div style={{ fontSize: text.xs, color: lv.textMuted, marginTop: 2 }}>{c.positionTitle}</div>
      </div>
    ) },
    { key: "scheduled", header: "Scheduled", render: (c) => {
      const dt = c.scheduledAt ? formatDateTime(c.scheduledAt) : null;
      return <span className="font-mono" style={{ fontSize: text.xs, color: lv.textBody }}>{dt ? `${dt.date} · ${dt.time}` : "—"}</span>;
    } },
    { key: "duration", header: "Duration", width: 100, render: () => <span className="font-mono" style={{ fontSize: text.xs, color: lv.textMuted }}>30 min</span> },
    { key: "status", header: "Status", width: 110, render: () => <Badge tone="danger">No Show</Badge> },
  ];

  function handleStart(iv: Interview) {
    const candidate = candidates.find((c) => c.id === iv.candidateId);
    const position  = positions.find((p) => p.id === iv.positionId);
    if (candidate) {
      setModalCandidate(candidate);
      setModalPosition(position);
    } else {
      toast.error("Candidate not found");
    }
  }

  return (
    <>
      {modalCandidate && (
        <StartInterviewModal
          candidate={modalCandidate}
          position={modalPosition}
          onClose={() => { setModalCandidate(null); setModalPosition(undefined); }}
        />
      )}
    <Page style={{ maxWidth: 1280 }}>
      <PageHeader
        title="Interviews"
        description="Track live and upcoming AI voice interviews in real-time."
        actions={
          <div role="status" style={{
            display: "flex", alignItems: "center", gap: space[2], padding: `${space[2]}px ${space[4]}px`,
            background: lv.surface, border: `1px solid ${lv.border}`, borderRadius: radius.md, fontSize: text.xs, color: lv.textBody,
          }}>
            <div aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: liveInterviews.length > 0 ? lv.success : lv.borderStrong }} />
            {liveInterviews.length > 0 ? (
              <span><strong style={{ color: lv.success }}>{liveInterviews.length}</strong> live now</span>
            ) : (
              <span>No interviews live</span>
            )}
          </div>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: space[8] }}>
      {/* Scheduling Overview */}
      <SchedulingOverview />

      {/* Today's interviews */}
      <TodayInterviews />

      {/* Stat chips */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: space[3] }}>
        {[
          { label: "Live Now",  value: liveInterviews.length,     color: lv.danger  },
          { label: "Upcoming",  value: upcomingInterviews.length, color: lv.warning },
          { label: "No Shows",  value: noShowCandidates.length,   color: lv.textMuted },
        ].map((s) => (
          <Card key={s.label} style={{ display: "flex", alignItems: "center", gap: space[3], padding: `${space[3]}px ${space[5]}px` }}>
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
            <div style={{ fontFamily: lv.fontDisplay, fontSize: text["2xl"], fontWeight: 600, color: lv.text, letterSpacing: "-0.02em" }}>
              {s.value}
            </div>
            <div style={{ fontSize: text.sm, color: lv.textBody, fontWeight: 600 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Interview cards */}
      {allActive.length > 0 ? (
        <section aria-labelledby="iv-active">
          <Eyebrow style={{ marginBottom: space[3] }}><span id="iv-active">{liveInterviews.length > 0 ? "Live & Upcoming" : "Upcoming"}</span></Eyebrow>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))", gap: space[4] }}>
            {allActive.map((iv) => <InterviewCard key={iv.id} interview={iv} onStart={handleStart} />)}
          </div>
        </section>
      ) : (
        <EmptyState icon={<Video size={22} />} title="No interviews scheduled"
          description="Invite candidates from the Candidates pipeline — their interviews show up here once booked." />
      )}

      {/* No-shows table */}
      {noShowCandidates.length > 0 && (
        <section aria-labelledby="iv-noshow">
          <Eyebrow style={{ marginBottom: space[3], display: "flex", alignItems: "center", gap: space[2] }}>
            <AlertCircle size={14} aria-hidden="true" /><span id="iv-noshow">No Shows</span>
          </Eyebrow>
          <Table<Candidate>
            caption="No-show candidates"
            rowKey={(c) => c.id}
            rows={noShowCandidates}
            columns={noShowColumns}
          />
        </section>
      )}
      </div>
    </Page>
    </>
  );
}
