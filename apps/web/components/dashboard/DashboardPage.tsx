"use client";

import { useState, useEffect } from "react";
import { useAppStore, Candidate } from "@/store/appStore";
import { Briefcase, Users, Video, TrendingUp, ArrowRight, Play, Monitor, Plus, Upload } from "lucide-react";
import StartInterviewModal from "@/components/interview/StartInterviewModal";
import { useRouter } from "next/navigation";
import { Tooltip } from "@/components/ui/Tooltip";
import { Page, PageHeader, Card, Button, Badge, EmptyState, Skeleton, type Tone } from "@/components/screen/ui";
import { lv, space, text, radius } from "@/lib/screen/ui/tokens";

// Design-System Pass 3 (group 1): canonical components + tokens. Data loading,
// calculations and every handler are unchanged from the previous version.

function StatCard({ icon: Icon, label, value, sub, tone, loading, onClick }: {
  icon: React.ElementType; label: string; value: string | number; sub: string
  tone: "brand" | "success" | "warning" | "accent"; loading?: boolean; onClick?: () => void
}) {
  const tint = { brand: [lv.brandSoft, lv.brand], success: [lv.successSoft, lv.success], warning: [lv.warningSoft, lv.warning], accent: [lv.accentSoft, lv.accent] }[tone];
  return (
    <Card onClick={onClick}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: space[4] }}>
        <span className="lv-eyebrow">{label}</span>
        <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: radius.md, background: tint[0], display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={17} color={tint[1]} strokeWidth={2} />
        </span>
      </div>
      {loading
        ? <Skeleton width={56} height={32} radius={8} />
        : <div style={{ fontFamily: lv.fontDisplay, fontSize: text["2xl"] + 4, fontWeight: 700, color: lv.text, lineHeight: 1, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{value}</div>}
      <div style={{ fontSize: text.sm, color: lv.textMuted, marginTop: space[2] }}>{sub}</div>
    </Card>
  );
}

const REC_CONFIG: Record<string, { label: string; tone: Tone }> = {
  strong_yes: { label: "Strong Yes", tone: "success" },
  yes:        { label: "Yes",        tone: "success" },
  maybe:      { label: "Maybe",      tone: "warning" },
  no:         { label: "No",         tone: "danger" },
};

const STATUS_CONFIG: Record<string, { label: string; tone: Tone }> = {
  active:           { label: "Active",           tone: "success" },
  pending_approval: { label: "Pending Approval", tone: "warning" },
  draft:            { label: "Draft",            tone: "neutral" },
  paused:           { label: "Paused",           tone: "neutral" },
  closed:           { label: "Closed",           tone: "danger"  },
  won:              { label: "Won",              tone: "success" },
  lost:             { label: "Lost",             tone: "danger"  },
};

// Shared look for the list rows inside dashboard cards.
const rowStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: space[3], padding: `${space[3]}px ${space[4]}px`,
  background: lv.surfaceSunken, borderRadius: radius.md, border: `1px solid ${lv.border}`,
};
const nameStyle: React.CSSProperties = { fontSize: text.base, fontWeight: 600, color: lv.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const metaStyle: React.CSSProperties = { fontSize: text.xs, color: lv.textMuted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

export default function DashboardPage() {
  const router = useRouter();
  const { positions, candidates, interviews, setActiveSection, setShowNewPositionFlow, setShowUploadFlow } = useAppStore();
  const [modalCandidate, setModalCandidate] = useState<Candidate | null>(null);

  const [stats, setStats] = useState<{
    activePositions?: number
    totalPositions?: number
    totalCandidates?: number
    scheduledInterviews?: number
    completedInterviews?: number
    avgScore?: number
    scoredCount?: number
    topCandidates?: unknown[]
    upcomingInterviews?: unknown[]
  } | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStats(data) })
      .catch(() => {})
      .finally(() => setStatsLoading(false))
  }, [])

  const upcomingInterviews = interviews.filter(
    (i) => i.status === "scheduled" || i.status === "in_progress"
  );
  const scoredCandidates = candidates.filter((c) => c.score !== undefined);
  const avgScore =
    scoredCandidates.length > 0
      ? Math.round(scoredCandidates.reduce((a, c) => a + (c.score ?? 0), 0) / scoredCandidates.length)
      : 0;

  const activePositions    = stats?.activePositions  ?? positions.filter(p => p.status === 'active').length
  const totalCandidates    = stats?.totalCandidates  ?? candidates.length
  const scheduledCount     = stats?.scheduledInterviews ?? upcomingInterviews.length
  const displayAvgScore    = stats?.avgScore ?? avgScore
  const displayScoredCount = stats?.scoredCount ?? scoredCandidates.length

  const topCandidates = [...candidates]
    .filter((c) => c.status === "completed" && c.score !== undefined)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const now    = new Date();
  const hour   = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr  = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const modalPosition = modalCandidate
    ? positions.find((p) => p.id === modalCandidate.positionId)
    : undefined;

  // Same actions the sidebar's "New Position" / "Upload Candidates" buttons trigger.
  const openNewPosition = () => { setActiveSection("positions"); setShowNewPositionFlow(true); };
  const openUpload = () => { setActiveSection("candidates"); setShowUploadFlow(true); };

  const viewAll = (onClick: () => void) => (
    <Button variant="tertiary" size="sm" onClick={onClick} rightIcon={<ArrowRight size={13} />}>View all</Button>
  );

  return (
    <>
    {modalCandidate && (
      <StartInterviewModal
        candidate={modalCandidate}
        position={modalPosition}
        onClose={() => setModalCandidate(null)}
      />
    )}
    <Page>
      <PageHeader
        eyebrow={dateStr}
        title={`${greeting} 👋`}
        description="Here's your recruitment pipeline at a glance."
        actions={<>
          <Button variant="secondary" leftIcon={<Upload size={15} />} onClick={openUpload}>Upload Candidates</Button>
          <Button leftIcon={<Plus size={16} />} onClick={openNewPosition}>New Position</Button>
        </>}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: space[6] }}>
        {/* Stat cards */}
        <div className="dash-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: space[4] }}>
          <StatCard icon={Briefcase}  label="Active Positions" value={activePositions} loading={statsLoading} sub={`${stats?.totalPositions ?? positions.length} total positions`} tone="brand"   onClick={() => setActiveSection("positions")} />
          <StatCard icon={Users}      label="Candidates"       value={totalCandidates} loading={statsLoading} sub={`${topCandidates.length} interviews completed`}               tone="success" onClick={() => setActiveSection("candidates")} />
          <StatCard icon={Video}      label="Upcoming"         value={scheduledCount}  loading={statsLoading} sub="Interviews scheduled"                                         tone="warning" onClick={() => setActiveSection("interviews")} />
          <StatCard icon={TrendingUp} label="Avg Score"        value={displayScoredCount > 0 ? displayAvgScore : "—"} loading={statsLoading} sub={`Across ${displayScoredCount} reports`} tone="accent" onClick={() => setActiveSection("reports")} />
        </div>

        {/* Middle row */}
        <div className="dash-mid-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: space[5] }}>

          {/* Upcoming Interviews */}
          <Card title="Upcoming Interviews" actions={<Badge tone="brand">{upcomingInterviews.length} scheduled</Badge>}>
            {upcomingInterviews.length === 0 ? (
              <EmptyState plain icon={<Video size={20} />} title="No interviews scheduled"
                description="Upload candidates to a position and send invites — scheduled interviews show up here."
                action={<Button variant="secondary" size="sm" leftIcon={<Upload size={14} />} onClick={openUpload}>Upload Candidates</Button>} />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
                {upcomingInterviews.map((iv) => {
                  const linkedCandidate = candidates.find((c) => c.id === iv.candidateId);
                  return (
                    <div key={iv.id} style={{ ...rowStyle, flexDirection: "column", alignItems: "stretch", gap: space[3] }}>
                      <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
                        <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: radius.md, background: lv.brandSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Video size={16} color={lv.brand} />
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={nameStyle}>{iv.candidateName}</div>
                          <div style={metaStyle}>{iv.positionTitle}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                          <div style={{ fontSize: text.sm, color: lv.text, fontWeight: 600 }}>
                            {new Date(iv.scheduledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </div>
                          <div style={{ fontSize: text.xs, color: lv.textMuted, marginTop: 2 }}>
                            {new Date(iv.scheduledAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                        <span title={iv.agentOnline ? "Interviewer online" : "Interviewer offline"} aria-label={iv.agentOnline ? "Interviewer online" : "Interviewer offline"}
                          style={{ width: 8, height: 8, borderRadius: "50%", background: iv.agentOnline ? lv.success : lv.borderStrong, flexShrink: 0 }} />
                      </div>
                      <div style={{ display: "flex", gap: space[2] }}>
                        <Tooltip content="Launch the AI interview room for this candidate" position="top">
                          <Button size="sm" fullWidth leftIcon={<Play size={12} fill="currentColor" strokeWidth={0} />}
                            onClick={() => { if (linkedCandidate) setModalCandidate(linkedCandidate); }}>Start</Button>
                        </Tooltip>
                        <Tooltip content="Watch the live transcript and scores in a separate tab" position="top">
                          <Button size="sm" variant="secondary" leftIcon={<Monitor size={13} />}
                            onClick={() => window.open(`/interview/${iv.id}/monitor`, "_blank")}>Monitor</Button>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Top Candidates */}
          <Card title="Top Candidates" actions={<><Badge tone="success">{topCandidates.length} evaluated</Badge>{viewAll(() => setActiveSection("reports"))}</>}>
            {topCandidates.length === 0 ? (
              <EmptyState plain icon={<TrendingUp size={20} />} title="No reports yet"
                description="Once candidates complete their interviews, the strongest ones are ranked here." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
                {topCandidates.map((c, idx) => {
                  const rec = REC_CONFIG[c.recommendation as string];
                  const initials = c.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                  const open = () => c.interviewId && router.push(`/report/${c.interviewId}`);
                  return (
                    <div key={c.id} role={c.interviewId ? "button" : undefined} tabIndex={c.interviewId ? 0 : undefined}
                      onClick={open} onKeyDown={(e) => { if (e.key === "Enter") open(); }}
                      className="lv-card--interactive" style={{ ...rowStyle, cursor: c.interviewId ? "pointer" : "default" }}>
                      <span style={{ width: 24, fontSize: text.xs, fontWeight: 700, color: idx === 0 ? lv.warning : lv.textMuted, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>#{idx + 1}</span>
                      <span aria-hidden="true" style={{ width: 34, height: 34, borderRadius: "50%", background: idx === 0 ? lv.brandSoft : lv.surfaceMuted, border: `1px solid ${idx === 0 ? lv.brandSoftBorder : lv.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: text.xs, fontWeight: 700, color: idx === 0 ? lv.brandText : lv.textMuted, flexShrink: 0 }}>{initials}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={nameStyle}>{c.name}</div>
                        <div style={metaStyle}>{c.positionTitle}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: space[1], flexShrink: 0 }}>
                        <Tooltip content="Composite score across all interview sections (0–100)" position="left">
                          <span style={{ fontSize: text.lg, fontWeight: 700, color: lv.text, lineHeight: 1, fontVariantNumeric: "tabular-nums", cursor: "default" }}>{c.score}</span>
                        </Tooltip>
                        {rec && (
                          <Tooltip position="left" content={
                            c.recommendation === "strong_yes" ? "Strong Yes — top 15% of candidates" :
                            c.recommendation === "yes"        ? "Yes — clear hire recommendation" :
                            c.recommendation === "maybe"      ? "Maybe — further assessment recommended" :
                                                                "No — does not meet the bar for this role"}>
                            <Badge tone={rec.tone}>{rec.label}</Badge>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Positions Overview */}
        <Card title="Positions Overview" actions={positions.length ? viewAll(() => setActiveSection("positions")) : undefined}>
          {positions.length === 0 ? (
            <EmptyState plain icon={<Briefcase size={20} />} title="No positions yet"
              description="Create your first position to generate a tailored interview and start interviewing candidates."
              action={<Button size="sm" leftIcon={<Plus size={14} />} onClick={openNewPosition}>Create position</Button>} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
              {positions.map((pos) => {
                const cfg   = STATUS_CONFIG[pos.status as string];
                const total = pos.interviewsScheduled + pos.interviewsCompleted;
                const pct   = total > 0 ? Math.round((pos.interviewsCompleted / total) * 100) : 0;
                return (
                  <div key={pos.id} role="button" tabIndex={0} onClick={() => setActiveSection("positions")}
                    onKeyDown={(e) => { if (e.key === "Enter") setActiveSection("positions"); }}
                    className="lv-card--interactive" style={{ ...rowStyle, gap: space[4], cursor: "pointer" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={nameStyle}>{pos.title}</div>
                      <div style={metaStyle}>{[pos.company, pos.department].filter(Boolean).join(" · ")}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: space[4], flexShrink: 0 }}>
                      {total > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: space[2] }} aria-label={`${pos.interviewsCompleted} of ${total} interviews completed`}>
                          <div style={{ width: 72, height: 4, borderRadius: 2, background: lv.border, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: lv.brand, borderRadius: 2, transition: "width 0.5s ease" }} />
                          </div>
                          <span style={{ fontSize: text.xs, color: lv.textMuted, minWidth: 32, fontVariantNumeric: "tabular-nums" }}>{pos.interviewsCompleted}/{total}</span>
                        </div>
                      )}
                      {cfg && <Badge tone={cfg.tone}>{cfg.label}</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </Page>

    <style>{`
      @media (max-width: 768px) {
        .dash-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        .dash-mid-grid   { grid-template-columns: 1fr !important; }
      }
    `}</style>
    </>
  );
}
