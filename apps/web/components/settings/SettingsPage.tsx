"use client";

import { useState, useEffect, useCallback } from "react";
import { Settings, Bell, Mic, Users, Play, Loader2, CreditCard, TrendingUp, CheckCircle2, Trash2, RefreshCw, Plus } from "lucide-react";
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

interface TeamMemberRecord { id: string; name: string; email: string; role: string; status: string; inviteToken?: string | null }
interface UserRecord { id: string; name: string; email: string; role: string; lastLoginAt?: string | null }

export default function SettingsPage() {
  const { agencyPlan, setShowUpgradeWall, setAgencyPlan } = useAppStore();
  const [billingLoading, setBillingLoading] = useState<string | null>(null);

  // Team members state
  const [teamMembers,   setTeamMembers]   = useState<TeamMemberRecord[]>([]);
  const [teamUsers,     setTeamUsers]     = useState<UserRecord[]>([]);
  const [teamLoading,   setTeamLoading]   = useState(true);
  const [inviteEmail,   setInviteEmail]   = useState('');
  const [inviteRole,    setInviteRole]    = useState<'recruiter' | 'admin' | 'viewer'>('recruiter');
  const [invitingNew,   setInvitingNew]   = useState(false);
  const [showInviteRow, setShowInviteRow] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const loadTeam = useCallback(async () => {
    setTeamLoading(true);
    try {
      const res = await fetch('/api/agency/team');
      const d = await res.json();
      if (d.members) setTeamMembers(d.members);
      if (d.users)   setTeamUsers(d.users);
    } catch { /* ignore */ }
    finally { setTeamLoading(false); }
  }, []);

  useEffect(() => { loadTeam(); }, [loadTeam]);

  const [agencyName,    setAgencyName]    = useState("Levl1 Agency");
  const [agencyEmail,   setAgencyEmail]   = useState("abma3005@gmail.com");
  const [agencyWebsite, setAgencyWebsite] = useState("https://levl1.ai");
  const [senderName,    setSenderName]    = useState('');
  const [senderEmail,   setSenderEmail]   = useState('');
  const [logoUrl,        setLogoUrl]        = useState('');
  const [brandColor,     setBrandColor]     = useState('#4F46E5');
  const [uploadingLogo,  setUploadingLogo]  = useState(false);
  const [domainVerified, setDomainVerified] = useState(false);
  const [domainRecords,  setDomainRecords]  = useState<{ type: string; name: string; value: string }[]>([]);
  const [domainBusy,     setDomainBusy]     = useState<'verify' | 'check' | null>(null);
  const [domainMsg,      setDomainMsg]      = useState('');

  const [notifEmail,      setNotifEmail]      = useState(true);
  const [notifSlack,      setNotifSlack]      = useState(false);
  const [notifNoShow,     setNotifNoShow]     = useState(true);
  const [notifCompletion, setNotifCompletion] = useState(true);

  const [recordTranscript, setRecordTranscript] = useState(true);
  const [autoScore,         setAutoScore]       = useState(true);

  // Voice & Accent
  const [voiceAccent,    setVoiceAccent]    = useState("american");
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [savingVoice,    setSavingVoice]    = useState(false);

  // Load agency settings on mount
  useEffect(() => {
    fetch("/api/agency/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return
        if (data.name)        setAgencyName(data.name)
        if (data.website)     setAgencyWebsite(data.website)
        if (data.senderName)  setSenderName(data.senderName)
        if (data.senderEmail) setSenderEmail(data.senderEmail)
        if (data.resendDomainVerified) setDomainVerified(true)
        if (data.logoUrl)    setLogoUrl(data.logoUrl)
        if (data.brandColor) setBrandColor(data.brandColor)
      })
      .catch(() => {});
  }, []);

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

  async function uploadLogo(file: File) {
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await fetch('/api/agency/upload-logo', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Upload failed'); return; }
      setLogoUrl(data.logoUrl);
      toast.success('Logo uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploadingLogo(false);
    }
  }

  async function saveBrandColor(color: string) {
    setBrandColor(color);
    try {
      await fetch('/api/agency/settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandColor: color }),
      });
    } catch { /* non-critical */ }
  }

  async function verifyDomain() {
    if (!senderEmail.includes('@') || !senderName) {
      toast.error('Enter a sender name and email first');
      return;
    }
    setDomainBusy('verify'); setDomainMsg('');
    try {
      const res = await fetch('/api/agency/email/verify-domain', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderEmail, senderName }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Could not start verification'); return; }
      setDomainRecords(Array.isArray(data.records) ? data.records : []);
      setDomainMsg('Add the DNS records below in your domain provider, then click “Check Verification”.');
    } catch {
      toast.error('Verification request failed');
    } finally {
      setDomainBusy(null);
    }
  }

  async function checkDomain() {
    setDomainBusy('check'); setDomainMsg('');
    try {
      const data = await fetch('/api/agency/email/check-verification').then((r) => r.json());
      if (data.verified) {
        setDomainVerified(true);
        setDomainRecords([]);
        toast.success('Domain verified! Emails will now send from your address.');
      } else {
        if (Array.isArray(data.records) && data.records.length) setDomainRecords(data.records);
        setDomainMsg(`Not verified yet (status: ${data.status ?? 'pending'}). DNS can take up to a few hours to propagate.`);
      }
    } catch {
      toast.error('Could not check verification');
    } finally {
      setDomainBusy(null);
    }
  }

  async function handleSaveSettings() {
    try {
      const res = await fetch('/api/agency/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: agencyName, website: agencyWebsite, senderName, senderEmail }),
      })
      if (res.ok) {
        toast.success('Settings saved')
      } else {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to save settings')
      }
    } catch {
      toast.error('Network error — could not save settings')
    }
  }

  // Re-fetch the agency plan from the DB and update the global store so the
  // trial banner / usage bar reflect the new plan immediately after upgrade.
  const refreshAgencyPlan = useCallback(async () => {
    try {
      const data = await fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null));
      const agency = data?.agency;
      if (agency) {
        setAgencyPlan({
          agencyId: agency.id,
          agencyName: agency.name,
          plan: agency.plan,
          interviewsUsed: agency.interviewsUsed,
          interviewsLimit: agency.interviewsLimit,
          trialExpiresAt: agency.trialExpiresAt,
          trialDaysLeft: agency.trialDaysLeft ?? 0,
          subscriptionStatus: agency.subscriptionStatus,
        });
      }
    } catch { /* non-critical */ }
  }, [setAgencyPlan]);

  // Verify a completed payment and refresh the plan.
  const verifyPayment = useCallback(async (orderId: string, planId: string | null) => {
    try {
      const data = await fetch(
        `/api/payments/verify/${orderId}${planId ? `?plan=${planId}` : ''}`,
      ).then((r) => r.json());
      if (data.success) {
        toast.success(`Successfully upgraded to ${planId ?? 'your new'} plan!`);
        await refreshAgencyPlan();
      } else {
        toast.error('Payment not confirmed yet. If you were charged, contact hello@levl1.io');
      }
    } catch {
      toast.error('Could not verify payment. Contact hello@levl1.io if you were charged.');
    }
  }, [refreshAgencyPlan]);

  // On return from Cashfree hosted checkout: /settings?order_id=...&plan=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    const planId = params.get('plan');
    if (orderId) {
      verifyPayment(orderId, planId);
      // Strip the payment params from the URL so a refresh doesn't re-verify.
      params.delete('order_id');
      params.delete('plan');
      const clean = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
      window.history.replaceState({}, '', clean);
    }
  }, [verifyPayment]);

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
        const cashfree = (cf as (opts: unknown) => { checkout: (opts: unknown) => Promise<{ error?: unknown }> })({
          mode: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
        });
        // _modal keeps the user on this page; the returned promise resolves
        // when the modal closes, after which we verify server-side.
        const result = await cashfree.checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: '_modal' });
        if (result?.error) {
          toast.error('Payment was cancelled or failed.');
        } else if (data.orderId) {
          await verifyPayment(data.orderId, planId);
        }
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Sender Name (for emails)">
            <input className="input" placeholder="e.g. Talent Team" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
          </Field>
          <Field label="Sender Email (for emails)">
            <input className="input" type="email" placeholder="e.g. talent@yourcompany.com" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} />
          </Field>
        </div>
        <button
          onClick={async () => {
            setSavingProfile(true);
            await handleSaveSettings();
            setSavingProfile(false);
          }}
          disabled={savingProfile}
          className="btn-navy"
          style={{ alignSelf: "flex-start", fontSize: 13 }}
        >
          {savingProfile ? "Saving…" : "Save Profile"}
        </button>
      </Section>

      {/* Email Configuration */}
      <Section icon={Bell} title="Email Configuration" description="Send interview emails from your own verified domain">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700,
            padding: "4px 10px", borderRadius: 100,
            background: domainVerified ? "rgba(16,185,129,0.10)" : "rgba(148,163,184,0.12)",
            color: domainVerified ? "#059669" : "#64748B",
          }}>
            {domainVerified ? <CheckCircle2 size={13} /> : null}
            {domainVerified ? `Verified — sending from ${senderEmail}` : "Not verified"}
          </span>
        </div>
        {!domainVerified && (
          <div style={{ fontSize: 12, color: "#94A3B8" }}>
            Emails currently send from <strong>noreply@mail.levl1.io</strong>. Verify your domain to send from {senderEmail || "your address"}.
          </div>
        )}

        {!domainVerified && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={verifyDomain} disabled={domainBusy === 'verify'} className="btn-navy" style={{ fontSize: 13 }}>
              {domainBusy === 'verify' ? "Starting…" : "Verify My Domain →"}
            </button>
            {domainRecords.length > 0 && (
              <button onClick={checkDomain} disabled={domainBusy === 'check'} className="btn-ghost" style={{ fontSize: 13 }}>
                {domainBusy === 'check' ? "Checking…" : "I've added the records — Check Verification"}
              </button>
            )}
          </div>
        )}

        {domainMsg && <div style={{ fontSize: 12, color: "#475569" }}>{domainMsg}</div>}

        {domainRecords.length > 0 && (
          <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#F8FAFC" }}>
                  {["Type", "Hostname", "Value"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#64748B", fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {domainRecords.map((r, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #F1F5F9" }}>
                    <td style={{ padding: "8px 12px", color: "#334155", fontWeight: 600 }}>{r.type}</td>
                    <td style={{ padding: "8px 12px", color: "#475569", fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>{r.name}</td>
                    <td style={{ padding: "8px 12px", color: "#475569", fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Branding (white-label reports & candidate portal) */}
      <Section icon={CheckCircle2} title="Branding" description="Your logo and colour appear on reports and the candidate portal">
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ width: 80, height: 80, borderRadius: 12, border: "1px solid #E2E8F0", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={logoUrl} alt="Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              : <span style={{ fontSize: 11, color: "#94A3B8" }}>No logo</span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="btn-ghost" style={{ fontSize: 13, cursor: "pointer", display: "inline-block" }}>
              {uploadingLogo ? "Uploading…" : "Upload Logo"}
              <input
                type="file" accept="image/*" hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }}
              />
            </label>
            <span style={{ fontSize: 11, color: "#94A3B8" }}>PNG/SVG, under 512KB. Shown on candidate reports.</span>
          </div>
        </div>
        <Field label="Brand Colour">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input type="color" value={brandColor} onChange={(e) => saveBrandColor(e.target.value)} style={{ width: 44, height: 36, border: "1px solid #E2E8F0", borderRadius: 8, cursor: "pointer", background: "none" }} />
            <span style={{ fontSize: 13, color: "#475569", fontFamily: "var(--font-mono)" }}>{brandColor}</span>
          </div>
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
          <Field label="Interview Duration">
            {/* Build 06: production interviews are fixed at 30 minutes — no
                selectable options, to reduce config surface. */}
            <div style={{ ...SELECT_STYLE, display: 'flex', alignItems: 'center', color: '#475569', background: '#F8FAFC', cursor: 'default' }}>
              30 minutes <span style={{ marginLeft: 8, fontSize: 11, color: '#94A3B8' }}>· fixed</span>
            </div>
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
        {teamLoading ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <Loader2 size={20} color="#7C3AED" style={{ animation: "spin 1s linear infinite", margin: "0 auto" }} />
          </div>
        ) : (
          <>
            {/* Active users */}
            {teamUsers.map((u) => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F1F5F9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(56,189,248,0.08))", border: "1px solid rgba(124,58,237,0.20)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#6D28D9" }}>
                    {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#4F46E5" }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>{u.email}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="badge badge-success" style={{ textTransform: "capitalize" }}>{u.role}</span>
                  <span style={{ fontSize: 10, color: "#94A3B8" }}>Active</span>
                </div>
              </div>
            ))}

            {/* Invited (pending) members */}
            {teamMembers.filter(m => m.status === 'invited').map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F1F5F9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#F1F5F9", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#94A3B8" }}>
                    {m.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#64748B" }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1 }}>{m.email}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="badge badge-warning">Invited</span>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/agency/team', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId: m.id }) });
                        if (res.ok) { toast.success('Invite resent'); }
                        else { const d = await res.json(); toast.error(d.error ?? 'Failed'); }
                      } catch { toast.error('Failed to resend'); }
                    }}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, border: "1px solid #E2E8F0", background: "#F8FAFC", color: "#64748B", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "var(--font-sans)" }}
                  >
                    <RefreshCw size={10} /> Resend
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/agency/team', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId: m.id }) });
                        if (res.ok) { toast.success('Member removed'); loadTeam(); }
                        else { const d = await res.json(); toast.error(d.error ?? 'Failed'); }
                      } catch { toast.error('Failed to remove'); }
                    }}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.04)", color: "#EF4444", cursor: "pointer", fontSize: 11, fontFamily: "var(--font-sans)" }}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            ))}

            {/* Invite new row */}
            {showInviteRow && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 0" }}>
                <input
                  className="input" type="email" placeholder="colleague@company.com"
                  value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  style={{ flex: 2 }}
                />
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value as 'recruiter' | 'admin' | 'viewer')}
                  style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, fontFamily: "var(--font-sans)", background: "#F8FAFC", cursor: "pointer" }}>
                  <option value="recruiter">Recruiter</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  disabled={invitingNew || !inviteEmail.trim()}
                  onClick={async () => {
                    if (!inviteEmail.trim()) return;
                    setInvitingNew(true);
                    try {
                      const res = await fetch('/api/agency/invite-team', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ members: [{ name: inviteEmail.split('@')[0], email: inviteEmail, role: inviteRole }] }),
                      });
                      if (res.ok) { toast.success('Invite sent!'); setInviteEmail(''); setShowInviteRow(false); loadTeam(); }
                      else { const d = await res.json(); toast.error(d.error ?? 'Failed'); }
                    } catch { toast.error('Failed to send invite'); }
                    finally { setInvitingNew(false); }
                  }}
                  className="btn-primary"
                  style={{ fontSize: 13, whiteSpace: "nowrap" }}
                >
                  {invitingNew ? "Sending…" : "Send Invite"}
                </button>
                <button onClick={() => setShowInviteRow(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 4 }}>✕</button>
              </div>
            )}

            <button className="btn-ghost" style={{ fontSize: 13, alignSelf: "flex-start" }} onClick={() => setShowInviteRow(true)}>
              <Plus size={13} /> Invite Team Member
            </button>
          </>
        )}
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
        <button className="btn-navy" onClick={handleSaveSettings}>
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
