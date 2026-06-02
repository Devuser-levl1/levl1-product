"use client";

import {
  useState, useRef, useCallback, useEffect, DragEvent, ChangeEvent,
} from "react";
import { useAppStore, Candidate } from "@/store/appStore";
import {
  X, Upload, Clipboard, UserPlus, CheckCircle2,
  AlertCircle, Loader2, Trash2, ChevronRight, ChevronDown, ChevronUp,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";

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
  const cfg = {
    high:   { color: "#059669", bg: "rgba(16,185,129,0.10)", label: "High"   },
    medium: { color: "#D97706", bg: "rgba(245,158,11,0.10)", label: "Medium" },
    low:    { color: "#DC2626", bg: "rgba(239,68,68,0.10)",  label: "Low"    },
  };
  const c = cfg[level];
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color: c.color, background: c.bg, padding: "2px 8px", borderRadius: 100, whiteSpace: "nowrap" }}>
      {c.label}
    </span>
  );
}

const INPUT_STYLE: React.CSSProperties = {
  background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 6,
  padding: "5px 8px", fontSize: 12, color: "#4F46E5", fontFamily: "var(--font-sans)",
  outline: "none", width: "100%",
};

const SELECT_STYLE: React.CSSProperties = { ...INPUT_STYLE, cursor: "pointer" };

// Grid template shared between header + rows
const COLS = "32px 1.8fr 1.3fr 0.75fr 0.9fr 1.1fr 68px 1.4fr 60px";

// ─── Main Component ─────────────────────────────────────────────────────────
export default function CandidateUploadFlow({ onClose }: { onClose: () => void }) {
  const { positions, candidates, addCandidates } = useAppStore();
  const activePositions = positions.filter((p) => p.status === "active");
  const defaultPositionId = activePositions[0]?.id ?? "";

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
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(79,70,229,0.45)", display: "flex", justifyContent: "flex-end",
    }}>
      {/* Slide-over panel */}
      <div style={{
        width: "min(92vw, 1060px)", height: "100vh",
        background: "#FAFAFA", display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 32px rgba(79,70,229,0.18)",
        animation: "slideInRight 0.22s ease",
      }}>
        {/* Header */}
        <div style={{ background: "#fff", borderBottom: "1px solid #E2E8F0", padding: "0 28px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Upload size={18} color="#7C3AED" />
            <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "#4F46E5" }}>Upload Candidates</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 6, borderRadius: 8, display: "flex" }}>
            <X size={20} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 0, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 4, flexShrink: 0 }}>
            {([
              { key: "upload", icon: Upload,    label: "Upload PDF / Doc" },
              { key: "paste",  icon: Clipboard, label: "Paste Resume"     },
              { key: "manual", icon: UserPlus,  label: "Manual Entry"     },
            ] as const).map(({ key, icon: Icon, label }) => (
              <button key={key} onClick={() => setTab(key)}
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: 7, fontSize: 13, fontWeight: 500,
                  cursor: "pointer", border: "none", fontFamily: "var(--font-sans)",
                  background: tab === key ? "#fff" : "transparent",
                  color: tab === key ? "#4F46E5" : "#94A3B8",
                  boxShadow: tab === key ? "0 1px 3px rgba(79,70,229,0.08)" : "none",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.15s",
                }}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          {/* ── TAB: Upload ── */}
          {tab === "upload" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragOver ? "#7C3AED" : "#CBD5E1"}`,
                  borderRadius: 14, padding: "48px 24px", textAlign: "center",
                  cursor: "pointer", transition: "all 0.2s",
                  background: isDragOver ? "rgba(124,58,237,0.04)" : "#fff",
                }}
              >
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx" onChange={onFileInput} style={{ display: "none" }} />
                <Upload size={28} color={isDragOver ? "#7C3AED" : "#CBD5E1"} style={{ margin: "0 auto 12px" }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: isDragOver ? "#7C3AED" : "#475569" }}>
                  {isDragOver ? "Drop files here" : "Drag & drop resumes, or click to browse"}
                </p>
                <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 6 }}>PDF, Word (.doc, .docx) · Up to 20 files · 10 MB each</p>
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {files.map((f) => {
                    const isPdf    = f.name.toLowerCase().endsWith(".pdf");
                    const isDoc    = f.name.toLowerCase().endsWith(".doc") || f.name.toLowerCase().endsWith(".docx");
                    const fileIcon = isPdf ? "📄" : isDoc ? "📝" : "📎";
                    return (
                      <div key={f.id} style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                        background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8,
                      }}>
                        <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{fileIcon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "#4F46E5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{f.size}</div>
                          {f.status === "processing" && (
                            <div style={{ height: 3, background: "#E2E8F0", borderRadius: 2, overflow: "hidden", marginTop: 6 }}>
                              <div style={{ height: "100%", width: `${f.progress}%`, background: "#7C3AED", borderRadius: 2, transition: "width 0.4s ease" }} />
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          {f.status === "queued"     && <span style={{ fontSize: 11, color: "#94A3B8", background: "#F1F5F9", padding: "2px 8px", borderRadius: 100 }}>Queued</span>}
                          {f.status === "processing" && <Loader2 size={14} color="#7C3AED" style={{ animation: "spin 1s linear infinite" }} />}
                          {f.status === "extracted"  && <CheckCircle2 size={14} color="#10B981" />}
                          {f.status === "error"      && <span title={f.error}><AlertCircle size={14} color="#EF4444" /></span>}
                          <button onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 2, display: "flex" }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    className="btn-primary"
                    style={{ alignSelf: "flex-start", marginTop: 4 }}
                    onClick={uploadAll}
                    disabled={files.every((f) => f.status !== "queued")}
                  >
                    <Upload size={14} />
                    Process {files.filter((f) => f.status === "queued").length} File{files.filter((f) => f.status === "queued").length !== 1 ? "s" : ""}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: Paste ── */}
          {tab === "paste" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Candidate Name (optional)</label>
                <input className="input" placeholder="AI will try to extract from resume text" value={pasteName} onChange={(e) => setPasteName(e.target.value)} style={{ maxWidth: 340 }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Resume Text *</label>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste the full resume content here…"
                  style={{
                    width: "100%", padding: "14px 16px", borderRadius: 10, border: "1px solid #E2E8F0",
                    fontSize: 13, color: "#4F46E5", fontFamily: "var(--font-sans)", resize: "vertical",
                    outline: "none", lineHeight: 1.65, minHeight: 300, background: "#fff",
                  }}
                />
              </div>
              <button className="btn-primary" style={{ alignSelf: "flex-start" }} onClick={extractPaste} disabled={pasteText.trim().length < 20}>
                <Clipboard size={14} /> Extract Details
              </button>
            </div>
          )}

          {/* ── TAB: Manual ── */}
          {tab === "manual" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[
                  { label: "Full Name *",         val: manualName,     set: setManualName,     type: "text",   ph: "e.g. Rahul Sharma"        },
                  { label: "Email Address *",      val: manualEmail,    set: setManualEmail,    type: "email",  ph: "e.g. rahul@email.com"     },
                  { label: "Phone",                val: manualPhone,    set: setManualPhone,    type: "text",   ph: "+91 98765 43210"           },
                  { label: "LinkedIn URL",         val: manualLinkedIn, set: setManualLinkedIn, type: "url",    ph: "https://linkedin.com/in/…" },
                  { label: "Years of Experience",  val: manualYoe,      set: setManualYoe,      type: "number", ph: "e.g. 7"                   },
                ].map(({ label, val, set, type, ph }) => (
                  <div key={label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{label}</label>
                    <input className="input" type={type} value={val} onChange={(e) => set(e.target.value)} placeholder={ph} />
                  </div>
                ))}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>Assign to Position</label>
                  <select className="input" value={manualPos} onChange={(e) => setManualPos(e.target.value)} style={{ cursor: "pointer" }}>
                    {activePositions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                    {activePositions.length === 0 && <option value="">No active positions</option>}
                  </select>
                </div>
              </div>
              <button className="btn-primary" style={{ alignSelf: "flex-start" }} onClick={addManual}>
                <UserPlus size={14} /> Add Candidate
              </button>
            </div>
          )}

          {/* ── Extracted results table ── */}
          {hasResults && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "#4F46E5" }}>
                  Extraction Results — {extracted.length} candidate{extracted.length !== 1 ? "s" : ""}
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <select value={bulkPos} onChange={(e) => setBulkPos(e.target.value)} style={{ ...SELECT_STYLE, width: "auto", fontSize: 12, padding: "5px 10px" }}>
                    {activePositions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                  <button className="btn-ghost" style={{ fontSize: 12 }} onClick={applyBulkPos}>
                    Assign Selected
                  </button>
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
                {/* Table header */}
                <div style={{ display: "grid", gridTemplateColumns: COLS, padding: "10px 16px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                  {["", "Name / Email", "Current Role", "Exp", "Phone", "Skills", "Conf.", "Position", ""].map((h, i) => (
                    <div key={i} style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
                  ))}
                </div>

                {/* Rows — each wrapped in flex-col to allow collapsible section */}
                {extracted.map((e, idx) => {
                  const pos         = positions.find((p) => p.id === e.assignedPositionId);
                  const needsVerify = e.extractionConfidence !== "high" || e.missingFields.length > 0;
                  const isLast      = idx === extracted.length - 1;

                  return (
                    <div key={e.tempId} style={{ borderBottom: !isLast ? "1px solid #F1F5F9" : "none" }}>
                      {/* ── Data row ── */}
                      <div style={{
                        display: "grid", gridTemplateColumns: COLS,
                        alignItems: "start", padding: "12px 16px",
                        background: e.isDuplicate ? "rgba(239,68,68,0.03)" : needsVerify ? "rgba(245,158,11,0.03)" : "transparent",
                      }}>

                        {/* Checkbox */}
                        <div style={{ paddingTop: 7 }}>
                          <input
                            type="checkbox" checked={e.selected && !e.isDuplicate}
                            disabled={e.isDuplicate}
                            onChange={() => updateField(e.tempId, "selected", !e.selected)}
                            style={{ cursor: e.isDuplicate ? "not-allowed" : "pointer", accentColor: "#7C3AED" }}
                          />
                        </div>

                        {/* Name / email — always editable */}
                        <div style={{ paddingRight: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                          <input
                            style={INPUT_STYLE}
                            value={e.name ?? ""}
                            onChange={(ev) => updateField(e.tempId, "name", ev.target.value)}
                            placeholder="Full name"
                          />
                          <input
                            style={{ ...INPUT_STYLE, borderColor: !e.email ? "#FCA5A5" : "#E2E8F0" }}
                            value={e.email ?? ""}
                            onChange={(ev) => updateField(e.tempId, "email", ev.target.value)}
                            placeholder="Email *"
                          />
                          {!e.email && (
                            <div style={{ fontSize: 10, color: "#EF4444", display: "flex", alignItems: "center", gap: 3 }}>
                              <AlertTriangle size={9} /> Required
                            </div>
                          )}
                          {e.isDuplicate && (
                            <div style={{ fontSize: 10, color: "#DC2626", display: "flex", alignItems: "center", gap: 3 }}>
                              <AlertCircle size={9} /> {e.duplicateInfo}
                            </div>
                          )}
                        </div>

                        {/* Current role — always editable */}
                        <div style={{ paddingRight: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                          <input
                            style={INPUT_STYLE}
                            value={e.currentTitle ?? ""}
                            onChange={(ev) => updateField(e.tempId, "currentTitle", ev.target.value)}
                            placeholder="Job title"
                          />
                          <input
                            style={INPUT_STYLE}
                            value={e.currentCompany ?? ""}
                            onChange={(ev) => updateField(e.tempId, "currentCompany", ev.target.value)}
                            placeholder="Company"
                          />
                        </div>

                        {/* Years exp — always editable */}
                        <div>
                          <input
                            style={INPUT_STYLE}
                            type="number"
                            value={e.totalYearsExperience ?? ""}
                            onChange={(ev) => updateField(e.tempId, "totalYearsExperience", ev.target.value ? Number(ev.target.value) : null)}
                            placeholder="Yrs"
                          />
                        </div>

                        {/* Phone — always editable */}
                        <div>
                          <input
                            style={INPUT_STYLE}
                            value={e.phone ?? ""}
                            onChange={(ev) => updateField(e.tempId, "phone", ev.target.value || null)}
                            placeholder="Phone"
                          />
                        </div>

                        {/* Skills (display only — limited space) */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 3, alignContent: "flex-start", paddingTop: 4 }}>
                          {e.topSkills.slice(0, 3).map((s) => (
                            <span key={s} style={{ fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 6px", borderRadius: 4, background: "#F1F5F9", color: "#475569", border: "1px solid #E2E8F0" }}>{s}</span>
                          ))}
                          {e.topSkills.length > 3 && <span style={{ fontSize: 10, color: "#94A3B8" }}>+{e.topSkills.length - 3}</span>}
                        </div>

                        {/* Confidence */}
                        <div style={{ paddingTop: 4 }}><ConfidenceBadge level={e.extractionConfidence} /></div>

                        {/* Position */}
                        <div>
                          <select
                            value={e.assignedPositionId}
                            onChange={(ev) => updateField(e.tempId, "assignedPositionId", ev.target.value)}
                            style={SELECT_STYLE}
                          >
                            {activePositions.map((p) => <option key={p.id} value={p.id}>{p.title.length > 22 ? p.title.slice(0, 22) + "…" : p.title}</option>)}
                            {activePositions.length === 0 && <option value="">No active positions</option>}
                          </select>
                          {pos?.status !== "active" && pos && (
                            <div style={{ fontSize: 10, color: "#EF4444", marginTop: 3 }}>Position not active</div>
                          )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {/* Toggle raw text */}
                          <button
                            onClick={() => updateField(e.tempId, "rawTextOpen", !e.rawTextOpen)}
                            title={e.rawTextOpen ? "Hide extracted text" : "View extracted text"}
                            style={{ background: e.rawTextOpen ? "rgba(124,58,237,0.10)" : "#F8FAFC", border: `1px solid ${e.rawTextOpen ? "rgba(124,58,237,0.30)" : "#E2E8F0"}`, borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: e.rawTextOpen ? "#7C3AED" : "#64748B", display: "flex", alignItems: "center", justifyContent: "center" }}
                          >
                            {e.rawTextOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => setExtracted((prev) => prev.filter((x) => x.tempId !== e.tempId))}
                            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center" }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* ── Collapsible raw text ── */}
                      {e.rawTextOpen && (
                        <div style={{ padding: "0 16px 14px", borderTop: "1px solid #F1F5F9", background: "#FAFCFF" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", marginBottom: 6, marginTop: 10, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 6 }}>
                            Extracted text sent to Claude
                            <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>({(e.rawText ?? "").length} chars · {e.fileName})</span>
                          </div>
                          <pre style={{
                            fontSize: 11, color: "#475569", background: "#F8FAFC", border: "1px solid #E2E8F0",
                            borderRadius: 8, padding: "10px 12px", whiteSpace: "pre-wrap", wordBreak: "break-word",
                            maxHeight: 200, overflowY: "auto", fontFamily: "var(--font-mono)", lineHeight: 1.6, margin: 0,
                          }}>
                            {e.rawText?.trim() || "No raw text captured for this entry"}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Warnings */}
              {extracted.some((e) => e.isDuplicate) && (
                <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, fontSize: 12, color: "#DC2626", display: "flex", gap: 8, alignItems: "center" }}>
                  <AlertCircle size={14} />
                  {extracted.filter((e) => e.isDuplicate).length} duplicate email{extracted.filter((e) => e.isDuplicate).length !== 1 ? "s" : ""} detected and excluded
                </div>
              )}
              {extracted.some((e) => e.extractionConfidence === "low" && !e.isDuplicate) && (
                <div style={{ padding: "10px 14px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8, fontSize: 12, color: "#D97706", display: "flex", gap: 8, alignItems: "center" }}>
                  <AlertTriangle size={14} />
                  Some candidates have low confidence — verify fields above before adding
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ background: "#fff", borderTop: "1px solid #E2E8F0", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          {hasResults && (
            <button className="btn-primary" onClick={confirmAdd} disabled={selectedCount === 0 || saving}>
              {saving ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <ChevronRight size={15} />}
              {saving ? "Saving…" : `Add ${selectedCount} Candidate${selectedCount !== 1 ? "s" : ""} to Pipeline`}
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
}
