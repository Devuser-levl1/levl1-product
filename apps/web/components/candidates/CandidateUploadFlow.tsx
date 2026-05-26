"use client";

import {
  useState, useRef, useCallback, useEffect, DragEvent, ChangeEvent,
} from "react";
import { useAppStore, Candidate } from "@/store/appStore";
import {
  X, Upload, FileText, Clipboard, UserPlus, CheckCircle2,
  AlertCircle, Loader2, Trash2, Edit3, Check, ChevronRight,
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
  // editing state
  assignedPositionId: string;
  selected: boolean;
  isDuplicate?: boolean;
  duplicateInfo?: string;
  // inline editing
  editing: boolean;
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
  padding: "5px 8px", fontSize: 12, color: "#0F2147", fontFamily: "var(--font-sans)",
  outline: "none", width: "100%",
};

const SELECT_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  cursor: "pointer",
};

// ─── Main Component ─────────────────────────────────────────────────────────
export default function CandidateUploadFlow({ onClose }: { onClose: () => void }) {
  const { positions, candidates, addCandidates } = useAppStore();
  const activePositions = positions.filter((p) => p.status === "active");
  const defaultPositionId = activePositions[0]?.id ?? "";

  const [tab, setTab] = useState<UploadTab>("upload");

  // File upload state
  const [files,       setFiles]       = useState<FileItem[]>([]);
  const [isDragOver,  setIsDragOver]  = useState(false);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  // Paste tab state
  const [pasteText,   setPasteText]   = useState("");
  const [pasteName,   setPasteName]   = useState("");

  // Manual tab state
  const [manualName,   setManualName]   = useState("");
  const [manualEmail,  setManualEmail]  = useState("");
  const [manualPhone,  setManualPhone]  = useState("");
  const [manualLinkedIn, setManualLinkedIn] = useState("");
  const [manualYoe,    setManualYoe]    = useState("");
  const [manualPos,    setManualPos]    = useState(defaultPositionId);

  // Extraction results
  const [extracted,   setExtracted]   = useState<ExtractedCandidate[]>([]);
  const [bulkPos,     setBulkPos]     = useState(defaultPositionId);

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
      id:       `${Date.now()}-${Math.random()}`,
      file:     f,
      name:     f.name,
      size:     fmtSize(f.size),
      status:   "queued",
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...items]);
  }, [files.length]);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
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
    return {
      isDuplicate: true,
      info: `${existing.name} is already in pipeline for ${existing.positionTitle}`,
    };
  };

  // ── Extract from file (reads text, sends to API) ───────────────────────
  const extractFile = async (item: FileItem): Promise<ExtractedCandidate | null> => {
    // For PDFs we send the file name + a note; for doc/docx we do same
    // In a real app you'd use a PDF parser library. Here we simulate reading text.
    const simulatedText = `Candidate resume file: ${item.name}
This is a simulated text extraction for demonstration purposes.
In production, use pdf-parse or mammoth to extract real text.`;

    try {
      const res = await fetch("/api/extract-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: simulatedText, fileName: item.name }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const dup = checkDuplicate(data.candidate.email);
      return {
        tempId:                `t-${Date.now()}-${Math.random()}`,
        fileName:              item.name,
        ...data.candidate,
        topSkills:             data.candidate.topSkills ?? [],
        missingFields:         data.candidate.missingFields ?? [],
        assignedPositionId:    defaultPositionId,
        selected:              true,
        isDuplicate:           dup.isDuplicate,
        duplicateInfo:         dup.info,
        editing:               false,
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
      editing: false,
    }]);

    try {
      const res = await fetch("/api/extract-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: pasteText, fileName: pasteName || "pasted-resume" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const dup = checkDuplicate(data.candidate.email);
      setExtracted((prev) => prev.map((e) =>
        e.tempId === tempId ? {
          ...e, ...data.candidate,
          topSkills:          data.candidate.topSkills ?? [],
          missingFields:      data.candidate.missingFields ?? [],
          isDuplicate:        dup.isDuplicate,
          duplicateInfo:      dup.info,
        } : e
      ));
      setPasteText("");
      setPasteName("");
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
      tempId:                `manual-${Date.now()}`,
      fileName:              "Manual Entry",
      name:                  manualName.trim(),
      email:                 manualEmail.trim(),
      phone:                 manualPhone.trim() || null,
      linkedIn:              manualLinkedIn.trim() || null,
      currentTitle:          null,
      currentCompany:        null,
      totalYearsExperience:  manualYoe ? Number(manualYoe) : null,
      topSkills:             [],
      educationSummary:      null,
      extractionConfidence:  "high",
      missingFields:         [],
      assignedPositionId:    manualPos,
      selected:              true,
      isDuplicate:           dup.isDuplicate,
      duplicateInfo:         dup.info,
      editing:               false,
    }]);
    toast.success(`${manualName} added`);
    setManualName(""); setManualEmail(""); setManualPhone(""); setManualLinkedIn(""); setManualYoe("");
    // Switch to extracted view
  };

  // ── Bulk assign position ─────────────────────────────────────────────
  const applyBulkPos = () => {
    if (!bulkPos) return;
    setExtracted((prev) => prev.map((e) => e.selected ? { ...e, assignedPositionId: bulkPos } : e));
  };

  // ── Confirm & add to pipeline ────────────────────────────────────────
  const confirmAdd = () => {
    const toAdd = extracted.filter((e) => e.selected && !e.isDuplicate);
    if (toAdd.length === 0) { toast.error("No candidates selected"); return; }

    const missing = toAdd.filter((e) => !e.email);
    if (missing.length > 0) {
      toast.error(`${missing.map((e) => e.name).join(", ")} must have an email`);
      return;
    }

    const newCandidates: Candidate[] = toAdd.map((e) => {
      const pos = positions.find((p) => p.id === e.assignedPositionId);
      return {
        id:                    `c-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name:                  e.name ?? "Unknown",
        email:                 e.email!,
        phone:                 e.phone ?? undefined,
        linkedIn:              e.linkedIn ?? undefined,
        currentTitle:          e.currentTitle ?? undefined,
        currentCompany:        e.currentCompany ?? undefined,
        totalYearsExperience:  e.totalYearsExperience ?? undefined,
        topSkills:             e.topSkills,
        educationSummary:      e.educationSummary ?? undefined,
        positionId:            e.assignedPositionId,
        positionTitle:         pos?.title ?? "Unknown Position",
        status:                "pending",
        uploadedAt:            new Date().toISOString().split("T")[0],
      };
    });

    addCandidates(newCandidates);
    toast.success(`${newCandidates.length} candidate${newCandidates.length !== 1 ? "s" : ""} added to pipeline`);
    onClose();
  };

  const selectedCount = extracted.filter((e) => e.selected && !e.isDuplicate).length;
  const hasResults    = extracted.length > 0;

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(15,33,71,0.45)", display: "flex", justifyContent: "flex-end",
    }}>
      {/* Slide-over panel */}
      <div style={{
        width: "min(92vw, 1040px)", height: "100vh",
        background: "#FAFAFA", display: "flex", flexDirection: "column",
        boxShadow: "-8px 0 32px rgba(15,33,71,0.18)",
        animation: "slideInRight 0.22s ease",
      }}>
        {/* Header */}
        <div style={{ background: "#fff", borderBottom: "1px solid #E2E8F0", padding: "0 28px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Upload size={18} color="#0EA5E9" />
            <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "#0F2147" }}>Upload Candidates</span>
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
              { key: "upload", icon: Upload,      label: "Upload PDF/Doc"  },
              { key: "paste",  icon: Clipboard,   label: "Paste Resume"    },
              { key: "manual", icon: UserPlus,    label: "Manual Entry"    },
            ] as const).map(({ key, icon: Icon, label }) => (
              <button key={key} onClick={() => setTab(key)}
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: 7, fontSize: 13, fontWeight: 500,
                  cursor: "pointer", border: "none", fontFamily: "var(--font-sans)",
                  background: tab === key ? "#fff" : "transparent",
                  color: tab === key ? "#0F2147" : "#94A3B8",
                  boxShadow: tab === key ? "0 1px 3px rgba(15,33,71,0.08)" : "none",
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
                  border: `2px dashed ${isDragOver ? "#0EA5E9" : "#CBD5E1"}`,
                  borderRadius: 14, padding: "48px 24px", textAlign: "center",
                  cursor: "pointer", transition: "all 0.2s",
                  background: isDragOver ? "rgba(14,165,233,0.04)" : "#fff",
                }}
              >
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx" onChange={onFileInput} style={{ display: "none" }} />
                <Upload size={28} color={isDragOver ? "#0EA5E9" : "#CBD5E1"} style={{ margin: "0 auto 12px" }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: isDragOver ? "#0EA5E9" : "#475569" }}>
                  {isDragOver ? "Drop files here" : "Drag & drop resumes, or click to browse"}
                </p>
                <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 6 }}>PDF, DOC, DOCX · Up to 20 files · 10 MB each</p>
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {files.map((f) => (
                    <div key={f.id} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                      background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8,
                    }}>
                      <FileText size={16} color="#0EA5E9" style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#0F2147", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                        <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{f.size}</div>
                        {f.status === "processing" && (
                          <div style={{ height: 3, background: "#E2E8F0", borderRadius: 2, overflow: "hidden", marginTop: 6 }}>
                            <div style={{ height: "100%", width: `${f.progress}%`, background: "#0EA5E9", borderRadius: 2, transition: "width 0.4s ease" }} />
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        {f.status === "queued"     && <span style={{ fontSize: 11, color: "#94A3B8", background: "#F1F5F9", padding: "2px 8px", borderRadius: 100 }}>Queued</span>}
                        {f.status === "processing" && <Loader2 size={14} color="#0EA5E9" style={{ animation: "spin 1s linear infinite" }} />}
                        {f.status === "extracted"  && <CheckCircle2 size={14} color="#10B981" />}
                        {f.status === "error"      && <span title={f.error}><AlertCircle size={14} color="#EF4444" /></span>}
                        <button onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 2, display: "flex" }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}

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
                    fontSize: 13, color: "#0F2147", fontFamily: "var(--font-sans)", resize: "vertical",
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
                  { label: "Full Name *",          val: manualName,     set: setManualName,     type: "text",  ph: "e.g. Rahul Sharma"           },
                  { label: "Email Address *",       val: manualEmail,    set: setManualEmail,    type: "email", ph: "e.g. rahul@email.com"        },
                  { label: "Phone",                 val: manualPhone,    set: setManualPhone,    type: "text",  ph: "+91 98765 43210"              },
                  { label: "LinkedIn URL",          val: manualLinkedIn, set: setManualLinkedIn, type: "url",   ph: "https://linkedin.com/in/…"    },
                  { label: "Years of Experience",   val: manualYoe,      set: setManualYoe,      type: "number",ph: "e.g. 7"                      },
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
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "#0F2147" }}>
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
                <div style={{ display: "grid", gridTemplateColumns: "32px 1.8fr 1.4fr 0.9fr 0.8fr 1.2fr 80px 1.4fr 80px", padding: "10px 16px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                  {["", "Name / Email", "Current Role", "Exp", "Phone", "Skills", "Confidence", "Position", ""].map((h, i) => (
                    <div key={i} style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
                  ))}
                </div>

                {extracted.map((e, idx) => {
                  const pos = positions.find((p) => p.id === e.assignedPositionId);
                  const needsVerify = e.extractionConfidence !== "high" || e.missingFields.length > 0;

                  return (
                    <div key={e.tempId} style={{
                      display: "grid", gridTemplateColumns: "32px 1.8fr 1.4fr 0.9fr 0.8fr 1.2fr 80px 1.4fr 80px",
                      alignItems: "center", padding: "12px 16px",
                      borderBottom: idx < extracted.length - 1 ? "1px solid #F1F5F9" : "none",
                      background: e.isDuplicate ? "rgba(239,68,68,0.03)" : needsVerify ? "rgba(245,158,11,0.03)" : "transparent",
                    }}>
                      {/* Checkbox */}
                      <div>
                        <input
                          type="checkbox" checked={e.selected && !e.isDuplicate}
                          disabled={e.isDuplicate}
                          onChange={() => setExtracted((prev) => prev.map((x) => x.tempId === e.tempId ? { ...x, selected: !x.selected } : x))}
                          style={{ cursor: e.isDuplicate ? "not-allowed" : "pointer", accentColor: "#0EA5E9" }}
                        />
                      </div>

                      {/* Name / email */}
                      <div style={{ paddingRight: 8 }}>
                        {e.editing ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <input style={INPUT_STYLE} value={e.name ?? ""} onChange={(ev) => setExtracted((prev) => prev.map((x) => x.tempId === e.tempId ? { ...x, name: ev.target.value } : x))} placeholder="Name" />
                            <input style={INPUT_STYLE} value={e.email ?? ""} onChange={(ev) => setExtracted((prev) => prev.map((x) => x.tempId === e.tempId ? { ...x, email: ev.target.value } : x))} placeholder="Email" />
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#0F2147" }}>{e.name ?? <span style={{ color: "#94A3B8", fontStyle: "italic" }}>No name</span>}</div>
                            {e.email
                              ? <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{e.email}</div>
                              : <div style={{ fontSize: 11, color: "#EF4444", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}><AlertTriangle size={10} /> Email required</div>
                            }
                            {e.isDuplicate && (
                              <div style={{ fontSize: 10, color: "#DC2626", marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                                <AlertCircle size={9} /> {e.duplicateInfo}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Current role */}
                      <div style={{ paddingRight: 8 }}>
                        {e.editing ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <input style={INPUT_STYLE} value={e.currentTitle ?? ""} onChange={(ev) => setExtracted((prev) => prev.map((x) => x.tempId === e.tempId ? { ...x, currentTitle: ev.target.value } : x))} placeholder="Title" />
                            <input style={INPUT_STYLE} value={e.currentCompany ?? ""} onChange={(ev) => setExtracted((prev) => prev.map((x) => x.tempId === e.tempId ? { ...x, currentCompany: ev.target.value } : x))} placeholder="Company" />
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontSize: 12, color: "#0F2147" }}>{e.currentTitle ?? "—"}</div>
                            <div style={{ fontSize: 11, color: "#94A3B8" }}>{e.currentCompany ?? ""}</div>
                          </div>
                        )}
                      </div>

                      {/* Years exp */}
                      <div style={{ fontSize: 12, color: "#475569" }}>
                        {e.editing
                          ? <input style={INPUT_STYLE} type="number" value={e.totalYearsExperience ?? ""} onChange={(ev) => setExtracted((prev) => prev.map((x) => x.tempId === e.tempId ? { ...x, totalYearsExperience: Number(ev.target.value) } : x))} placeholder="Yrs" />
                          : e.totalYearsExperience ? `${e.totalYearsExperience}y` : "—"
                        }
                      </div>

                      {/* Phone */}
                      <div style={{ fontSize: 12, color: "#475569" }}>
                        {e.editing
                          ? <input style={INPUT_STYLE} value={e.phone ?? ""} onChange={(ev) => setExtracted((prev) => prev.map((x) => x.tempId === e.tempId ? { ...x, phone: ev.target.value } : x))} placeholder="Phone" />
                          : e.phone ?? <span style={{ color: "#CBD5E1" }}>—</span>
                        }
                      </div>

                      {/* Skills */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                        {e.topSkills.slice(0, 3).map((s) => (
                          <span key={s} style={{ fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 6px", borderRadius: 4, background: "#F1F5F9", color: "#475569", border: "1px solid #E2E8F0" }}>{s}</span>
                        ))}
                        {e.topSkills.length > 3 && <span style={{ fontSize: 10, color: "#94A3B8" }}>+{e.topSkills.length - 3}</span>}
                      </div>

                      {/* Confidence */}
                      <div><ConfidenceBadge level={e.extractionConfidence} /></div>

                      {/* Position */}
                      <div>
                        <select value={e.assignedPositionId} onChange={(ev) => setExtracted((prev) => prev.map((x) => x.tempId === e.tempId ? { ...x, assignedPositionId: ev.target.value } : x))} style={SELECT_STYLE}>
                          {activePositions.map((p) => <option key={p.id} value={p.id}>{p.title.length > 22 ? p.title.slice(0, 22) + "…" : p.title}</option>)}
                          {activePositions.length === 0 && <option value="">No active positions</option>}
                        </select>
                        {pos?.status !== "active" && pos && (
                          <div style={{ fontSize: 10, color: "#EF4444", marginTop: 3 }}>Position not active</div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 6 }}>
                        {e.editing
                          ? <button onClick={() => setExtracted((prev) => prev.map((x) => x.tempId === e.tempId ? { ...x, editing: false } : x))} style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.22)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "#059669", display: "flex", alignItems: "center" }}><Check size={12} /></button>
                          : <button onClick={() => setExtracted((prev) => prev.map((x) => x.tempId === e.tempId ? { ...x, editing: true } : x))} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "#64748B", display: "flex", alignItems: "center" }}><Edit3 size={12} /></button>
                        }
                        <button onClick={() => setExtracted((prev) => prev.filter((x) => x.tempId !== e.tempId))} style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: "#EF4444", display: "flex", alignItems: "center" }}><Trash2 size={12} /></button>
                      </div>
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
                  Some candidates have low confidence — please verify highlighted fields before adding
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ background: "#fff", borderTop: "1px solid #E2E8F0", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          {hasResults && (
            <button className="btn-primary" onClick={confirmAdd} disabled={selectedCount === 0}>
              <ChevronRight size={15} />
              Add {selectedCount} Candidate{selectedCount !== 1 ? "s" : ""} to Pipeline
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
}
