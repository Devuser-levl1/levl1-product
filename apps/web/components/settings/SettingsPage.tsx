"use client";

import { useState, useEffect } from "react";
import { Settings, Bell, Mic, Users, ChevronRight, Play, Loader2, CreditCard, TrendingUp, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { VOICE_OPTIONS, getVoiceOption } from "@/lib/voiceOptions";
import { restartTour } from "@/components/ui/ProductTour";
import { useAppStore } from "@/store/appStore";

function Section({ icon: Icon, title, description, children }: { icon: React.ElementType; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, paddingBottom: 16, borderBottom: "1px solid #F1F5F9" }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={17} color="#7C3AED" />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#4F46E5", fontFamily: "var(--font-display)" }}>{title}</div>
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
        background: checked ? "#7C3AED" : "#E2E8F0",
        border: "none", cursor: "pointer", transition: "all 0.2s",
        position: "relative", flexShrink: 0,
        boxShadow: checked ? "0 2px 8px rgba(124,58,237,0.30)" : "none",
      }}
    >
      <div style={{
        position: "absolute", top: 3,
        left: checked ? 22 : 3,
        width: 18, height: 18, borderRadius: "50%",
        background: "#fff", transition: "left 0.2s",
        boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
      }} />
    </button>
  );
}

function ToggleRow({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#4F46E5" }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2, fontWeight: 500 }}>{sub}</div>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

const SELECT_STYLE: React.CSSProperties = {
  background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8,
  padding: "10px 14px", fontSize: 14, color: "#4F46E5", fontFamily: "var(--font-sans)",
  cursor: "pointer", outline: "none", width: "100%", fontWeight: 500,
};

export default function SettingsPage() {
  const { agencyPlan, setShowUpgradeWall } = useAppStore();
  const [billingLoading, setBillingLoading] = useState<string | null>(null);

  const [agencyName,    setAgencyName]    = useState("Levl1 Agency");
  const [agencyEmail,   setAgencyEmail]   = useState("abma3005@gmail.com");
  const [agencyWebsite, setAgencyWebsite] = useState("https://levl1.ai");

  const [notifEmail,      setNotifEmail]      = useState(true);
  const [notifSlack,      setNotifSlack]      = useState(false);
  const [notifNoShow,     setNotifNoShow]     = useState(true);
  const [notifCompletion, setNotifCompletion] = useState(true);

  const [defaultDuration, setDefaultDuration] = useState("30");
  const [recordTranscript, setRecordTranscript] = useState(true);
  const [autoScore,         setAutoScore]       = useState(true);

  // Voice & Accent
  const [voiceAccent,    setVoiceAccent]    = useState("american");
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [savingVoice,    setSavingVoice]    = useState(false);

  // Load current agency voice on mount
  useEffect(() => {
    fetch("/api/agency/voice")
      .then((r) => r.json())
      .then((d) => { if (d.voiceAccent) setVoiceAccent(d.voiceAccent); })
      .catch(() => {});
  }, []);

  const previewVoice = async (key: string) => {
    if (previewLoading) return;
    setPreviewLoading(key);
    const option = getVoiceOption(key);
    try {
      const res = await fetch("/api/interview/generate-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `Hi, I am ${option.interviewerName}, your AI interviewer for today. Let us get started.`,
          voiceAccent: key,
        }),
      });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const audio = new Audio(URL.createObjectURL(new Blob([buf], { type: "audio/mpeg" })));
        audio.play();
      } else {
        toast.error("Preview unavailable");
      }
    } catch {
      toast.error("Preview failed");
    } finally {
      setPreviewLoading(null);
    }
  };

  const saveVoiceSettings = async () => {
    setSavingVoice(true);
    try {
      const res = await fetch("/api/agency/voice", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceAccent }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Voice settings saved");
    } catch {
      toast.error("Failed to save voice settings");
    } finally {
      setSavingVoice(false);
    }
  };

  const selectedOption = getVoiceOption(voiceAccent);

  async function handleUpgrade(planId: string) {
    setBillingLoading(planId);
    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Could not create order'); setBillingLoading(null); return; }

      const cf = (window as unknown as Record<string, unknown>).Cashfree;
      if (cf && typeof cf === 'function') {
        const cashfree = (cf as (opts: unknown) => { checkout: (opts: unknown) => void })({
          mode: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
        });
        cashfree.checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: '_modal' });
      } else {
        toast.error('Payment SDK not ready. Please refresh and try again.');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setBillingLoading(null);
    }
  }

  const BILLING_PLANS = [
    {
      id: 'starter', name: 'Starter', price: '₹15,000/mo', interviews: 50,
      features: ['50 interviews/month', '5 active positions', 'AI question generation', 'Evaluation reports'],
      color: '#4F46E5',
    },
    {
      id: 'professional', name: 'Professional', price: '₹45,000/mo', interviews: 200,
      features: ['200 interviews/month', 'Unlimited positions', 'White-label reports', 'Priority support'],
      color: '#7C3AED', popular: true,
    },
  ];

  return (
    <div style={{ padding: "36px 40px", display: "flex", flexDirection: "column", gap: 24, maxWidth: 760 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "#4F46E5", letterSpacing: "-0.025em" }}>
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

      {/* Voice & Accent */}
      <Section icon={Mic} title="Voice &amp; Accent" description="Default AI interviewer voice for all interviews">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {VOICE_OPTIONS.map((v) => (
            <div
              key={v.key}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", borderRadius: 10,
                border: `1.5px solid ${voiceAccent === v.key ? "rgba(124,58,237,0.35)" : "#E2E8F0"}`,
                background: voiceAccent === v.key ? "rgba(124,58,237,0.05)" : "#F8FAFC",
                cursor: "pointer", transition: "all 0.15s",
              }}
              onClick={() => setVoiceAccent(v.key)}
            >
              {/* Radio */}
              <div style={{
                width: 18, height: 18, borderRadius: "50%",
                border: `2px solid ${voiceAccent === v.key ? "#7C3AED" : "#CBD5E1"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "border-color 0.15s",
              }}>
                {voiceAccent === v.key && (
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7C3AED" }} />
                )}
              </div>

              {/* Flag + name */}
              <span style={{ fontSize: 20, flexShrink: 0 }}>{v.flag}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: voiceAccent === v.key ? "#6D28D9" : "#4F46E5" }}>
                  {v.accent}
                </div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>{v.description}</div>
              </div>

              {/* Preview button */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); previewVoice(v.key); }}
                disabled={!!previewLoading}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 12px", borderRadius: 7,
                  border: "1px solid rgba(124,58,237,0.20)",
                  background: "rgba(124,58,237,0.07)", color: "#7C3AED",
                  fontSize: 12, fontWeight: 600, cursor: previewLoading ? "wait" : "pointer",
                  fontFamily: "var(--font-sans)", flexShrink: 0, transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124,58,237,0.14)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(124,58,237,0.07)"; }}
              >
                {previewLoading === v.key
                  ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
                  : <Play size={11} fill="#7C3AED" />
                }
                Preview
              </button>
            </div>
          ))}
        </div>

        {/* Interviewer name display */}
        <div style={{
          marginTop: 4, padding: "12px 16px",
          background: "rgba(124,58,237,0.05)",
          border: "1px solid rgba(124,58,237,0.15)",
          borderRadius: 8, fontSize: 13, color: "#475569",
        }}>
          Your AI interviewer will introduce as:{" "}
          <strong style={{ color: "#7C3AED" }}>{selectedOption.interviewerName}</strong>
        </div>

        <button
          onClick={saveVoiceSettings}
          disabled={savingVoice}
          className="btn-navy"
          style={{ alignSelf: "flex-start", fontSize: 13 }}
        >
          {savingVoice ? "Saving…" : "Save Voice Settings"}
        </button>
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
          { name: "HR Manager",       email: "hr@levl1.ai",   role: "HR"       },
          { name: "Tech Lead",        email: "tech@levl1.ai", role: "Reviewer" },
        ].map((member) => (
          <div key={member.email} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F1F5F9" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(56,189,248,0.08))", border: "1px solid rgba(124,58,237,0.20)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#6D28D9" }}>
                {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#4F46E5" }}>{member.name}</div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>{member.email}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="badge badge-muted">{member.role}</span>
              <button style={{ background: "none", border: "none", cursor: "pointer", color: "#CBD5E1", padding: 4 }} onClick={() => toast(`Manage ${member.name}`)}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ))}
        <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => toast("Invite team member — coming soon")}>
          + Invite Team Member
        </button>
      </Section>

      {/* Billing */}
      <Section icon={CreditCard} title="Billing & Plan" description="Manage your subscription and usage">
        {/* Current plan card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(79,70,229,0.04) 0%, rgba(124,58,237,0.06) 100%)',
          border: '1px solid rgba(79,70,229,0.15)',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>Current Plan</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#4F46E5', fontFamily: 'var(--font-display)', textTransform: 'capitalize' }}>
              {agencyPlan?.plan ?? 'Trial'}
            </div>
            {agencyPlan?.plan === 'trial' && (
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
                {agencyPlan.interviewsUsed} / {agencyPlan.interviewsLimit} interviews used · {agencyPlan.trialDaysLeft} days remaining
              </div>
            )}
          </div>
          {/* Usage bar */}
          {agencyPlan && (
            <div style={{ flex: 1, minWidth: 120, maxWidth: 200 }}>
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 6, fontWeight: 500 }}>
                Usage: {agencyPlan.interviewsUsed} / {agencyPlan.interviewsLimit}
              </div>
              <div style={{ height: 6, borderRadius: 4, background: '#E2E8F0', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min((agencyPlan.interviewsUsed / agencyPlan.interviewsLimit) * 100, 100)}%`,
                  background: agencyPlan.interviewsUsed >= agencyPlan.interviewsLimit ? '#EF4444' : '#4F46E5',
                  borderRadius: 4,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          )}
          {agencyPlan?.plan === 'trial' && (
            <button
              onClick={() => setShowUpgradeWall(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: '#4F46E5', color: '#fff', border: 'none',
                borderRadius: 9, padding: '10px 18px', fontSize: 13,
                fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)',
                boxShadow: '0 4px 14px rgba(79,70,229,0.25)',
              }}
            >
              <TrendingUp size={14} />
              Upgrade Now
            </button>
          )}
        </div>

        {/* Plan comparison (only show when on trial or starter) */}
        {agencyPlan && ['trial', 'starter'].includes(agencyPlan.plan) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="billing-plan-grid">
            {BILLING_PLANS.filter((p) => agencyPlan.plan === 'trial' || p.id === 'professional').map((plan) => (
              <div
                key={plan.id}
                style={{
                  border: plan.popular ? '1.5px solid #7C3AED' : '1px solid #E2E8F0',
                  borderRadius: 12, padding: '18px 16px',
                  position: 'relative',
                  background: plan.popular ? 'rgba(124,58,237,0.02)' : '#fff',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 800, color: plan.color, fontFamily: 'var(--font-display)', marginBottom: 2 }}>{plan.name}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#1E293B', marginBottom: 10 }}>{plan.price}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                  {plan.features.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <CheckCircle2 size={13} color={plan.color} style={{ marginTop: 1, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={billingLoading === plan.id}
                  style={{
                    width: '100%',
                    background: billingLoading === plan.id ? '#94A3B8' : plan.color,
                    color: '#fff', border: 'none', borderRadius: 8,
                    padding: '9px 14px', fontSize: 13, fontWeight: 700,
                    cursor: billingLoading === plan.id ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {billingLoading === plan.id ? 'Processing…' : `Upgrade to ${plan.name}`}
                </button>
              </div>
            ))}
          </div>
        )}

        <p style={{ fontSize: 11, color: '#94A3B8' }}>
          Secure payments via Cashfree · GST applicable · Cancel anytime
        </p>
      </Section>

      {/* Save */}
      <div style={{ display: "flex", gap: 12, paddingBottom: 40 }}>
        <button className="btn-navy" onClick={() => toast.success("Settings saved successfully")}>
          Save Changes
        </button>
        <button className="btn-ghost" onClick={() => toast("Changes discarded")}>
          Discard
        </button>
        <button
          className="btn-ghost"
          onClick={restartTour}
          style={{ marginLeft: "auto", fontSize: 13, color: "#94A3B8" }}
        >
          Restart product tour
        </button>
      </div>
    </div>
  );
}
