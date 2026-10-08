"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, RotateCcw, Eye, Braces } from "lucide-react";
import {
  INVITE_VARIABLES, InviteVars, renderInviteEmail, sampleVars, validateTemplate, SUBJECT_MAX, BODY_MAX,
} from "@/lib/screen/recruiter/invite-template";

// ── Candidate invite template editor (Screen F2) ───────────────────────────
// Used in Settings (org-wide template) and on a position (override). Plain
// text + {{variables}}; the preview runs the SAME renderer the server sends
// with, so what you see is what the candidate gets.

type Source = "position" | "agency" | "default";

export function InviteTemplateEditor({ endpoint, scope, previewVars }: {
  endpoint: string;                      // /api/agency/invite-template | /api/positions/:id/invite-template
  scope: "agency" | "position";
  previewVars?: Partial<InviteVars>;     // real position/company for a truer preview
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saved, setSaved] = useState<{ subject: string; body: string } | null>(null);
  const [source, setSource] = useState<Source>("default");
  const [canEdit, setCanEdit] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const lastFocus = useRef<"subject" | "body">("body");

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(endpoint, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed to load template");
      setSubject(d.subject); setBody(d.body); setSaved({ subject: d.subject, body: d.body });
      setSource(scope === "agency" ? (d.isCustom ? "agency" : "default") : d.source);
      setCanEdit(d.canEdit !== false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load template");
    } finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [endpoint]);

  const errors = useMemo(() => validateTemplate({ subject, body }), [subject, body]);
  const dirty = !!saved && (saved.subject !== subject || saved.body !== body);
  const preview = useMemo(
    () => renderInviteEmail({ subject, body }, { ...sampleVars(), ...previewVars } as InviteVars),
    [subject, body, previewVars],
  );

  const insert = (key: string) => {
    const token = `{{${key}}}`;
    const target = lastFocus.current === "subject" ? subjectRef.current : bodyRef.current;
    const value = lastFocus.current === "subject" ? subject : body;
    const set = lastFocus.current === "subject" ? setSubject : setBody;
    const start = target?.selectionStart ?? value.length;
    const end = target?.selectionEnd ?? value.length;
    set(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => { target?.focus(); target?.setSelectionRange(start + token.length, start + token.length); });
  };

  const save = async (reset = false) => {
    setSaving(true);
    try {
      const r = await fetch(endpoint, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reset ? { reset: true } : { subject, body }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed to save");
      toast.success(reset ? (scope === "position" ? "Override removed — using the agency template" : "Reset to the Levl1 default") : "Invite template saved");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally { setSaving(false); }
  };

  if (loading) return <div style={{ display: "flex", gap: 8, alignItems: "center", color: "#94A3B8", fontSize: 13 }}><Loader2 size={14} className="animate-spin" /> Loading template…</div>;

  const sourceLabel = source === "position" ? "Custom for this position" : source === "agency" ? (scope === "agency" ? "Custom agency template" : "Inherited from agency template") : "Levl1 default";
  const resettable = scope === "position" ? source === "position" : source === "agency";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: source === "default" ? "#64748B" : "#4F46E5", background: source === "default" ? "#F1F5F9" : "#EEF2FF", borderRadius: 100, padding: "3px 10px" }}>{sourceLabel}</span>
        {!canEdit && <span style={{ fontSize: 11.5, color: "#94A3B8" }}>Read-only for your role</span>}
        <button type="button" onClick={() => setShowPreview((v) => !v)} className="btn-ghost" style={{ marginLeft: "auto", fontSize: 12.5, padding: "5px 10px", display: "inline-flex", gap: 6, alignItems: "center" }}>
          <Eye size={13} /> {showPreview ? "Hide preview" : "Show preview"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: showPreview ? "minmax(0,1fr) minmax(0,1fr)" : "1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>Subject</label>
          <input ref={subjectRef} className="input" value={subject} disabled={!canEdit} maxLength={SUBJECT_MAX}
            onFocus={() => (lastFocus.current = "subject")} onChange={(e) => setSubject(e.target.value.replace(/[\r\n]/g, " "))} />
          <label style={{ fontSize: 12.5, fontWeight: 600, color: "#475569", marginTop: 4 }}>Message</label>
          <textarea ref={bodyRef} className="input" value={body} disabled={!canEdit} maxLength={BODY_MAX}
            onFocus={() => (lastFocus.current = "body")} onChange={(e) => setBody(e.target.value)}
            style={{ minHeight: 240, resize: "vertical", fontFamily: "var(--font-sans)", lineHeight: 1.55 }} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: "#64748B", marginBottom: 6 }}><Braces size={12} /> Insert variable</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {INVITE_VARIABLES.map((v) => (
                <button key={v.key} type="button" disabled={!canEdit} onClick={() => insert(v.key)} title={v.label}
                  style={{ border: "1px solid #E0E7FF", background: "#F5F7FF", color: "#4338CA", borderRadius: 7, padding: "3px 8px", fontSize: 11.5, fontFamily: "var(--font-mono)", cursor: canEdit ? "pointer" : "not-allowed" }}>
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>
          </div>
          <p style={{ fontSize: 11.5, color: "#94A3B8", margin: 0, lineHeight: 1.5 }}>
            The AI-interview disclosure and the &ldquo;Select your interview slot&rdquo; button are always included, so candidates can&apos;t miss the consent notice or the scheduling link.
          </p>
          {errors.length > 0 && (
            <ul style={{ margin: 0, padding: "8px 12px 8px 26px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, color: "#B91C1C", fontSize: 12.5 }}>
              {errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
        </div>

        {showPreview && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>Preview <span style={{ fontWeight: 400, color: "#94A3B8" }}>· sample candidate</span></div>
            <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "8px 12px", fontSize: 13, background: "#fff" }}>
              <span style={{ color: "#94A3B8" }}>Subject: </span><strong style={{ color: "#0F172A" }}>{preview.subject || "—"}</strong>
            </div>
            <iframe title="Invite email preview" srcDoc={preview.html} sandbox=""
              style={{ width: "100%", height: 460, border: "1px solid #E2E8F0", borderRadius: 10, background: "#F8FAFC" }} />
          </div>
        )}
      </div>

      {canEdit && (
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
          {resettable && (
            <button type="button" className="btn-ghost" disabled={saving} onClick={() => save(true)} style={{ display: "inline-flex", gap: 6, alignItems: "center", marginRight: "auto" }}>
              <RotateCcw size={13} /> {scope === "position" ? "Remove override" : "Reset to default"}
            </button>
          )}
          {dirty && <button type="button" className="btn-ghost" disabled={saving} onClick={() => saved && (setSubject(saved.subject), setBody(saved.body))}>Discard</button>}
          <button type="button" className="btn-primary" disabled={saving || !dirty || errors.length > 0} onClick={() => save(false)}>
            {saving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : scope === "position" && source !== "position" ? "Save as position override" : "Save template"}
          </button>
        </div>
      )}
    </div>
  );
}
