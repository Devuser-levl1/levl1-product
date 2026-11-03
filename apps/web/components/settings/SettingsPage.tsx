"use client";

import { useState, useEffect, useCallback, isValidElement } from "react";
import { Settings, Bell, Mic, Users, Play, Loader2, CreditCard, TrendingUp, CheckCircle2, Trash2, RefreshCw, Plus, Mail } from "lucide-react";
import { InviteTemplateEditor } from "@/components/interviews/InviteTemplateEditor";
import { ACCOUNT_TYPES, isAccountType, type AccountType } from "@/lib/screen/account-type";
import toast from "react-hot-toast";
import { VOICE_OPTIONS, getVoiceOption } from "@/lib/voiceOptions";
import { restartTour } from "@/components/ui/ProductTour";
import { useAppStore } from "@/store/appStore";
import { Field as FormField, PageHeader, Alert } from "@/components/screen/ui";

// Design-System Pass 3 (group 6): local helpers render the canonical Screen
// components; settings state, saves and team/billing calls are unchanged.
function Section({ icon: Icon, title, description, children }: { icon: React.ElementType; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="lv-card lv-card--pad" aria-label={title} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, paddingBottom: 16, borderBottom: "1px solid var(--lv-border)" }}>
        <div aria-hidden="true" style={{ width: 38, height: 38, borderRadius: 10, background: "var(--lv-brand-soft)", border: "1px solid var(--lv-brand-soft-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={17} color="var(--lv-brand)" />
        </div>
        <div>
          <h2 className="lv-card__title">{title}</h2>
          <div style={{ fontSize: 13, color: "var(--lv-text-muted)", marginTop: 3 }}>{description}</div>
        </div>
      </div>
      {children}
    </section>
  );
}

/** Single control → canonical Field (label wired to the control); several children → labelled group. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  if (isValidElement(children)) return <FormField label={label}>{children}</FormField>;
  return (
    <div role="group" aria-label={label} className="lv-field">
      <span className="lv-label">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="lv-switch" onClick={() => onChange(!checked)} />;
}

function ToggleRow({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--lv-text)" }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: "var(--lv-text-muted)", marginTop: 2 }}>{sub}</div>}
      </div>
      <Toggle label={label} checked={checked} onChange={onChange} />
    </div>
  );
}

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
  const [accountType,    setAccountType]    = useState<AccountType | null>(null);
  // Pass 5: surface a failed profile load — otherwise the form shows defaults
  // and "Save Profile" would overwrite the real values with them.
  const [settingsLoadFailed, setSettingsLoadFailed] = useState(false);

  // Load agency settings on mount
  useEffect(() => {
    fetch("/api/agency/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) { setSettingsLoadFailed(true); return }
        if (data.name)        setAgencyName(data.name)
        if (data.website)     setAgencyWebsite(data.website)
        if (data.senderName)  setSenderName(data.senderName)
        if (data.senderEmail) setSenderEmail(data.senderEmail)
        if (data.resendDomainVerified) setDomainVerified(true)
        if (data.logoUrl)    setLogoUrl(data.logoUrl)
        if (data.brandColor) setBrandColor(data.brandColor)
        if (isAccountType(data.accountType)) setAccountType(data.accountType)
      })
      .catch(() => setSettingsLoadFailed(true));
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

  // Account type saves on change (not via "Save Profile") and updates the shared
  // store, so the Clients tab / job form switch without a refresh.
  const setAccount = useAppStore((s) => s.setAccount);
  const [savingType, setSavingType] = useState(false);
  async function saveAccountType(next: AccountType) {
    const prev = accountType
    setAccountType(next); setSavingType(true)
    try {
      const res = await fetch('/api/agency/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountType: next }) })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Could not save')
      setAccount({ type: next, orgName: agencyName })
      toast.success(next === 'company' ? 'Switched to in-house — Clients tab and client fields hidden' : 'Switched to agency — Clients tab and client fields restored')
    } catch (e) {
      setAccountType(prev)
      toast.error(e instanceof Error ? e.message : 'Could not save account type')
    } finally { setSavingType(false) }
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
      features: ['50 interviews/month', '5 active positions', 'AI question generation', 'Candidate reports'],
      color: 'var(--lv-brand)',
    },
    {
      id: 'professional', name: 'Professional', price: '₹45,000/mo', interviews: 200,
      features: ['200 interviews/month', 'Unlimited positions', 'White-label reports', 'Priority support'],
      color: 'var(--lv-accent)', popular: true,
    },
  ];

  return (
    <div className="lv-page" style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 760, margin: 0 }}>

      {/* Header */}
      <PageHeader title="Settings" description="Configure your agency profile, notifications, and interview defaults." />
      {settingsLoadFailed && (
        <Alert tone="warning" title="Couldn't load your saved settings"
          action={<button type="button" className="lv-btn lv-btn--secondary lv-btn--sm" onClick={() => window.location.reload()}>Reload</button>}>
          The fields below may show defaults. Reload before saving so you don&apos;t overwrite your profile.
        </Alert>
      )}

      {/* Agency Profile */}
      <Section icon={Settings} title="Agency Profile" description="Your agency's public identity on the platform">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))", gap: 16 }}>
          <Field label="Agency Name">
            <input className="lv-input" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} />
          </Field>
          <Field label="Contact Email">
            <input className="lv-input" type="email" value={agencyEmail} onChange={(e) => setAgencyEmail(e.target.value)} />
          </Field>
        </div>
        <Field label="Website">
          <input className="lv-input" value={agencyWebsite} onChange={(e) => setAgencyWebsite(e.target.value)} />
        </Field>
        <Field label="Account type">
          <select className="lv-select" aria-label="Account type" value={accountType ?? ""} disabled={savingType} onChange={(e) => { if (isAccountType(e.target.value)) void saveAccountType(e.target.value) }}>
            {accountType === null && <option value="">Not set — position setup asks for client details</option>}
            {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label} — {t.desc.toLowerCase()}</option>)}
          </select>
          <div style={{ fontSize: 11.5, color: "var(--lv-text-muted)", marginTop: 5 }}>
            Saves immediately. In-house accounts don&apos;t see the Clients tab or client fields; existing client records are kept and come back if you switch to agency.
          </div>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))", gap: 16 }}>
          <Field label="Sender Name (for emails)">
            <input className="lv-input" placeholder="e.g. Talent Team" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
          </Field>
          <Field label="Sender Email (for emails)">
            <input className="lv-input" type="email" placeholder="e.g. talent@yourcompany.com" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} />
          </Field>
        </div>
        <button
          onClick={async () => {
            setSavingProfile(true);
            await handleSaveSettings();
            setSavingProfile(false);
          }}
          disabled={savingProfile}
          className="lv-btn lv-btn--primary"
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
            background: domainVerified ? "color-mix(in srgb, var(--lv-success) 10%, transparent)" : "var(--lv-surface-muted)",
            color: domainVerified ? "var(--lv-success)" : "var(--lv-text-muted)",
          }}>
            {domainVerified ? <CheckCircle2 size={13} /> : null}
            {domainVerified ? `Verified — sending from ${senderEmail}` : "Not verified"}
          </span>
        </div>
        {!domainVerified && (
          <div style={{ fontSize: 12, color: "var(--lv-text-muted)" }}>
            Emails currently send from <strong>noreply@mail.levl1.io</strong>. Verify your domain to send from {senderEmail || "your address"}.
          </div>
        )}

        {!domainVerified && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={verifyDomain} disabled={domainBusy === 'verify'} className="lv-btn lv-btn--primary" style={{ fontSize: 13 }}>
              {domainBusy === 'verify' ? "Starting…" : "Verify My Domain →"}
            </button>
            {domainRecords.length > 0 && (
              <button onClick={checkDomain} disabled={domainBusy === 'check'} className="lv-btn lv-btn--secondary" style={{ fontSize: 13 }}>
                {domainBusy === 'check' ? "Checking…" : "I've added the records — Check Verification"}
              </button>
            )}
          </div>
        )}

        {domainMsg && <div style={{ fontSize: 12, color: "var(--lv-text-body)" }}>{domainMsg}</div>}

        {domainRecords.length > 0 && (
          <div style={{ border: "1px solid var(--lv-border)", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--lv-surface-sunken)" }}>
                  {["Type", "Hostname", "Value"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "var(--lv-text-muted)", fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {domainRecords.map((r, i) => (
                  <tr key={i} style={{ borderTop: "1px solid var(--lv-surface-muted)" }}>
                    <td style={{ padding: "8px 12px", color: "var(--lv-text-body)", fontWeight: 600 }}>{r.type}</td>
                    <td style={{ padding: "8px 12px", color: "var(--lv-text-body)", fontFamily: "var(--lv-font-mono)", wordBreak: "break-all" }}>{r.name}</td>
                    <td style={{ padding: "8px 12px", color: "var(--lv-text-body)", fontFamily: "var(--lv-font-mono)", wordBreak: "break-all" }}>{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Candidate invite email template (org-wide; positions can override) */}
      <Section icon={Mail} title="Candidate Invite Email" description="The email candidates receive with their interview link. Positions can override it.">
        <InviteTemplateEditor endpoint="/api/agency/invite-template" scope="agency" />
      </Section>

      {/* Branding (white-label reports & candidate portal) */}
      <Section icon={CheckCircle2} title="Branding" description="Your logo and colour appear on reports and the candidate portal">
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ width: 80, height: 80, borderRadius: 12, border: "1px solid var(--lv-border)", background: "var(--lv-surface-sunken)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={logoUrl} alt="Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              : <span style={{ fontSize: 11, color: "var(--lv-text-muted)" }}>No logo</span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label className="lv-btn lv-btn--secondary" style={{ fontSize: 13, cursor: "pointer", display: "inline-block" }}>
              {uploadingLogo ? "Uploading…" : "Upload Logo"}
              <input
                type="file" accept="image/*" hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }}
              />
            </label>
            <span style={{ fontSize: 11, color: "var(--lv-text-muted)" }}>PNG/SVG, under 512KB. Shown on candidate reports.</span>
          </div>
        </div>
        <Field label="Brand Colour">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input type="color" value={brandColor} onChange={(e) => saveBrandColor(e.target.value)} style={{ width: 44, height: 36, border: "1px solid var(--lv-border)", borderRadius: 8, cursor: "pointer", background: "none" }} />
            <span style={{ fontSize: 13, color: "var(--lv-text-body)", fontFamily: "var(--lv-font-mono)" }}>{brandColor}</span>
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
                border: `1.5px solid ${voiceAccent === v.key ? "color-mix(in srgb, var(--lv-accent) 35%, transparent)" : "var(--lv-border)"}`,
                background: voiceAccent === v.key ? "color-mix(in srgb, var(--lv-accent) 5%, transparent)" : "var(--lv-surface-sunken)",
                cursor: "pointer", transition: "all 0.15s",
              }}
              onClick={() => setVoiceAccent(v.key)}
            >
              {/* Radio */}
              <div style={{
                width: 18, height: 18, borderRadius: "50%",
                border: `2px solid ${voiceAccent === v.key ? "var(--lv-accent)" : "var(--lv-border-strong)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "border-color 0.15s",
              }}>
                {voiceAccent === v.key && (
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--lv-accent)" }} />
                )}
              </div>

              {/* Flag + name */}
              <span style={{ fontSize: 20, flexShrink: 0 }}>{v.flag}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: voiceAccent === v.key ? "var(--lv-accent)" : "var(--lv-brand)" }}>
                  {v.accent}
                </div>
                <div style={{ fontSize: 11, color: "var(--lv-text-muted)", marginTop: 1 }}>{v.description}</div>
              </div>

              {/* Preview button */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); previewVoice(v.key); }}
                disabled={!!previewLoading}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 12px", borderRadius: 7,
                  border: "1px solid color-mix(in srgb, var(--lv-accent) 20%, transparent)",
                  background: "color-mix(in srgb, var(--lv-accent) 7%, transparent)", color: "var(--lv-accent)",
                  fontSize: 12, fontWeight: 600, cursor: previewLoading ? "wait" : "pointer",
                  fontFamily: "var(--lv-font-sans)", flexShrink: 0, transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--lv-accent) 14%, transparent)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--lv-accent) 7%, transparent)"; }}
              >
                {previewLoading === v.key
                  ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
                  : <Play size={11} fill="var(--lv-accent)" />
                }
                Preview
              </button>
            </div>
          ))}
        </div>

        {/* Interviewer name display */}
        <div style={{
          marginTop: 4, padding: "12px 16px",
          background: "color-mix(in srgb, var(--lv-accent) 5%, transparent)",
          border: "1px solid color-mix(in srgb, var(--lv-accent) 15%, transparent)",
          borderRadius: 8, fontSize: 13, color: "var(--lv-text-body)",
        }}>
          Your AI interviewer will introduce as:{" "}
          <strong style={{ color: "var(--lv-accent)" }}>{selectedOption.interviewerName}</strong>
        </div>

        <button
          onClick={saveVoiceSettings}
          disabled={savingVoice}
          className="lv-btn lv-btn--primary"
          style={{ alignSelf: "flex-start", fontSize: 13 }}
        >
          {savingVoice ? "Saving…" : "Save Voice Settings"}
        </button>
      </Section>

      {/* Notifications */}
      <Section icon={Bell} title="Notifications" description="Choose when and how you get notified">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ToggleRow label="Email notifications"  sub="Receive updates via email"                              checked={notifEmail}      onChange={setNotifEmail}      />
          <div style={{ height: 1, background: "var(--lv-surface-muted)" }} />
          <ToggleRow label="Slack integration"    sub="Post alerts to a Slack channel"                        checked={notifSlack}      onChange={setNotifSlack}      />
          <div style={{ height: 1, background: "var(--lv-surface-muted)" }} />
          <ToggleRow label="No-show alerts"       sub="Get notified when a candidate misses their slot"       checked={notifNoShow}     onChange={setNotifNoShow}     />
          <div style={{ height: 1, background: "var(--lv-surface-muted)" }} />
          <ToggleRow label="Completion reports"   sub="Receive a summary after each interview completes"      checked={notifCompletion} onChange={setNotifCompletion} />
        </div>
      </Section>

      {/* Interview Defaults */}
      <Section icon={Mic} title="Interview Defaults" description="Default settings applied to new interviews">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))", gap: 16 }}>
          <Field label="Interview Duration">
            {/* Build 06: production interviews are fixed at 30 minutes — no
                selectable options, to reduce config surface. */}
            <div className="lv-input" aria-readonly="true" style={{ display: 'flex', alignItems: 'center', color: 'var(--lv-text-body)', background: 'var(--lv-surface-sunken)', cursor: 'default' }}>
              30 minutes <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--lv-text-muted)' }}>· fixed</span>
            </div>
          </Field>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ToggleRow label="Auto-generate transcript"   sub="Save a full text transcript of each interview"             checked={recordTranscript} onChange={setRecordTranscript} />
          <div style={{ height: 1, background: "var(--lv-surface-muted)" }} />
          <ToggleRow label="Auto-score on completion"   sub="AI evaluates and scores each candidate automatically"      checked={autoScore}        onChange={setAutoScore}        />
        </div>
      </Section>

      {/* Team Members */}
      <Section icon={Users} title="Team Members" description="Manage who has access to this dashboard">
        {teamLoading ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <Loader2 size={20} color="var(--lv-accent)" style={{ animation: "spin 1s linear infinite", margin: "0 auto" }} />
          </div>
        ) : (
          <>
            {/* Active users */}
            {teamUsers.map((u) => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--lv-surface-muted)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--lv-brand-soft)", border: "1px solid color-mix(in srgb, var(--lv-accent) 20%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--lv-accent)" }}>
                    {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--lv-brand)" }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: "var(--lv-text-muted)", marginTop: 1 }}>{u.email}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="lv-badge lv-badge--success" style={{ textTransform: "capitalize" }}>{u.role}</span>
                  <span style={{ fontSize: 10, color: "var(--lv-text-muted)" }}>Active</span>
                </div>
              </div>
            ))}

            {/* Invited (pending) members */}
            {teamMembers.filter(m => m.status === 'invited').map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--lv-surface-muted)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--lv-surface-muted)", border: "1px solid var(--lv-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--lv-text-muted)" }}>
                    {m.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--lv-text-muted)" }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: "var(--lv-text-muted)", marginTop: 1 }}>{m.email}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="lv-badge lv-badge--warning">Invited</span>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/agency/team', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId: m.id }) });
                        if (res.ok) { toast.success('Invite resent'); }
                        else { const d = await res.json(); toast.error(d.error ?? 'Failed'); }
                      } catch { toast.error('Failed to resend'); }
                    }}
                    className="lv-btn lv-btn--secondary lv-btn--sm" aria-label={`Resend invite to ${m.email}`}
                  >
                    <RefreshCw size={13} aria-hidden="true" /> Resend
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/agency/team', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId: m.id }) });
                        if (res.ok) { toast.success('Member removed'); loadTeam(); }
                        else { const d = await res.json(); toast.error(d.error ?? 'Failed'); }
                      } catch { toast.error('Failed to remove'); }
                    }}
                    className="lv-btn lv-btn--ghost lv-btn--sm lv-btn--icon" aria-label={`Remove ${m.email}`} title="Remove" style={{ color: "var(--lv-danger)" }}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}

            {/* Invite new row */}
            {showInviteRow && (
              <div role="group" aria-label="Invite a team member" style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 0", flexWrap: "wrap" }}>
                <input
                  className="lv-input" type="email" placeholder="colleague@company.com" aria-label="Colleague's email"
                  value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  style={{ flex: "2 1 200px", minWidth: 0 }}
                />
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value as 'recruiter' | 'admin' | 'viewer')} className="lv-select" aria-label="Role"
                  style={{ flex: "1 1 120px", minWidth: 0, width: "auto" }}>
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
                  className="lv-btn lv-btn--primary"
                  style={{ fontSize: 13, whiteSpace: "nowrap" }}
                >
                  {invitingNew ? "Sending…" : "Send Invite"}
                </button>
                <button type="button" onClick={() => setShowInviteRow(false)} className="lv-btn lv-btn--ghost lv-btn--icon" aria-label="Cancel invite">✕</button>
              </div>
            )}

            <button className="lv-btn lv-btn--secondary" style={{ alignSelf: "flex-start" }} onClick={() => setShowInviteRow(true)}>
              <Plus size={14} aria-hidden="true" /> Invite Team Member
            </button>
          </>
        )}
      </Section>

      {/* Billing */}
      <Section icon={CreditCard} title="Billing & Plan" description="Manage your subscription and usage">
        {/* Current plan card */}
        <div style={{
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--lv-brand) 4%, transparent) 0%, color-mix(in srgb, var(--lv-accent) 6%, transparent) 100%)',
          border: '1px solid color-mix(in srgb, var(--lv-brand) 15%, transparent)',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--lv-text-muted)', marginBottom: 4 }}>Current Plan</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--lv-brand)', fontFamily: 'var(--lv-font-display)', textTransform: 'capitalize' }}>
              {agencyPlan?.plan ?? 'Trial'}
            </div>
            {agencyPlan?.plan === 'trial' && (
              <div style={{ fontSize: 12, color: 'var(--lv-text-muted)', marginTop: 4 }}>
                {agencyPlan.interviewsUsed} / {agencyPlan.interviewsLimit} interviews used · {agencyPlan.trialDaysLeft} days remaining
              </div>
            )}
          </div>
          {/* Usage bar */}
          {agencyPlan && (
            <div style={{ flex: 1, minWidth: 120, maxWidth: 200 }}>
              <div style={{ fontSize: 12, color: 'var(--lv-text-muted)', marginBottom: 6, fontWeight: 500 }}>
                Usage: {agencyPlan.interviewsUsed} / {agencyPlan.interviewsLimit}
              </div>
              <div style={{ height: 6, borderRadius: 4, background: 'var(--lv-border)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min((agencyPlan.interviewsUsed / agencyPlan.interviewsLimit) * 100, 100)}%`,
                  background: agencyPlan.interviewsUsed >= agencyPlan.interviewsLimit ? 'var(--lv-danger)' : 'var(--lv-brand)',
                  borderRadius: 4,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          )}
          {agencyPlan?.plan === 'trial' && (
            <button
              onClick={() => setShowUpgradeWall(true)}
              className="lv-btn lv-btn--primary"
            >
              <TrendingUp size={14} aria-hidden="true" />
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
                  border: plan.popular ? '1.5px solid var(--lv-accent)' : '1px solid var(--lv-border)',
                  borderRadius: 12, padding: '18px 16px',
                  position: 'relative',
                  background: plan.popular ? 'color-mix(in srgb, var(--lv-accent) 2%, transparent)' : 'var(--lv-surface)',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 800, color: plan.color, fontFamily: 'var(--lv-font-display)', marginBottom: 2 }}>{plan.name}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--lv-text)', marginBottom: 10 }}>{plan.price}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                  {plan.features.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <CheckCircle2 size={13} color={plan.color} style={{ marginTop: 1, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--lv-text-body)', lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={billingLoading === plan.id}
                  className="lv-btn lv-btn--primary lv-btn--full"
                  aria-busy={billingLoading === plan.id || undefined}
                  style={{ background: plan.color }}
                >
                  {billingLoading === plan.id ? 'Processing…' : `Upgrade to ${plan.name}`}
                </button>
              </div>
            ))}
          </div>
        )}

        <p style={{ fontSize: 11, color: 'var(--lv-text-muted)' }}>
          Secure payments via Cashfree · GST applicable · Cancel anytime
        </p>
      </Section>

      {/* Save */}
      <div className="lv-actions" style={{ paddingBottom: 40 }}>
        <div className="lv-actions__start">
          <button type="button" className="lv-btn lv-btn--tertiary" onClick={restartTour}>
            Restart product tour
          </button>
        </div>
        <button type="button" className="lv-btn lv-btn--secondary" onClick={() => toast("Changes discarded")}>
          Discard
        </button>
        <button type="button" className="lv-btn lv-btn--primary" onClick={handleSaveSettings}>
          Save Changes
        </button>
      </div>
    </div>
  );
}
