"use client";

import { useState } from "react";
import { useAppStore, Candidate, Position } from "@/store/appStore";
import {
  Mail, Calendar, CheckCircle2, AlertCircle, AlertTriangle,
  RefreshCw, X, Send, ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";

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
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(15,33,71,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "min(95vw, 560px)", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(15,33,71,0.25)" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 800, color: "#0F2147" }}>Send Interview Invite</h3>
            <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 3 }}>This will mark the candidate as &ldquo;Invited&rdquo;</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 4 }}><X size={18} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Candidate",  value: candidate.name     },
              { label: "Email",      value: candidate.email    },
              { label: "Position",   value: position.title     },
              { label: "Duration",   value: `${duration} min`  },
              { label: "Interviewer",value: "AI Interview Agent"},
              { label: "Format",     value: "Voice Interview"  },
            ].map((s) => (
              <div key={s.label} style={{ padding: "10px 12px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0F2147", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Position guard */}
          {position.status !== "active" && (
            <div style={{ padding: "12px 14px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, fontSize: 12, color: "#DC2626", display: "flex", gap: 8, alignItems: "center" }}>
              <AlertCircle size={13} />
              Position is not yet approved — complete approval before scheduling interviews
            </div>
          )}

          {/* Email preview */}
          {emailPreview ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Email Preview (editable)</label>
              <textarea
                value={editableEmail ?? ""}
                onChange={(e) => setEditableEmail(e.target.value)}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 8, border: "1px solid #E2E8F0",
                  fontSize: 12, color: "#475569", fontFamily: "var(--font-mono)", resize: "vertical",
                  outline: "none", lineHeight: 1.7, minHeight: 220, background: "#F8FAFC",
                }}
              />
            </div>
          ) : (
            <button className="btn-ghost" style={{ alignSelf: "flex-start", fontSize: 13 }} onClick={preview} disabled={sending}>
              {sending ? <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> Loading…</> : <><Mail size={13} /> Preview Email</>}
            </button>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #E2E8F0", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={confirm}
            disabled={sending || position.status !== "active"}
          >
            {sending ? "Sending…" : <><Send size={13} /> Confirm & Send</>}
          </button>
        </div>
      </div>
    </div>
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
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(15,33,71,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "min(95vw, 440px)", boxShadow: "0 24px 64px rgba(15,33,71,0.25)" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #E2E8F0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 800, color: "#0F2147" }}>Schedule Interview</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 13, color: "#475569" }}>
            Scheduling interview for <strong style={{ color: "#0F2147" }}>{candidate.name}</strong> — {position.title}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Interview Date & Time</label>
            <input
              type="datetime-local"
              className="input"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
          <div style={{ padding: "10px 12px", background: "#F8FAFF", border: "1px solid rgba(14,165,233,0.2)", borderRadius: 8, fontSize: 12, color: "#0284C7" }}>
            Duration: {position.interviewDuration ?? 30} minutes · AI Voice Interview
          </div>
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid #E2E8F0", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={confirm} disabled={saving || !scheduledAt}>
            {saving ? "Saving…" : <><Calendar size={13} /> Confirm Schedule</>}
          </button>
        </div>
      </div>
    </div>
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
        <button
          className="btn-primary"
          style={{ fontSize: 11, padding: "5px 12px" }}
          onClick={() => setShowInvite(true)}
        >
          <Send size={11} /> Send Invite
        </button>
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
          <div style={{ fontSize: 11, color: "#64748B" }}>
            Invite sent {candidate.invitedAt ? new Date(candidate.invitedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""}
          </div>
          {overdue && (
            <div style={{ fontSize: 10, color: "#DC2626", display: "flex", alignItems: "center", gap: 4 }}>
              <AlertCircle size={10} /> Follow up needed ({days}d)
            </div>
          )}
          {warn && (
            <div style={{ fontSize: 10, color: "#D97706", display: "flex", alignItems: "center", gap: 4 }}>
              <AlertTriangle size={10} /> No response in {days}d
            </div>
          )}
          <div style={{ display: "flex", gap: 6 }}>
            {candidate.schedulingLink && (
              <a href={candidate.schedulingLink} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: "#0284C7", display: "flex", alignItems: "center", gap: 3, textDecoration: "none" }}>
                <ExternalLink size={9} /> Scheduling link
              </a>
            )}
            <button
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "#0EA5E9", display: "flex", alignItems: "center", gap: 3, fontFamily: "var(--font-sans)", padding: 0 }}
              onClick={() => setShowSchedule(true)}
            >
              <Calendar size={9} /> Book slot
            </button>
            <button
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "#94A3B8", display: "flex", alignItems: "center", gap: 3, fontFamily: "var(--font-sans)", padding: 0 }}
              onClick={() => setShowInvite(true)}
            >
              <RefreshCw size={9} /> Resend
            </button>
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
          <div style={{ padding: "6px 10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, fontSize: 11, color: "#DC2626", display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
            <AlertCircle size={11} /> Starting soon — candidate not joined
            <button
              style={{ marginLeft: "auto", background: "#EF4444", border: "none", borderRadius: 4, color: "#fff", fontSize: 10, padding: "2px 8px", cursor: "pointer", fontFamily: "var(--font-sans)", fontWeight: 600 }}
              onClick={() => toast("Escalation sent")}
            >
              Escalate
            </button>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#0F2147", fontFamily: "var(--font-mono)" }}>{dateStr} · {timeStr}</div>
          <div style={{ display: "flex", gap: 8, fontSize: 10 }}>
            <span style={{ color: "#10B981", display: "flex", alignItems: "center", gap: 3 }}><CheckCircle2 size={9} /> Scheduled</span>
            <button
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "#0EA5E9", display: "flex", alignItems: "center", gap: 3, fontFamily: "var(--font-sans)", padding: 0 }}
              onClick={() => { updateCandidate(candidate.id, { remindersSent: (candidate.remindersSent ?? 0) + 1 }); toast.success("Reminder sent"); }}
            >
              <Mail size={9} /> Send Reminder {candidate.remindersSent ? `(${candidate.remindersSent})` : ""}
            </button>
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
      <button className="btn-ghost" style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => toast(`Report for ${candidate.name}`)}>
        View Report
      </button>
    );
  }

  // ── State: NO SHOW ──
  if (candidate.status === "no_show") {
    return (
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn-ghost" style={{ fontSize: 11, padding: "5px 8px" }} onClick={() => setShowSchedule(true)}>
          <Calendar size={11} /> Reschedule
        </button>
        {showSchedule && <ScheduleModal candidate={candidate} position={position} onClose={() => setShowSchedule(false)} />}
      </div>
    );
  }

  return null;
}

function ReadinessIndicator({ label, on }: { label: string; on: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: on ? "#10B981" : "#94A3B8" }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: on ? "#10B981" : "#CBD5E1", boxShadow: on ? "0 0 4px #10B981" : "none" }} />
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
    <button className="btn-primary" style={{ fontSize: 12 }} onClick={sendAll} disabled={loading}>
      {loading ? "Sending…" : <><Send size={12} /> Send {targets.length} Invite{targets.length !== 1 ? "s" : ""}</>}
    </button>
  );
}

// ─── Scheduling overview strip for Interviews page ───────────────────────
export function SchedulingOverview() {
  const { candidates } = useAppStore();
  const [filter, setFilter] = useState<string | null>(null);

  const buckets = [
    { key: "pending",   label: "Pending Invite", color: "#94A3B8" },
    { key: "invited",   label: "Invited",         color: "#F59E0B" },
    { key: "scheduled", label: "Scheduled",        color: "#0EA5E9" },
    { key: "completed", label: "Completed",        color: "#10B981" },
    { key: "no_show",   label: "No Show",          color: "#EF4444" },
  ];

  const counts = buckets.reduce((acc, b) => {
    acc[b.key] = candidates.filter((c) => c.status === b.key).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em" }}>
        Scheduling Overview
      </h2>
      <div style={{ display: "flex", gap: 1, background: "#E2E8F0", borderRadius: 12, overflow: "hidden", border: "1px solid #E2E8F0" }}>
        {buckets.map((b) => (
          <button
            key={b.key}
            onClick={() => setFilter(filter === b.key ? null : b.key)}
            style={{
              flex: 1, padding: "14px 8px", background: filter === b.key ? "#fff" : "#F8FAFC",
              border: "none", cursor: "pointer", textAlign: "center", transition: "background 0.15s",
              fontFamily: "var(--font-sans)",
            }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: filter === b.key ? b.color : "#0F2147", letterSpacing: "-0.02em" }}>
              {counts[b.key]}
            </div>
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3, fontWeight: 500 }}>{b.label}</div>
            <div style={{ height: 3, background: filter === b.key ? b.color : "transparent", marginTop: 8, borderRadius: 2, transition: "background 0.2s" }} />
          </button>
        ))}
      </div>
      {filter && (
        <div style={{ fontSize: 12, color: "#94A3B8", display: "flex", alignItems: "center", gap: 6 }}>
          Filtering by: <strong style={{ color: "#0F2147" }}>{buckets.find((b) => b.key === filter)?.label}</strong>
          <button onClick={() => setFilter(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 0 }}><X size={12} /></button>
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
      <h2 style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 6px #10B981" }} />
        Today ({todayInterviews.length})
      </h2>
      <div style={{ display: "flex", gap: 12 }}>
        {todayInterviews.map((i) => {
          const dt      = new Date(i.scheduledAt);
          const timeStr = dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
          return (
            <div key={i.id} style={{ padding: "12px 16px", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, minWidth: 200 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0F2147" }}>{i.candidateName}</div>
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{i.positionTitle}</div>
              <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "#0EA5E9", marginTop: 6 }}>{timeStr} · {i.duration}m</div>
              <button className="btn-primary" style={{ fontSize: 11, padding: "5px 10px", marginTop: 8 }} onClick={() => toast(`Monitoring ${i.candidateName}`)}>
                Monitor
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
