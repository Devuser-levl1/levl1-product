"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { RotateCcw, Eye, Braces } from "lucide-react";
import {
  INVITE_VARIABLES, InviteVars, renderInviteEmail, sampleVars, validateTemplate, SUBJECT_MAX, BODY_MAX,
} from "@/lib/screen/recruiter/invite-template";
import { Button, Badge, Alert, Field, Input, Textarea } from "@/components/screen/ui";
import { lv, space, text, radius } from "@/lib/screen/ui/tokens";

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

  if (loading) return <div role="status" style={{ display: "flex", gap: space[2], alignItems: "center", color: lv.textMuted, fontSize: text.sm }}><span className="lv-spinner" aria-hidden="true" style={{ color: lv.brand }} /> Loading template…</div>;

  const sourceLabel = source === "position" ? "Custom for this position" : source === "agency" ? (scope === "agency" ? "Custom agency template" : "Inherited from agency template") : "Levl1 default";
  const resettable = scope === "position" ? source === "position" : source === "agency";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: space[4] }}>
      <div style={{ display: "flex", alignItems: "center", gap: space[2], flexWrap: "wrap" }}>
        <Badge tone={source === "default" ? "neutral" : "brand"}>{sourceLabel}</Badge>
        {!canEdit && <span style={{ fontSize: text.xs, color: lv.textMuted }}>Read-only for your role</span>}
        <Button variant="tertiary" size="sm" style={{ marginLeft: "auto" }} aria-expanded={showPreview} leftIcon={<Eye size={14} />} onClick={() => setShowPreview((v) => !v)}>
          {showPreview ? "Hide preview" : "Show preview"}
        </Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: showPreview ? "repeat(auto-fit, minmax(min(320px, 100%), 1fr))" : "1fr", gap: space[4] }}>
        <div style={{ display: "flex", flexDirection: "column", gap: space[3], minWidth: 0 }}>
          <Field label="Subject">
            <Input ref={subjectRef} value={subject} disabled={!canEdit} maxLength={SUBJECT_MAX}
              onFocus={() => (lastFocus.current = "subject")} onChange={(e) => setSubject(e.target.value.replace(/[\r\n]/g, " "))} />
          </Field>
          <Field label="Message">
            <Textarea ref={bodyRef} value={body} disabled={!canEdit} maxLength={BODY_MAX}
              onFocus={() => (lastFocus.current = "body")} onChange={(e) => setBody(e.target.value)}
              style={{ minHeight: 240, resize: "vertical", lineHeight: 1.55 }} />
          </Field>
          <div role="group" aria-labelledby="ite-vars">
            <div id="ite-vars" className="lv-label" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}><Braces size={13} aria-hidden="true" /> Insert variable</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {INVITE_VARIABLES.map((v) => (
                <button key={v.key} type="button" disabled={!canEdit} onClick={() => insert(v.key)} title={v.label} aria-label={`Insert ${v.label}`} className="lv-chip-add"
                  style={{ minHeight: 28, border: `1px solid ${lv.brandSoftBorder}`, background: lv.brandSoft, color: lv.brandText, borderRadius: radius.sm, padding: "0 8px", fontSize: text.xs, fontFamily: lv.fontMono, cursor: canEdit ? "pointer" : "not-allowed", opacity: canEdit ? 1 : 0.55 }}>
                  {`{{${v.key}}}`}
                </button>
              ))}
            </div>
          </div>
          <p className="lv-hint" style={{ margin: 0 }}>
            The AI-interview disclosure and the &ldquo;Select your interview slot&rdquo; button are always included, so candidates can&apos;t miss the consent notice or the scheduling link.
          </p>
          {errors.length > 0 && (
            <Alert tone="danger">
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {errors.map((e) => <li key={e}>{e}</li>)}
              </ul>
            </Alert>
          )}
        </div>

        {showPreview && (
          <div style={{ display: "flex", flexDirection: "column", gap: space[2], minWidth: 0 }}>
            <div className="lv-label">Preview <span style={{ fontWeight: 400, color: lv.textMuted }}>· sample candidate</span></div>
            <div style={{ border: `1px solid ${lv.border}`, borderRadius: radius.md, padding: `${space[2]}px ${space[3]}px`, fontSize: text.sm, background: lv.surface }}>
              <span style={{ color: lv.textMuted }}>Subject: </span><strong style={{ color: lv.text }}>{preview.subject || "—"}</strong>
            </div>
            <iframe title="Invite email preview" srcDoc={preview.html} sandbox=""
              style={{ width: "100%", height: 460, border: `1px solid ${lv.border}`, borderRadius: radius.md, background: lv.surfaceSunken }} />
          </div>
        )}
      </div>

      {canEdit && (
        <div className="lv-actions">
          {resettable && (
            <div className="lv-actions__start">
              <Button variant="tertiary" disabled={saving} onClick={() => save(true)} leftIcon={<RotateCcw size={14} />}>
                {scope === "position" ? "Remove override" : "Reset to default"}
              </Button>
            </div>
          )}
          {dirty && <Button variant="secondary" disabled={saving} onClick={() => saved && (setSubject(saved.subject), setBody(saved.body))}>Discard</Button>}
          <Button disabled={!dirty || errors.length > 0} loading={saving} onClick={() => save(false)}>
            {saving ? "Saving…" : scope === "position" && source !== "position" ? "Save as position override" : "Save template"}
          </Button>
        </div>
      )}
    </div>
  );
}
