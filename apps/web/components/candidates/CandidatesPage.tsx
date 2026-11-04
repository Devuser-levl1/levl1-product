"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, Candidate } from "@/store/appStore";
import { Filter, Calendar, Mail, Star, Upload, Send, Play, Monitor, FileText, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import CandidateUploadFlow from "./CandidateUploadFlow";
import { SchedulingBadge, BulkInviteBar } from "./SchedulingAgent";
import StartInterviewModal from "@/components/interview/StartInterviewModal";
import { Page, PageHeader, Button, Badge, Alert, Select, EmptyState, type Tone } from "@/components/screen/ui";
import { lv, space, text, radius } from "@/lib/screen/ui/tokens";

// Design-System Pass 3 (group 3): presentation on the Screen design system.
// Pipeline grouping, report generation and monitor/interview actions unchanged.

type PipelineColumn = {
  key: string;
  label: string;
  statuses: Candidate["status"][];
  dotColor: string;
};

const COLUMNS: PipelineColumn[] = [
  { key: "pending",           label: "Pending",             statuses: ["pending"],             dotColor: lv.textSubtle },
  { key: "invited",           label: "Invited",             statuses: ["invited"],             dotColor: lv.warning    },
  { key: "scheduled",         label: "Scheduled",           statuses: ["scheduled"],           dotColor: lv.brand      },
  { key: "interviewing",      label: "Interviewing",        statuses: ["interviewing"],        dotColor: lv.accent     },
  { key: "completed",         label: "Completed",           statuses: ["completed"],           dotColor: lv.success    },
  { key: "no_show_cancelled", label: "No Show / Cancelled", statuses: ["no_show","cancelled"], dotColor: lv.danger     },
];

const REC_CFG: Record<string, { label: string; tone: Tone }> = {
  strong_yes: { label: "Strong Yes", tone: "success" },
  yes:        { label: "Yes",        tone: "success" },
  maybe:      { label: "Maybe",      tone: "warning" },
  no:         { label: "No",         tone: "danger"  },
};

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
  const rec = candidate.recommendation ? REC_CFG[candidate.recommendation] : null;

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

  const divider: React.CSSProperties = { borderTop: `1px solid ${lv.border}`, paddingTop: space[2] };
  return (
    <article className="lv-card lv-card--hover" aria-label={candidate.name}
      style={{ padding: space[3], display: "flex", flexDirection: "column", gap: space[2] }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: space[2] }}>
        <div aria-hidden="true" style={{
          width: 34, height: 34, borderRadius: "50%",
          background: isScheduled ? lv.accentSoft : lv.brandSoft,
          border: `1px solid ${isScheduled ? lv.brandSoftBorder : lv.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: text.xs, fontWeight: 600,
          color: lv.brandText,
          flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: text.sm, fontWeight: 600, color: lv.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {candidate.name}
          </h3>
          <div style={{ fontSize: text.xs, color: lv.textMuted, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {candidate.positionTitle}
          </div>
        </div>
        {candidate.score !== undefined && (
          <div className="font-mono" aria-label={`Score ${candidate.score}`} style={{ fontSize: text.md, fontWeight: 600, color: lv.text, flexShrink: 0 }}>
            {candidate.score}
          </div>
        )}
      </div>

      {/* Email */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: text.xs, color: lv.textMuted }}>
        <Mail size={12} aria-hidden="true" style={{ flexShrink: 0 }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{candidate.email}</span>
      </div>

      {/* No-phone warning — WhatsApp invites/reminders require a phone number */}
      {!candidate.phone && (
        <span title="Add a phone number to enable WhatsApp invites and reminders. Email invites still send."
          style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "flex-start", gap: 4, fontSize: 11, fontWeight: 600, lineHeight: 1.35,
            padding: "2px 8px", borderRadius: radius.pill, background: lv.warningSoft, color: lv.warning, border: `1px solid ${lv.warningBorder}` }}>
          <AlertTriangle size={11} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} /> No phone — WhatsApp unavailable
        </span>
      )}

      {/* Skills */}
      {candidate.topSkills && candidate.topSkills.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {candidate.topSkills.slice(0, 3).map((s) => (
            <span key={s} style={{ fontSize: 11, fontFamily: lv.fontMono, padding: "1px 6px", borderRadius: radius.sm, background: lv.surfaceMuted, color: lv.textBody, border: `1px solid ${lv.border}` }}>
              {s}
            </span>
          ))}
          {candidate.topSkills.length > 3 && <span style={{ fontSize: 11, color: lv.textMuted }}>+{candidate.topSkills.length - 3}</span>}
        </div>
      )}

      {/* Scheduled time + recommendation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, flexWrap: "wrap" }}>
        {candidate.scheduledAt ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: text.xs, color: lv.textBody }}>
            <Calendar size={12} aria-hidden="true" />
            <span className="font-mono">
              {new Date(candidate.scheduledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}{" "}
              {new Date(candidate.scheduledAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ) : (
          <div style={{ fontSize: text.xs, color: lv.textMuted }}>
            {candidate.currentTitle
              ? `${candidate.currentTitle}${candidate.totalYearsExperience ? ` · ${candidate.totalYearsExperience}y` : ""}`
              : ""}
          </div>
        )}
        {rec && (
          <Badge tone={rec.tone}><Star size={10} aria-hidden="true" /> {rec.label}</Badge>
        )}
      </div>

      {/* Scheduling badge */}
      <div style={divider}>
        <SchedulingBadge candidate={candidate} position={position} />
      </div>

      {/* ── Start Interview / Monitor actions ── */}
      {showActions && (
        <div style={{ ...divider, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Button size="sm" style={{ flex: "1 1 auto" }} leftIcon={<Play size={12} fill="currentColor" strokeWidth={0} />}
            onClick={(e) => { e.stopPropagation(); onStartInterview(candidate); }}>
            Start Interview
          </Button>
          <Button variant="secondary" size="sm" leftIcon={<Monitor size={13} />} onClick={handleMonitor}
            title="Open recruiter monitor in new tab" aria-label={`Monitor ${candidate.name}'s interview (opens in new tab)`}>
            Monitor
          </Button>
        </div>
      )}

      {/* ── View / Generate Report (completed candidates) ── */}
      {isCompleted && candidate.interviewId && (
        <div style={divider}>
          <Button variant="secondary" size="sm" fullWidth onClick={handleGenerateReport} loading={generatingReport}
            leftIcon={<FileText size={13} />}
            style={candidate.reportGenerated ? { color: lv.success } : undefined}>
            {generatingReport ? "Generating…" : candidate.reportGenerated ? "View Report" : "Generate Report"}
          </Button>
        </div>
      )}
    </article>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function CandidatesPage() {
  const { candidates: allCandidates, positions, showUploadFlow, setShowUploadFlow } = useAppStore();
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [modalCandidate, setModalCandidate] = useState<Candidate | null>(null);

  // Never show public-gallery demo runs in a real agency's pipeline.
  const candidates = allCandidates.filter((c) => !c.isDemo);

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

      <Page style={{ maxWidth: 1600 }}>
        <PageHeader
          title="Candidates"
          description={`${filtered.length} candidate${filtered.length !== 1 ? "s" : ""} across all stages`}
          actions={<>
            <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
              <Filter size={14} color={lv.textMuted} aria-hidden="true" />
              <Select aria-label="Filter by position" value={selectedPosition} onChange={(e) => setSelectedPosition(e.target.value)} style={{ minWidth: 180, width: "auto" }}>
                <option value="all">All Positions</option>
                {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </Select>
            </div>
            <Button leftIcon={<Upload size={16} />} onClick={() => setShowUploadFlow(true)}>Upload Candidates</Button>
          </>}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: space[6] }}>
        {/* Pending invites banner */}
        {pendingAll.length > 0 && (
          <Alert tone="info" action={<BulkInviteBar candidateIds={pendingAll.map((c) => c.id)} />}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: space[2] }}>
              <Send size={14} aria-hidden="true" />
              <span><strong>{pendingAll.length}</strong> candidate{pendingAll.length !== 1 ? "s" : ""} awaiting interview invite</span>
            </span>
          </Alert>
        )}

        {candidates.length === 0 ? (
          <EmptyState icon={<Upload size={22} />} title="No candidates yet"
            description="Upload resumes and Levl1 extracts each candidate's details, ready to invite to an interview."
            action={<Button leftIcon={<Upload size={16} />} onClick={() => setShowUploadFlow(true)}>Upload Candidates</Button>} />
        ) : (
        /* Kanban */
        <div className="candidates-kanban" style={{ display: "grid", gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(232px, 1fr))`, gap: space[3], alignItems: "start", overflowX: "auto", paddingBottom: space[2] }}>
          {COLUMNS.map((col) => {
            const cards = byColumn[col.key] ?? [];
            return (
              <section key={col.key} aria-labelledby={`col-${col.key}`} style={{ display: "flex", flexDirection: "column", gap: space[2], minWidth: 0 }}>
                {/* Column header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: col.dotColor }} />
                    <h2 id={`col-${col.key}`} style={{ margin: 0, fontSize: text.xs, fontWeight: 600, color: lv.textBody, letterSpacing: "0.02em" }}>
                      {col.label}
                    </h2>
                  </div>
                  <span className="lv-tab__count" aria-label={`${cards.length} candidates`}>{cards.length}</span>
                </div>

                {/* Cards */}
                <div style={{
                  minHeight: 80, background: lv.surfaceSunken, border: `1px dashed ${lv.borderStrong}`,
                  borderRadius: radius.lg, padding: space[2], display: "flex", flexDirection: "column", gap: space[2],
                }}>
                  {cards.length === 0 ? (
                    <div style={{ textAlign: "center", padding: `${space[6]}px 0`, color: lv.textMuted, fontSize: text.xs, fontWeight: 500 }}>
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
              </section>
            );
          })}
        </div>
        )}
        </div>
      </Page>
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
