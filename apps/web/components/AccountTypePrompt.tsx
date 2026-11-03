"use client";

import { useEffect, useState } from "react";
import { Briefcase, Building2, X } from "lucide-react";
import toast from "react-hot-toast";
import { ACCOUNT_TYPES, type AccountType } from "@/lib/screen/account-type";

// ── One-time "agency or company?" prompt (Screen) ──────────────────────────
// Shown on the dashboard only for existing accounts that never chose (created
// before onboarding asked). Until they answer, everything behaves as before
// (agency-style job setup). "Later" hides it for this browser session.

const SNOOZE_KEY = "levl1_account_type_snooze";

export function AccountTypePrompt() {
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState<AccountType | null>(null);

  useEffect(() => {
    try { if (sessionStorage.getItem(SNOOZE_KEY)) return; } catch { /* storage blocked */ }
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.agency && d.agency.accountType == null) setShow(true); })
      .catch(() => {});
  }, []);

  const choose = async (t: AccountType) => {
    setSaving(t);
    try {
      const r = await fetch("/api/agency/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountType: t }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Could not save");
      toast.success(t === "company" ? "Got it — job setup will use your company and one hiring contact" : "Got it — job setup will ask for the client company and client contacts");
      setShow(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally { setSaving(null); }
  };

  if (!show) return null;
  return (
    <div role="dialog" aria-label="Choose account type"
      style={{ margin: "16px 28px 0", background: "#fff", border: "1px solid #C7D2FE", borderRadius: 14, padding: "16px 18px", boxShadow: "0 4px 18px rgba(79,70,229,0.08)", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 260px" }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: "#1E293B" }}>Quick question — how do you hire?</div>
        <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 2 }}>We&apos;ll tailor job setup: agencies get client company and client contacts; in-house teams skip them.</div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {ACCOUNT_TYPES.map((t) => {
          const Icon = t.value === "agency" ? Briefcase : Building2;
          return (
            <button key={t.value} type="button" disabled={!!saving} onClick={() => choose(t.value)} title={t.desc}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 10, border: "1px solid #C7D2FE", background: saving === t.value ? "#4F46E5" : "#EEF2FF", color: saving === t.value ? "#fff" : "#4338CA", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", fontFamily: "var(--font-sans)" }}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>
      <button type="button" aria-label="Ask me later" title="Ask me later"
        onClick={() => { try { sessionStorage.setItem(SNOOZE_KEY, "1"); } catch {} setShow(false); }}
        style={{ border: "none", background: "none", color: "#94A3B8", cursor: "pointer", padding: 4 }}>
        <X size={16} />
      </button>
    </div>
  );
}
