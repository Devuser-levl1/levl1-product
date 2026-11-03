"use client";

import { useEffect, useState } from "react";
import { Briefcase, Building2, X } from "lucide-react";
import toast from "react-hot-toast";
import { ACCOUNT_TYPES, type AccountType } from "@/lib/screen/account-type";
import { useAccountType } from "@/hooks/useAccountType";
import { useAppStore } from "@/store/appStore";

// ── One-time "agency or company?" prompt (Screen) ──────────────────────────
// Shown on the dashboard only for existing accounts that never chose (created
// before onboarding asked). Until they answer, everything behaves as before
// (agency-style job setup). "Later" hides it for this browser session.

const SNOOZE_KEY = "levl1_account_type_snooze";

export function AccountTypePrompt() {
  const { loaded, raw, orgName } = useAccountType();
  const setAccount = useAppStore((s) => s.setAccount);
  const [snoozed, setSnoozed] = useState(true);
  const [saving, setSaving] = useState<AccountType | null>(null);
  useEffect(() => { try { setSnoozed(!!sessionStorage.getItem(SNOOZE_KEY)); } catch { setSnoozed(false); } }, []);
  const show = loaded && raw === null && !snoozed;

  const choose = async (t: AccountType) => {
    setSaving(t);
    try {
      const r = await fetch("/api/agency/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountType: t }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Could not save");
      toast.success(t === "company" ? "Got it — position setup will use your company and one hiring contact" : "Got it — position setup will ask for the client company and client contacts");
      setAccount({ type: t, orgName });   // every agency/company conditional updates now
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally { setSaving(null); }
  };

  if (!show) return null;
  return (
    <div role="dialog" aria-label="Choose account type"
      style={{ margin: "16px 28px 0", background: "#fff", border: "1px solid var(--lv-brand-soft-border)", borderRadius: 14, padding: "16px 18px", boxShadow: "0 4px 18px color-mix(in srgb, var(--lv-brand) 8%, transparent)", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 260px" }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--lv-text)" }}>Quick question — how do you hire?</div>
        <div style={{ fontSize: 12.5, color: "var(--lv-text-muted)", marginTop: 2 }}>We&apos;ll tailor position setup: agencies get client company and client contacts; in-house teams skip them.</div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {ACCOUNT_TYPES.map((t) => {
          const Icon = t.value === "agency" ? Briefcase : Building2;
          return (
            <button key={t.value} type="button" disabled={!!saving} onClick={() => choose(t.value)} title={t.desc}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 10, border: "1px solid var(--lv-brand-soft-border)", background: saving === t.value ? "var(--lv-brand)" : "var(--lv-brand-soft)", color: saving === t.value ? "#fff" : "var(--lv-brand-text)", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", fontFamily: "var(--lv-font-sans)" }}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>
      <button type="button" aria-label="Ask me later" title="Ask me later"
        onClick={() => { try { sessionStorage.setItem(SNOOZE_KEY, "1"); } catch {} setSnoozed(true); }}
        style={{ border: "none", background: "none", color: "var(--lv-text-muted)", cursor: "pointer", padding: 4 }}>
        <X size={16} />
      </button>
    </div>
  );
}
