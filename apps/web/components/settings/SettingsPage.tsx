"use client";

import { useState } from "react";
import { Settings, Bell, Mic, Users, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

function Section({ icon: Icon, title, description, children }: { icon: React.ElementType; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, paddingBottom: 16, borderBottom: "1px solid #F1F5F9" }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={17} color="#0EA5E9" />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0F2147", fontFamily: "var(--font-display)" }}>{title}</div>
          <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 3, fontWeight: 500 }}>{description}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{label}</label>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 100,
        background: checked ? "#0EA5E9" : "#E2E8F0",
        border: "none",
        cursor: "pointer",
        transition: "all 0.2s",
        position: "relative",
        flexShrink: 0,
        boxShadow: checked ? "0 2px 8px rgba(14,165,233,0.30)" : "none",
      }}
    >
      <div
        style={{
          position: "absolute", top: 3,
          left: checked ? 22 : 3,
          width: 18, height: 18,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.2s",
          boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
        }}
      />
    </button>
  );
}

function ToggleRow({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#0F2147" }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2, fontWeight: 500 }}>{sub}</div>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

const SELECT_STYLE: React.CSSProperties = {
  background: "#F8FAFC",
  border: "1px solid #E2E8F0",
  borderRadius: 8,
  padding: "10px 14px",
  fontSize: 14,
  color: "#0F2147",
  fontFamily: "var(--font-sans)",
  cursor: "pointer",
  outline: "none",
  width: "100%",
  fontWeight: 500,
};

export default function SettingsPage() {
  const [agencyName,    setAgencyName]    = useState("InterviewCentral Agency");
  const [agencyEmail,   setAgencyEmail]   = useState("abma3005@gmail.com");
  const [agencyWebsite, setAgencyWebsite] = useState("https://interviewcentral.ai");

  const [notifEmail,      setNotifEmail]      = useState(true);
  const [notifSlack,      setNotifSlack]      = useState(false);
  const [notifNoShow,     setNotifNoShow]     = useState(true);
  const [notifCompletion, setNotifCompletion] = useState(true);

  const [defaultDuration, setDefaultDuration] = useState("30");
  const [defaultLanguage, setDefaultLanguage] = useState("en");
  const [recordTranscript, setRecordTranscript] = useState(true);
  const [autoScore,         setAutoScore]       = useState(true);

  return (
    <div style={{ padding: "36px 40px", display: "flex", flexDirection: "column", gap: 24, maxWidth: 760 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "#0F2147", letterSpacing: "-0.025em" }}>
          Settings
        </h1>
        <p style={{ fontSize: 14, color: "#94A3B8", marginTop: 6, fontWeight: 500 }}>
          Configure your agency profile, notifications, and interview defaults.
        </p>
      </div>

      {/* Agency Profile */}
      <Section icon={Settings} title="Agency Profile" description="Your agency's public identity on the platform">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Agency Name">
            <input className="input" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} />
          </Field>
          <Field label="Contact Email">
            <input className="input" type="email" value={agencyEmail} onChange={(e) => setAgencyEmail(e.target.value)} />
          </Field>
        </div>
        <Field label="Website">
          <input className="input" value={agencyWebsite} onChange={(e) => setAgencyWebsite(e.target.value)} />
        </Field>
      </Section>

      {/* Notifications */}
      <Section icon={Bell} title="Notifications" description="Choose when and how you get notified">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ToggleRow label="Email notifications"  sub="Receive updates via email"                              checked={notifEmail}      onChange={setNotifEmail}      />
          <div style={{ height: 1, background: "#F1F5F9" }} />
          <ToggleRow label="Slack integration"    sub="Post alerts to a Slack channel"                        checked={notifSlack}      onChange={setNotifSlack}      />
          <div style={{ height: 1, background: "#F1F5F9" }} />
          <ToggleRow label="No-show alerts"       sub="Get notified when a candidate misses their slot"       checked={notifNoShow}     onChange={setNotifNoShow}     />
          <div style={{ height: 1, background: "#F1F5F9" }} />
          <ToggleRow label="Completion reports"   sub="Receive a summary after each interview completes"      checked={notifCompletion} onChange={setNotifCompletion} />
        </div>
      </Section>

      {/* Interview Defaults */}
      <Section icon={Mic} title="Interview Defaults" description="Default settings applied to new interview sessions">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Default Duration (minutes)">
            <select value={defaultDuration} onChange={(e) => setDefaultDuration(e.target.value)} style={SELECT_STYLE}>
              <option value="20">20 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
            </select>
          </Field>
          <Field label="Language">
            <select value={defaultLanguage} onChange={(e) => setDefaultLanguage(e.target.value)} style={SELECT_STYLE}>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="en-in">English (India)</option>
            </select>
          </Field>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ToggleRow label="Auto-generate transcript"   sub="Save a full text transcript of each interview"             checked={recordTranscript} onChange={setRecordTranscript} />
          <div style={{ height: 1, background: "#F1F5F9" }} />
          <ToggleRow label="Auto-score on completion"   sub="AI evaluates and scores each candidate automatically"      checked={autoScore}        onChange={setAutoScore}        />
        </div>
      </Section>

      {/* Team Members */}
      <Section icon={Users} title="Team Members" description="Manage who has access to this dashboard">
        {[
          { name: "Abhijit Majumdar", email: "abma3005@gmail.com",       role: "Owner"    },
          { name: "HR Manager",       email: "hr@interviewcentral.ai",   role: "HR"       },
          { name: "Tech Lead",        email: "tech@interviewcentral.ai", role: "Reviewer" },
        ].map((member) => (
          <div
            key={member.email}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 0",
              borderBottom: "1px solid #F1F5F9",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "linear-gradient(135deg, rgba(14,165,233,0.12), rgba(56,189,248,0.08))",
                  border: "1px solid rgba(14,165,233,0.20)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, color: "#0284C7",
                }}
              >
                {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0F2147" }}>{member.name}</div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>{member.email}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="badge badge-muted">{member.role}</span>
              <button
                style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E1", padding: 4 }}
                onClick={() => toast(`Manage ${member.name}`)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ))}
        <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => toast("Invite team member — coming soon")}>
          + Invite Team Member
        </button>
      </Section>

      {/* Save */}
      <div style={{ display: "flex", gap: 12, paddingBottom: 40 }}>
        <button className="btn-navy" onClick={() => toast.success("Settings saved successfully")}>
          Save Changes
        </button>
        <button className="btn-ghost" onClick={() => toast("Changes discarded")}>
          Discard
        </button>
      </div>
    </div>
  );
}
