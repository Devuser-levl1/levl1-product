"use client";

import {
  useState, useRef, useCallback, useEffect, DragEvent, ChangeEvent,
} from "react";
import { useAppStore, Candidate } from "@/store/appStore";
import { X, Upload, Clipboard, UserPlus, CheckCircle2, AlertCircle, Trash2, ChevronRight, ChevronDown, ChevronUp, AlertTriangle, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Badge, Alert, Field, Input, Select, Textarea, type Tone } from "@/components/screen/ui";
import { lv, space, text, radius } from "@/lib/screen/ui/tokens";

// Design-System Pass 3 (group 3): presentation on the Screen design system.
// Extraction, duplicate checks and the save payload are unchanged.

// ─── Types ─────────────────────────────────────────────────────────────────
type UploadTab = "upload" | "paste" | "manual";

interface FileItem {
  id: string;
  file: File;
  name: string;
  size: string;
  status: "queued" | "processing" | "extracted" | "error";
  error?: string;
  progress: number;
}

interface ExtractedCandidate {
  tempId: string;
  fileName: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  linkedIn: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  totalYearsExperience: number | null;
  topSkills: string[];
  educationSummary: string | null;
  extractionConfidence: "high" | "medium" | "low";
  missingFields: string[];
  // state
  assignedPositionId: string;
  selected: boolean;
  isDuplicate?: boolean;
  duplicateInfo?: string;
  rawText?: string;
  rawTextOpen?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ConfidenceBadge({ level }: { level: "high" | "medium" | "low" }) {
  const cfg: Record<"high" | "medium" | "low", { tone: Tone; label: string }> = {
    high:   { tone: "success", label: "High"   },
    medium: { tone: "warning", label: "Medium" },
    low:    { tone: "danger",  label: "Low"    },
  };
  const c = cfg[level];
  return <Badge tone={c.tone} title={`${c.label} extraction confidence`}>{c.label}</Badge>;
}

// Compact in-table controls: canonical input styling at table density.
const CELL: React.CSSProperties = { height: 32, fontSize: text.xs, padding: "0 8px" };

// Grid template shared between header + rows
const COLS = "32px 1.8fr 1.3fr 0.75fr 0.9fr 1.1fr 68px 1.4fr 60px";

// ─── Main Component ─────────────────────────────────────────────────────────
export default function CandidateUploadFlow({ onClose, presetPositionId, onAdded }: {
  onClose: () => void
  presetPositionId?: string
  /** Called after candidates are saved, so a parent that renders its own list (e.g. the position page) can re-read it. */
  onAdded?: (added: Candidate[]) => void
}) {
  const { positions, candidates, addCandidates } = useAppStore();
  const activePositions = positions.filter((p) => p.status === "active");
  const defaultPositionId = presetPositionId ?? activePositions[0]?.id ?? "";

  const [tab, setTab] = useState<UploadTab>("upload");

  // File upload state
  const [files,      setFiles]      = useState<FileItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef                = useRef<HTMLInputElement>(null);

  // Paste tab state
  const [pasteText, setPasteText] = useState("");
  const [pasteName, setPasteName] = useState("");

  // Manual tab state
  const [manualName,     setManualName]     = useState("");
  const [manualEmail,    setManualEmail]    = useState("");
  const [manualPhone,    setManualPhone]    = useState("");
  const [manualLinkedIn, setManualLinkedIn] = useState("");
  const [manualYoe,      setManualYoe]      = useState("");
  const [manualPos,      setManualPos]      = useState(defaultPositionId);

  // Extraction results
  const [extracted, setExtracted] = useState<ExtractedCandidate[]>([]);
  const [bulkPos,   setBulkPos]   = useState(defaultPositionId);
  const [saving,    setSaving]    = useState(false);

  // Navigation guard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ── File handling ────────────────────────────────────────────────────
  const addFiles = useCallback((incoming: File[]) => {
    const valid = incoming
      .filter((f) => /\.(pdf|doc|docx)$/i.test(f.name))
      .filter((f) => f.size < 10 * 1024 * 1024)
      .slice(0, 20 - files.length);

    const items: FileItem[] = valid.map((f) => ({
      id: `${Date.now()}-${Math.random()}`,
      file: f, name: f.name, size: fmtSize(f.size),
      status: "queued", progress: 0,
    }));
    setFiles((prev) => [...prev, ...items]);
  }, [files.length]);

  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const onFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  // ── Check duplicates ─────────────────────────────────────────────────
  const checkDuplicate = (email: string | null): { isDuplicate: boolean; info: string } => {
    if (!email) return { isDuplicate: false, info: "" };
    const existing = candidates.find((c) => c.email.toLowerCase() === email.toLowerCase());
    if (!existing) return { isDuplicate: false, info: "" };
    return { isDuplicate: true, info: `${existing.name} is already in pipeline for ${existing.positionTitle}` };
  };

  // ── Update a single field of an extracted candidate ──────────────────
  const updateField = <K extends keyof ExtractedCandidate>(
    tempId: string, field: K, value: ExtractedCandidate[K],
  ) => setExtracted((prev) => prev.map((x) => x.tempId === tempId ? { ...x, [field]: value } : x));

  // ── Extract from file (sends real file bytes via FormData) ───────────
  const extractFile = async (item: FileItem): Promise<ExtractedCandidate | null> => {
    const formData = new FormData();
    formData.append("file", item.file);

    try {
      const res  = await fetch("/api/extract-resume", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const dup = checkDuplicate(data.email);
      return {
        tempId:               `t-${Date.now()}-${Math.random()}`,
        fileName:             item.name,
        name:                 data.name             ?? null,
        email:                data.email            ?? null,
        phone:                data.phone            ?? null,
        linkedIn:             data.linkedIn         ?? null,
        currentTitle:         data.currentTitle     ?? null,
        currentCompany:       data.currentCompany   ?? null,
        totalYearsExperience: data.totalYearsExperience ?? null,
        topSkills:            data.topSkills        ?? [],
        educationSummary:     data.educationSummary ?? null,
        extractionConfidence: data.extractionConfidence ?? "low",
        missingFields:        data.missingFields    ?? [],
        assignedPositionId:   defaultPositionId,
        selected:             true,
        isDuplicate:          dup.isDuplicate,
        duplicateInfo:        dup.info,
        rawText:              data.rawExtractedText ?? "",
        rawTextOpen:          false,
      };
    } catch {
      return null;
    }
  };

  // ── Extract from paste ──────────────────────────────────────────────
  const extractPaste = async () => {
    if (pasteText.trim().length < 20) { toast.error("Please paste more resume content"); return; }

    const tempId = `paste-${Date.now()}`;
    setExtracted((prev) => [...prev, {
      tempId, fileName: pasteName || "Pasted Resume",
      name: pasteName || null, email: null, phone: null, linkedIn: null,
      currentTitle: null, currentCompany: null, totalYearsExperience: null,
      topSkills: [], educationSummary: null,
      extractionConfidence: "low", missingFields: [],
      assignedPositionId: defaultPositionId, selected: true,
      rawText: pasteText, rawTextOpen: false,
    }]);

    try {
      const res  = await fetch("/api/extract-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: pasteText, fileName: pasteName || "pasted-resume" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const dup = checkDuplicate(data.email);
      setExtracted((prev) => prev.map((e) =>
        e.tempId === tempId ? {
          ...e, ...data,
          topSkills:     data.topSkills    ?? [],
          missingFields: data.missingFields ?? [],
          isDuplicate:   dup.isDuplicate,
          duplicateInfo: dup.info,
          rawText:       pasteText, // keep original paste text for debug
          rawTextOpen:   false,
        } : e
      ));
      setPasteText(""); setPasteName("");
      toast.success("Resume extracted");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Extraction failed";
      toast.error(msg);
      setExtracted((prev) => prev.filter((e) => e.tempId !== tempId));
    }
  };

  // ── Upload All ──────────────────────────────────────────────────────
  const uploadAll = async () => {
    const queued = files.filter((f) => f.status === "queued");
    if (queued.length === 0) return;

    for (const item of queued) {
      setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "processing", progress: 30 } : f));
      const result = await extractFile(item);
      if (result) {
        setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "extracted", progress: 100 } : f));
        setExtracted((prev) => [...prev, result]);
      } else {
        setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "error", error: "Extraction failed", progress: 0 } : f));
      }
    }
  };

  // ── Add manual candidate ─────────────────────────────────────────────
  const addManual = () => {
    if (!manualName.trim() || !manualEmail.trim()) { toast.error("Name and email are required"); return; }
    const dup = checkDuplicate(manualEmail);
    setExtracted((prev) => [...prev, {
      tempId:               `manual-${Date.now()}`,
      fileName:             "Manual Entry",
      name:                 manualName.trim(),
      email:                manualEmail.trim(),
      phone:                manualPhone.trim() || null,
      linkedIn:             manualLinkedIn.trim() || null,
      currentTitle:         null,
      currentCompany:       null,
      totalYearsExperience: manualYoe ? Number(manualYoe) : null,
      topSkills:            [],
      educationSummary:     null,
      extractionConfidence: "high",
      missingFields:        [],
      assignedPositionId:   manualPos,
      selected:             true,
      isDuplicate:          dup.isDuplicate,
      duplicateInfo:        dup.info,
      rawText:              undefined,
      rawTextOpen:          false,
    }]);
    toast.success(`${manualName} added`);
    setManualName(""); setManualEmail(""); setManualPhone(""); setManualLinkedIn(""); setManualYoe("");
  };

  // ── Bulk assign position ─────────────────────────────────────────────
  const applyBulkPos = () => {
    if (!bulkPos) return;
    setExtracted((prev) => prev.map((e) => e.selected ? { ...e, assignedPositionId: bulkPos } : e));
  };

  // ── Confirm & add to pipeline — saves to DB then updates store ──────────
  const confirmAdd = async () => {
    const toAdd = extracted.filter((e) => e.selected && !e.isDuplicate);
    if (toAdd.length === 0) { toast.error("No candidates selected"); return; }

    const missing = toAdd.filter((e) => !e.email);
    if (missing.length > 0) {
      toast.error(`${missing.map((e) => e.name).join(", ")} must have an email`);
      return;
    }

    setSaving(true);
    try {
      // Build payload using Prisma field names exactly
      const payload = toAdd.map((e) => ({
        name:            e.name ?? "Unknown",
        email:           e.email!,
        ...(e.phone            ? { phone:            e.phone }            : {}),
        ...(e.linkedIn         ? { linkedIn:          e.linkedIn }         : {}),
        ...(e.currentTitle     ? { currentTitle:      e.currentTitle }     : {}),
        ...(e.currentCompany   ? { currentCompany:    e.currentCompany }   : {}),
        ...(e.totalYearsExperience != null ? { totalYears: e.totalYearsExperience } : {}),
        topSkills:       e.topSkills,
        ...(e.educationSummary ? { educationSummary:  e.educationSummary } : {}),
        ...(e.rawText          ? { resumeText:         e.rawText }         : {}),
        positionId:      e.assignedPositionId,
        status:          "pending",
      }));

      const body = payload.length === 1 ? payload[0] : payload;
      const res  = await fetch("/api/candidates", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      if (res.status === 401) {
        window.location.assign("/interviews/login?expired=1");
        throw new Error("Your session has expired — please sign in again.");
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save candidates");

      // Normalise single-object vs array response
      const saved = (Array.isArray(data) ? data : [data]) as Array<Record<string, unknown>>;

      // Map DB rows (real cuids) → Zustand store shape
      const newCandidates: Candidate[] = saved.map((c) => {
        const pos = positions.find((p) => p.id === c.positionId);
        return {
          id:                   c.id                as string,
          name:                 c.name              as string,
          email:                c.email             as string,
          phone:                (c.phone            as string | undefined) ?? undefined,
          linkedIn:             (c.linkedIn         as string | undefined) ?? undefined,
          currentTitle:         (c.currentTitle     as string | undefined) ?? undefined,
          currentCompany:       (c.currentCompany   as string | undefined) ?? undefined,
          totalYearsExperience: (c.totalYears       as number | undefined) ?? undefined,
          topSkills:            (c.topSkills        as string[]) ?? [],
          educationSummary:     (c.educationSummary as string | undefined) ?? undefined,
          positionId:           c.positionId        as string,
          positionTitle:        pos?.title ?? "Unknown Position",
          status:               "pending",
          uploadedAt:           (c.uploadedAt       as string) ?? new Date().toISOString(),
        };
      });

      addCandidates(newCandidates);
      onAdded?.(newCandidates);
      toast.success(`${newCandidates.length} candidate${newCandidates.length !== 1 ? "s" : ""} saved`);
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save candidates");
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = extracted.filter((e) => e.selected && !e.isDuplicate).length;
  const hasResults    = extracted.length > 0;

  // ──────────────────────────────────────────────────────────────────────────
  const queuedCount = files.filter((f) => f.status === "queued").length;
  const dupCount    = extracted.filter((e) => e.isDuplicate).length;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: lv.overlay, display: "flex", justifyContent: "flex-end",
    }}>
      {/* Slide-over panel */}
      <div role="dialog" aria-modal="true" aria-labelledby="cuf-title" style={{
        width: "min(100vw, 1060px)", height: "100vh",
        background: lv.bg, display: "flex", flexDirection: "column",
        boxShadow: lv.shadowLg,
        animation: "slideInRight 0.22s ease",
      }}>
        {/* Header */}
        <div style={{ background: lv.surface, borderBottom: `1px solid ${lv.border}`, padding: "0 clamp(16px, 3vw, 28px)", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
            <Upload size={16} aria-hidden="true" />
            <h2 id="cuf-title" style={{ margin: 0, fontFamily: lv.fontDisplay, fontSize: text.md, fontWeight: 600, color: lv.text }}>Upload Candidates</h2>
          </div>
          <Button variant="ghost" iconOnly aria-label="Close upload" onClick={onClose}><X size={20} /></Button>
        </div>

        {/* Body — scrollable */}
        <div style={{ flex: 1, overflowY: "auto", padding: `${space[6]}px clamp(16px, 3vw, 28px)`, display: "flex", flexDirection: "column", gap: space[6] }}>

          {/* Tab switcher */}
          <div className="lv-seg lv-seg--track" role="tablist" aria-label="How to add candidates" style={{ flexShrink: 0 }}>
            {([
              { key: "upload", icon: Upload,    label: "Upload PDF / Doc" },
              { key: "paste",  icon: Clipboard, label: "Paste Resume"     },
              { key: "manual", icon: UserPlus,  label: "Manual Entry"     },
            ] as const).map(({ key, icon: Icon, label }) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} className="lv-seg__opt" onClick={() => setTab(key)}>
                <Icon size={14} aria-hidden="true" /> {label}
              </button>
            ))}
          </div>

          {/* ── TAB: Upload ── */}
          {tab === "upload" && (
            <div style={{ display: "flex", flexDirection: "column", gap: space[4] }}>
              {/* Drop zone */}
              <div
                role="button"
                tabIndex={0}
                aria-label="Upload resumes: drag and drop, or press Enter to browse"
                className="lv-dropzone lv-dropzone--interactive"
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
                style={{
                  cursor: "pointer", transition: `all ${lv.dur}`,
                  borderColor: isDragOver ? lv.brand : undefined,
                  background: isDragOver ? lv.brandSoft : lv.surface,
                }}
              >
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx" onChange={onFileInput} style={{ display: "none" }} />
                <Upload size={28} color={isDragOver ? lv.brand : lv.textMuted} aria-hidden="true" style={{ margin: "0 auto 12px" }} />
                <p style={{ fontSize: text.md, fontWeight: 600, color: isDragOver ? lv.brandText : lv.text, margin: 0 }}>
                  {isDragOver ? "Drop files here" : "Drag & drop resumes, or click to browse"}
                </p>
                <p style={{ fontSize: text.xs, color: lv.textMuted, margin: `${space[2]}px 0 0` }}>PDF, Word (.doc, .docx) · Up to 20 files · 10 MB each</p>
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
                  <ul aria-label="Files to process" style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: space[2] }}>
                    {files.map((f) => {
                      return (
                        <li key={f.id} className="lv-card" style={{ display: "flex", alignItems: "center", gap: space[3], padding: `${space[2]}px ${space[3]}px` }}>
                          <FileText size={16} aria-hidden="true" style={{ flexShrink: 0, color: lv.textMuted }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: text.sm, fontWeight: 500, color: lv.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                            <div style={{ fontSize: text.xs, color: lv.textMuted, marginTop: 2 }}>{f.size}</div>
                            {f.status === "processing" && (
                              <div role="progressbar" aria-label={`Processing ${f.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={f.progress} style={{ height: 4, background: lv.surfaceMuted, borderRadius: 2, overflow: "hidden", marginTop: 6 }}>
                                <div style={{ height: "100%", width: `${f.progress}%`, background: lv.brand, borderRadius: 2, transition: "width 0.4s ease" }} />
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: space[2], flexShrink: 0 }}>
                            {f.status === "queued"     && <Badge tone="neutral">Queued</Badge>}
                            {f.status === "processing" && <span className="lv-spinner" role="status" aria-label="Processing" style={{ color: lv.brand }} />}
                            {f.status === "extracted"  && <Badge tone="success"><CheckCircle2 size={12} aria-hidden="true" /> Extracted</Badge>}
                            {f.status === "error"      && <Badge tone="danger" title={f.error}><AlertCircle size={12} aria-hidden="true" /> Failed</Badge>}
                            <Button variant="ghost" size="sm" iconOnly aria-label={`Remove ${f.name}`} onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}>
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <Button
                    style={{ alignSelf: "flex-start", marginTop: space[1] }}
                    onClick={uploadAll}
                    disabled={files.every((f) => f.status !== "queued")}
                    leftIcon={<Upload size={14} />}
                  >
                    Process {queuedCount} File{queuedCount !== 1 ? "s" : ""}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Paste ── */}
          {tab === "paste" && (
            <div style={{ display: "flex", flexDirection: "column", gap: space[4] }}>
              <Field label="Candidate Name (optional)" style={{ maxWidth: 340 }}>
                <Input placeholder="AI will try to extract from resume text" value={pasteName} onChange={(e) => setPasteName(e.target.value)} />
              </Field>
              <Field label="Resume Text" required>
                <Textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste the full resume content here…"
                  style={{ resize: "vertical", lineHeight: 1.65, minHeight: 300 }}
                />
              </Field>
              <Button style={{ alignSelf: "flex-start" }} onClick={extractPaste} disabled={pasteText.trim().length < 20} leftIcon={<Clipboard size={14} />}>
                Extract Details
              </Button>
            </div>
          )}

          {/* ── TAB: Manual ── */}
          {tab === "manual" && (
            <div style={{ display: "flex", flexDirection: "column", gap: space[4] }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: space[4] }}>
                {[
                  { label: "Full Name",            req: true,  val: manualName,     set: setManualName,     type: "text",   ph: "e.g. Rahul Sharma"        },
                  { label: "Email Address",        req: true,  val: manualEmail,    set: setManualEmail,    type: "email",  ph: "e.g. rahul@email.com"     },
                  { label: "Phone",                req: false, val: manualPhone,    set: setManualPhone,    type: "text",   ph: "+91 98765 43210"           },
                  { label: "LinkedIn URL",         req: false, val: manualLinkedIn, set: setManualLinkedIn, type: "url",    ph: "https://linkedin.com/in/…" },
                  { label: "Years of Experience",  req: false, val: manualYoe,      set: setManualYoe,      type: "number", ph: "e.g. 7"                   },
                ].map(({ label, req, val, set, type, ph }) => (
                  <Field key={label} label={label} required={req}>
                    <Input type={type} value={val} onChange={(e) => set(e.target.value)} placeholder={ph} />
                  </Field>
                ))}
                <Field label="Assign to Position">
                  <Select value={manualPos} onChange={(e) => setManualPos(e.target.value)}>
                    {activePositions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                    {activePositions.length === 0 && <option value="">No active positions</option>}
                  </Select>
                </Field>
              </div>
              <Button style={{ alignSelf: "flex-start" }} onClick={addManual} leftIcon={<UserPlus size={14} />}>
                Add Candidate
              </Button>
            </div>
          )}

          {/* ── Extracted results table ── */}
          {hasResults && (
            <section aria-labelledby="cuf-results" style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space[3], flexWrap: "wrap" }}>
                <h3 id="cuf-results" style={{ margin: 0, fontFamily: lv.fontDisplay, fontSize: text.md, fontWeight: 600, color: lv.text }}>
                  Extraction Results — {extracted.length} candidate{extracted.length !== 1 ? "s" : ""}
                </h3>
                {!presetPositionId && (
                  <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                    <Select aria-label="Position for selected candidates" value={bulkPos} onChange={(e) => setBulkPos(e.target.value)} style={{ width: "auto", height: 32, fontSize: text.sm }}>
                      {activePositions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </Select>
                    <Button variant="secondary" size="sm" onClick={applyBulkPos}>
                      Assign Selected
                    </Button>
                  </div>
                )}
              </div>

              <div className="lv-card" style={{ padding: 0, overflowX: "auto" }}>
                <div role="table" aria-labelledby="cuf-results" style={{ minWidth: 960 }}>
                {/* Table header */}
                <div role="row" style={{ display: "grid", gridTemplateColumns: COLS, padding: `${space[2]}px ${space[4]}px`, background: lv.surfaceSunken, borderBottom: `1px solid ${lv.border}` }}>
                  {["Select", "Name / Email", "Current Role", "Exp", "Phone", "Skills", "Conf.", "Position", "Actions"].map((h, i) => (
                    <div key={i} role="columnheader" className="lv-eyebrow" style={{ fontSize: 11 }}>
                      {i === 0 || i === 8 ? <span className="lv-sr-only">{h}</span> : h}
                    </div>
                  ))}
                </div>

                {/* Rows — each wrapped in flex-col to allow collapsible section */}
                {extracted.map((e, idx) => {
                  const pos         = positions.find((p) => p.id === e.assignedPositionId);
                  const needsVerify = e.extractionConfidence !== "high" || e.missingFields.length > 0;
                  const isLast      = idx === extracted.length - 1;
                  const who         = e.name || e.fileName;

                  return (
                    <div key={e.tempId} style={{ borderBottom: !isLast ? `1px solid ${lv.border}` : "none" }}>
                      {/* ── Data row ── */}
                      <div role="row" style={{
                        display: "grid", gridTemplateColumns: COLS,
                        alignItems: "start", padding: `${space[3]}px ${space[4]}px`,
                        background: e.isDuplicate ? lv.dangerSoft : needsVerify ? lv.warningSoft : "transparent",
                      }}>

                        {/* Checkbox */}
                        <div role="cell" style={{ paddingTop: 8 }}>
                          <input
                            type="checkbox" checked={e.selected && !e.isDuplicate}
                            disabled={e.isDuplicate}
                            aria-label={`Include ${who}`}
                            onChange={() => updateField(e.tempId, "selected", !e.selected)}
                            style={{ width: 16, height: 16, cursor: e.isDuplicate ? "not-allowed" : "pointer", accentColor: lv.brand }}
                          />
                        </div>

                        {/* Name / email — always editable */}
                        <div role="cell" style={{ paddingRight: space[2], display: "flex", flexDirection: "column", gap: 4 }}>
                          <Input
                            style={CELL}
                            aria-label="Full name"
                            value={e.name ?? ""}
                            onChange={(ev) => updateField(e.tempId, "name", ev.target.value)}
                            placeholder="Full name"
                          />
                          <Input
                            style={CELL}
                            aria-label="Email"
                            aria-invalid={!e.email || undefined}
                            value={e.email ?? ""}
                            onChange={(ev) => updateField(e.tempId, "email", ev.target.value)}
                            placeholder="Email *"
                          />
                          {!e.email && (
                            <div style={{ fontSize: text.xs, fontWeight: 600, color: lv.danger, display: "flex", alignItems: "center", gap: 3 }}>
                              <AlertTriangle size={12} aria-hidden="true" /> Required
                            </div>
                          )}
                          {e.isDuplicate && (
                            <div style={{ fontSize: text.xs, color: lv.danger, display: "flex", alignItems: "center", gap: 3 }}>
                              <AlertCircle size={12} aria-hidden="true" /> {e.duplicateInfo}
                            </div>
                          )}
                        </div>

                        {/* Current role — always editable */}
                        <div role="cell" style={{ paddingRight: space[2], display: "flex", flexDirection: "column", gap: 4 }}>
                          <Input
                            style={CELL}
                            aria-label="Job title"
                            value={e.currentTitle ?? ""}
                            onChange={(ev) => updateField(e.tempId, "currentTitle", ev.target.value)}
                            placeholder="Job title"
                          />
                          <Input
                            style={CELL}
                            aria-label="Company"
                            value={e.currentCompany ?? ""}
                            onChange={(ev) => updateField(e.tempId, "currentCompany", ev.target.value)}
                            placeholder="Company"
                          />
                        </div>

                        {/* Years exp — always editable */}
                        <div role="cell" style={{ paddingRight: space[2] }}>
                          <Input
                            style={CELL}
                            aria-label="Years of experience"
                            type="number"
                            value={e.totalYearsExperience ?? ""}
                            onChange={(ev) => updateField(e.tempId, "totalYearsExperience", ev.target.value ? Number(ev.target.value) : null)}
                            placeholder="Yrs"
                          />
                        </div>

                        {/* Phone — always editable */}
                        <div role="cell" style={{ paddingRight: space[2] }}>
                          <Input
                            style={CELL}
                            aria-label="Phone"
                            value={e.phone ?? ""}
                            onChange={(ev) => updateField(e.tempId, "phone", ev.target.value || null)}
                            placeholder="Phone"
                          />
                        </div>

                        {/* Skills (display only — limited space) */}
                        <div role="cell" style={{ display: "flex", flexWrap: "wrap", gap: 3, alignContent: "flex-start", paddingTop: 6 }}>
                          {e.topSkills.slice(0, 3).map((s) => (
                            <span key={s} style={{ fontSize: 11, fontFamily: lv.fontMono, padding: "1px 6px", borderRadius: radius.sm, background: lv.surfaceMuted, color: lv.textBody, border: `1px solid ${lv.border}` }}>{s}</span>
                          ))}
                          {e.topSkills.length > 3 && <span style={{ fontSize: 11, color: lv.textMuted }}>+{e.topSkills.length - 3}</span>}
                        </div>

                        {/* Confidence */}
                        <div role="cell" style={{ paddingTop: 5 }}><ConfidenceBadge level={e.extractionConfidence} /></div>

                        {/* Position — hidden when pre-set from position detail */}
                        <div role="cell">
                          {presetPositionId ? (
                            <span style={{ fontSize: text.xs, color: lv.text, fontWeight: 600 }}>{pos?.title ?? "—"}</span>
                          ) : (
                            <>
                              <Select
                                aria-label={`Position for ${who}`}
                                value={e.assignedPositionId}
                                onChange={(ev) => updateField(e.tempId, "assignedPositionId", ev.target.value)}
                                style={{ ...CELL, paddingRight: 28 }}
                              >
                                {activePositions.map((p) => <option key={p.id} value={p.id}>{p.title.length > 22 ? p.title.slice(0, 22) + "…" : p.title}</option>)}
                                {activePositions.length === 0 && <option value="">No active positions</option>}
                              </Select>
                              {pos?.status !== "active" && pos && (
                                <div style={{ fontSize: text.xs, color: lv.danger, marginTop: 3 }}>Position not active</div>
                              )}
                            </>
                          )}
                        </div>

                        {/* Actions */}
                        <div role="cell" style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                          {/* Toggle raw text */}
                          <Button variant="secondary" size="sm" iconOnly
                            aria-expanded={!!e.rawTextOpen}
                            aria-label={e.rawTextOpen ? `Hide extracted text for ${who}` : `View extracted text for ${who}`}
                            title={e.rawTextOpen ? "Hide extracted text" : "View extracted text"}
                            onClick={() => updateField(e.tempId, "rawTextOpen", !e.rawTextOpen)}>
                            {e.rawTextOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </Button>
                          {/* Delete */}
                          <Button variant="ghost" size="sm" iconOnly aria-label={`Remove ${who}`} style={{ color: lv.danger }}
                            onClick={() => setExtracted((prev) => prev.filter((x) => x.tempId !== e.tempId))}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>

                      {/* ── Collapsible raw text ── */}
                      {e.rawTextOpen && (
                        <div style={{ padding: `0 ${space[4]}px ${space[3]}px`, borderTop: `1px solid ${lv.border}`, background: lv.surfaceSunken }}>
                          <div className="lv-eyebrow" style={{ marginBottom: 6, marginTop: space[3], display: "flex", alignItems: "center", gap: 6 }}>
                            Extracted text sent to Claude
                            <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>({(e.rawText ?? "").length} chars · {e.fileName})</span>
                          </div>
                          <pre style={{
                            fontSize: text.xs, color: lv.textBody, background: lv.surface, border: `1px solid ${lv.border}`,
                            borderRadius: radius.md, padding: `${space[2]}px ${space[3]}px`, whiteSpace: "pre-wrap", wordBreak: "break-word",
                            maxHeight: 200, overflowY: "auto", fontFamily: lv.fontMono, lineHeight: 1.6, margin: 0,
                          }}>
                            {e.rawText?.trim() || "No raw text captured for this entry"}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
              </div>

              {/* Warnings */}
              {dupCount > 0 && (
                <Alert tone="danger">
                  {dupCount} duplicate email{dupCount !== 1 ? "s" : ""} detected and excluded
                </Alert>
              )}
              {extracted.some((e) => e.extractionConfidence === "low" && !e.isDuplicate) && (
                <Alert tone="warning">
                  Some candidates have low confidence — verify fields above before adding
                </Alert>
              )}
            </section>
          )}
        </div>

        {/* Footer */}
        <div style={{ background: lv.surface, borderTop: `1px solid ${lv.border}`, padding: `${space[4]}px clamp(16px, 3vw, 28px)`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: space[3], flexWrap: "wrap", flexShrink: 0 }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          {hasResults && (
            <Button onClick={confirmAdd} disabled={selectedCount === 0} loading={saving} rightIcon={<ChevronRight size={16} />}>
              {saving ? "Saving…" : `Add ${selectedCount} Candidate${selectedCount !== 1 ? "s" : ""} to Pipeline`}
            </Button>
          )}
        </div>
      </div>

      <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { [aria-labelledby="cuf-title"] { animation: none !important; } }`}</style>
    </div>
  );
}
