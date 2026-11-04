"use client";

import { useState } from "react";
import { useAppStore, Candidate, Position } from "@/store/appStore";
import {
  Mail, Calendar, CheckCircle2, AlertCircle, AlertTriangle,
  RefreshCw, X, Send, ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal, ActionBar, Alert, Field, Textarea, Input } from "@/components/screen/ui";
import { lv, space, text, radius } from "@/lib/screen/ui/tokens";

// Design-System Pass 3 (group 3): presentation on the Screen design system.
// Fetches, store updates and toasts are unchanged.

// ─── Types ────────────────────────────────────────────────────────────────
interface InviteModalProps {
  candidate: Candidate;
  position: Position;
  onClose: () => void;
}

interface ScheduleModalProps {
  candidate: Candidate;
  position: Position;
  onClose: () => void;
}

// ─── Invite Modal ─────────────────────────────────────────────────────────
export function InviteModal({ candidate, position, onClose }: InviteModalProps) {
  const { updateCandidate } = useAppStore();
  const [sending,      setSending]      = useState(false);
  const [emailPreview, setEmailPreview] = useState<string | null>(null);
  const [editableEmail, setEditableEmail] = useState<string | null>(null);

  const duration = position.interviewDuration ?? 30;

  const preview = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/send-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId:   candidate.id,
          candidateName: candidate.name,
          candidateEmail:candidate.email,
          positionTitle: position.title,
          company:       position.company,
          duration,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEmailPreview(data.emailPreview);
      setEditableEmail(data.emailPreview);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const confirm = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/send-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId:   candidate.id,
          candidateName: candidate.name,
          candidateEmail:candidate.email,
          positionTitle: position.title,
          company:       position.company,
          duration,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      updateCandidate(candidate.id, {
        status:         "invited",
        invitedAt:      new Date().toISOString().split("T")[0],
        schedulingLink: data.schedulingLink,
      });
      toast.success(`Invite sent to ${candidate.name}`);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal open onClose={onClose} dismissible={!sending} title="Send interview invite"
      description={<>This will mark the candidate as &ldquo;Invited&rdquo;</>}
      footer={<ActionBar>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={confirm} disabled={position.status !== "active"} loading={sending} leftIcon={<Send size={14} />}>
          {sending ? "Sending…" : "Confirm & Send"}
        </Button>
      </ActionBar>}>
      <div style={{ display: "flex", flexDirection: "column", gap: space[4] }}>
        {/* Summary cards */}
        <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: space[2], margin: 0 }}>
          {[
            { label: "Candidate",  value: candidate.name     },
            { label: "Email",      value: candidate.email    },
            { label: "Position",   value: position.title     },
            { label: "Duration",   value: `${duration} min`  },
            { label: "Interviewer",value: "AI Interview Agent"},
            { label: "Format",     value: "Voice Interview"  },
          ].map((s) => (
            <div key={s.label} style={{ padding: `${space[2]}px ${space[3]}px`, background: lv.surfaceSunken, border: `1px solid ${lv.border}`, borderRadius: radius.md, minWidth: 0 }}>
              <dt className="lv-eyebrow">{s.label}</dt>
              <dd style={{ margin: "3px 0 0", fontSize: text.sm, fontWeight: 600, color: lv.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.value}</dd>
            </div>
          ))}
        </dl>

        {/* Position guard */}
        {position.status !== "active" && (
          <Alert tone="danger">Position is not yet approved — complete approval before scheduling interviews</Alert>
        )}

        {/* Email preview */}
        {emailPreview ? (
          <Field label="Email Preview (editable)">
            <Textarea
              value={editableEmail ?? ""}
              onChange={(e) => setEditableEmail(e.target.value)}
              style={{ fontFamily: lv.fontMono, fontSize: text.xs, resize: "vertical", lineHeight: 1.7, minHeight: 220 }}
            />
          </Field>
        ) : (
          <Button variant="secondary" style={{ alignSelf: "flex-start" }} onClick={preview} loading={sending} leftIcon={<Mail size={14} />}>
            {sending ? "Loading…" : "Preview Email"}
          </Button>
        )}
      </div>
    </Modal>
  );
}

// ─── Schedule Modal ───────────────────────────────────────────────────────
export function ScheduleModal({ candidate, position, onClose }: ScheduleModalProps) {
  const { updateCandidate } = useAppStore();
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving,      setSaving]      = useState(false);

  const confirm = async () => {
    if (!scheduledAt) { toast.error("Please pick a date and time"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/schedule-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId:   candidate.id,
          candidateName: candidate.name,
          positionTitle: position.title,
          scheduledAt:   new Date(scheduledAt).toISOString(),
          duration:      position.interviewDuration ?? 30,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      updateCandidate(candidate.id, {
        status:      "scheduled",
        scheduledAt: new Date(scheduledAt).toISOString(),
      });
      toast.success(`Interview scheduled for ${candidate.name}`);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} dismissible={!saving} size="sm" title="Schedule interview"
      footer={<ActionBar>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={confirm} disabled={!scheduledAt} loading={saving} leftIcon={<Calendar size={14} />}>
          {saving ? "Saving…" : "Confirm Schedule"}
        </Button>
      </ActionBar>}>
      <div style={{ display: "flex", flexDirection: "column", gap: space[4] }}>
        <div style={{ fontSize: text.sm, color: lv.textBody }}>
          Scheduling interview for <strong style={{ color: lv.text }}>{candidate.name}</strong> — {position.title}
        </div>
        <Field label="Interview Date & Time">
          <Input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
          />
        </Field>
        <Alert tone="info">Duration: {position.interviewDuration ?? 30} minutes · AI Voice Interview</Alert>
      </div>
    </Modal>
  );
}

// ─── Scheduling State Badge — shows on candidate cards ───────────────────
export function SchedulingBadge({
  candidate, position,
}: { candidate: Candidate; position: Position | undefined }) {
  const { updateCandidate } = useAppStore();
  const [showInvite,   setShowInvite]   = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  if (!position) return null;

  const now       = Date.now();
  const daysSince = (iso: string) => Math.floor((now - new Date(iso).getTime()) / 86400000);

  // ── State: PENDING ──
  if (candidate.status === "pending") {
    return (
      <>
        <Button size="sm" leftIcon={<Send size={14} />} onClick={() => setShowInvite(true)}>
          Send Invite
        </Button>
        {showInvite && <InviteModal candidate={candidate} position={position} onClose={() => setShowInvite(false)} />}
      </>
    );
  }

  // ── State: INVITED ──
  if (candidate.status === "invited") {
    const days = candidate.invitedAt ? daysSince(candidate.invitedAt) : 0;
    const overdue = days > 7;
    const warn    = days > 3 && !overdue;

    return (
      <>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: text.xs, color: lv.textMuted }}>
            Invite sent {candidate.invitedAt ? new Date(candidate.invitedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}
          </div>
          {overdue && (
            <div style={{ fontSize: text.xs, fontWeight: 600, color: lv.danger, display: "flex", alignItems: "center", gap: 4 }}>
              <AlertCircle size={12} aria-hidden="true" /> Follow up needed ({days}d)
            </div>
          )}
          {warn && (
            <div style={{ fontSize: text.xs, fontWeight: 600, color: lv.warning, display: "flex", alignItems: "center", gap: 4 }}>
              <AlertTriangle size={12} aria-hidden="true" /> No response in {days}d
            </div>
          )}
          <div style={{ display: "flex", gap: space[1], flexWrap: "wrap", marginLeft: -6 }}>
            {candidate.schedulingLink && (
              <a href={candidate.schedulingLink} target="_blank" rel="noreferrer" className="lv-btn lv-btn--tertiary lv-btn--sm" style={{ padding: "0 6px", fontSize: text.xs }}>
                <ExternalLink size={12} aria-hidden="true" /> Scheduling link
              </a>
            )}
            <Button variant="tertiary" size="sm" style={{ padding: "0 6px", fontSize: text.xs }} leftIcon={<Calendar size={12} />} onClick={() => setShowSchedule(true)}>
              Book slot
            </Button>
            <Button variant="tertiary" size="sm" style={{ padding: "0 6px", fontSize: text.xs }} leftIcon={<RefreshCw size={12} />} onClick={() => setShowInvite(true)}>
              Resend
            </Button>
          </div>
        </div>
        {showInvite    && <InviteModal    candidate={candidate} position={position} onClose={() => setShowInvite(false)}    />}
        {showSchedule  && <ScheduleModal  candidate={candidate} position={position} onClose={() => setShowSchedule(false)}  />}
      </>
    );
  }

  // ── State: SCHEDULED ──
  if (candidate.status === "scheduled" && candidate.scheduledAt) {
    const msUntil   = new Date(candidate.scheduledAt).getTime() - now;
    const imminent  = msUntil > 0 && msUntil < 5 * 60 * 1000;
    const dt        = new Date(candidate.scheduledAt);
    const dateStr   = dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    const timeStr   = dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

    return (
      <>
        {imminent && (
          <div role="alert" style={{ padding: `6px ${space[2]}px`, background: lv.dangerSoft, border: `1px solid ${lv.dangerBorder}`, borderRadius: radius.md, fontSize: text.xs, fontWeight: 600, color: lv.danger, display: "flex", gap: 6, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
            <AlertCircle size={12} aria-hidden="true" /> Starting soon — candidate not joined
            <Button variant="destructive" size="sm" style={{ marginLeft: "auto", height: 26, fontSize: text.xs }} onClick={() => toast("Escalation sent")}>
              Escalate
            </Button>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ fontSize: text.xs, fontWeight: 600, color: lv.text, fontFamily: lv.fontMono }}>{dateStr} · {timeStr}</div>
          <div style={{ display: "flex", gap: space[2], alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: text.xs, fontWeight: 600, color: lv.success, display: "flex", alignItems: "center", gap: 3 }}><CheckCircle2 size={12} aria-hidden="true" /> Scheduled</span>
            <Button variant="tertiary" size="sm" style={{ padding: "0 6px", fontSize: text.xs }} leftIcon={<Mail size={12} />}
              onClick={() => { updateCandidate(candidate.id, { remindersSent: (candidate.remindersSent ?? 0) + 1 }); toast.success("Reminder sent"); }}>
              Send Reminder {candidate.remindersSent ? `(${candidate.remindersSent})` : ""}
            </Button>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <ReadinessIndicator label="AI Agent"  on={true}  />
            <ReadinessIndicator label="Candidate" on={false} />
          </div>
        </div>
      </>
    );
  }

  // ── State: COMPLETED ──
  if (candidate.status === "completed") {
    return (
      <Button variant="secondary" size="sm" onClick={() => toast(`Report for ${candidate.name}`)}>
        View Report
      </Button>
    );
  }

  // ── State: NO SHOW ──
  if (candidate.status === "no_show") {
    return (
      <div style={{ display: "flex", gap: 6 }}>
        <Button variant="secondary" size="sm" leftIcon={<Calendar size={14} />} onClick={() => setShowSchedule(true)}>
          Reschedule
        </Button>
        {showSchedule && <ScheduleModal candidate={candidate} position={position} onClose={() => setShowSchedule(false)} />}
      </div>
    );
  }

  return null;
}

function ReadinessIndicator({ label, on }: { label: string; on: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: text.xs, color: on ? lv.success : lv.textMuted }}>
      <div aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: on ? lv.success : lv.borderStrong }} />
      {label}: {on ? "Online" : "Offline"}
    </div>
  );
}

// ─── Bulk invite button for pipeline header ──────────────────────────────
export function BulkInviteBar({ candidateIds }: { candidateIds: string[] }) {
  const { candidates, positions, updateCandidate } = useAppStore();
  const [loading, setLoading] = useState(false);

  const targets = candidates.filter((c) => candidateIds.includes(c.id) && c.status === "pending");
  if (targets.length === 0) return null;

  const sendAll = async () => {
    setLoading(true);
    let sent = 0;
    for (const c of targets) {
      const pos = positions.find((p) => p.id === c.positionId);
      if (!pos || pos.status !== "active") continue;
      try {
        const res = await fetch("/api/send-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateName: c.name, candidateEmail: c.email, positionTitle: pos.title, company: pos.company, duration: pos.interviewDuration ?? 30 }),
        });
        const data = await res.json();
        if (!data.error) {
          updateCandidate(c.id, { status: "invited", invitedAt: new Date().toISOString().split("T")[0], schedulingLink: data.schedulingLink });
          sent++;
        }
      } catch { /* skip */ }
    }
    toast.success(`${sent} invite${sent !== 1 ? "s" : ""} sent`);
    setLoading(false);
  };

  return (
    <Button size="sm" onClick={sendAll} loading={loading} leftIcon={<Send size={14} />}>
      {loading ? "Sending…" : <>Send {targets.length} Invite{targets.length !== 1 ? "s" : ""}</>}
    </Button>
  );
}

// ─── Scheduling overview strip for Interviews page ───────────────────────
export function SchedulingOverview() {
  const { candidates } = useAppStore();
  const [filter, setFilter] = useState<string | null>(null);

  const buckets = [
    { key: "pending",   label: "Pending Invite", color: lv.textMuted },
    { key: "invited",   label: "Invited",        color: lv.warning   },
    { key: "scheduled", label: "Scheduled",      color: lv.brand     },
    { key: "completed", label: "Completed",      color: lv.success   },
    { key: "no_show",   label: "No Show",        color: lv.danger    },
  ];

  const counts = buckets.reduce((acc, b) => {
    acc[b.key] = candidates.filter((c) => c.status === b.key).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 className="lv-eyebrow">Scheduling Overview</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 1, background: lv.border, borderRadius: radius.lg, overflow: "hidden", border: `1px solid ${lv.border}` }}>
        {buckets.map((b) => (
          <button
            key={b.key}
            type="button"
            aria-pressed={filter === b.key}
            className="lv-stat-tab"
            onClick={() => setFilter(filter === b.key ? null : b.key)}
            style={{
              padding: `${space[3]}px ${space[2]}px`, background: filter === b.key ? lv.surface : lv.surfaceSunken,
              border: "none", cursor: "pointer", textAlign: "center", transition: `background ${lv.dur}`,
              fontFamily: lv.fontSans,
            }}
          >
            <div style={{ fontFamily: lv.fontDisplay, fontSize: text.xl, fontWeight: 600, color: filter === b.key ? b.color : lv.text, letterSpacing: "-0.02em" }}>
              {counts[b.key]}
            </div>
            <div style={{ fontSize: text.xs, color: lv.textMuted, marginTop: 3, fontWeight: 500 }}>{b.label}</div>
            <div style={{ height: 3, background: filter === b.key ? b.color : "transparent", marginTop: 8, borderRadius: 2, transition: "background 0.2s" }} />
          </button>
        ))}
      </div>
      {filter && (
        <div style={{ fontSize: text.xs, color: lv.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
          Filtering by: <strong style={{ color: lv.text }}>{buckets.find((b) => b.key === filter)?.label}</strong>
          <Button variant="ghost" size="sm" iconOnly aria-label="Clear filter" onClick={() => setFilter(null)}><X size={14} /></Button>
        </div>
      )}
    </div>
  );
}

// ─── Today's interviews highlight ─────────────────────────────────────────
export function TodayInterviews() {
  const { interviews } = useAppStore();
  const today = new Date().toDateString();
  const todayInterviews = interviews.filter((i) => new Date(i.scheduledAt).toDateString() === today);

  if (todayInterviews.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <h2 className="lv-eyebrow" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: lv.success }} />
        Today ({todayInterviews.length})
      </h2>
      <div style={{ display: "flex", gap: space[3], flexWrap: "wrap" }}>
        {todayInterviews.map((i) => {
          const dt      = new Date(i.scheduledAt);
          const timeStr = dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
          return (
            <div key={i.id} className="lv-card" style={{ padding: `${space[3]}px ${space[4]}px`, minWidth: 200 }}>
              <div style={{ fontSize: text.sm, fontWeight: 600, color: lv.text }}>{i.candidateName}</div>
              <div style={{ fontSize: text.xs, color: lv.textMuted, marginTop: 2 }}>{i.positionTitle}</div>
              <div style={{ fontSize: text.xs, fontFamily: lv.fontMono, color: lv.brandText, marginTop: 6 }}>{timeStr} · {i.duration}m</div>
              <Button size="sm" style={{ marginTop: space[2] }} onClick={() => toast(`Monitoring ${i.candidateName}`)}>
                Monitor
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
