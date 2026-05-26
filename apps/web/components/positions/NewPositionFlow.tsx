"use client";

import { useState, KeyboardEvent } from "react";
import { useAppStore } from "@/store/appStore";
import {
  X, ChevronRight, ChevronLeft, Check, Plus, Trash2,
  RefreshCw, Loader2, FileText, Upload, Clipboard,
  Mail, AlertCircle, CheckCircle2, Sparkles,
  ChevronDown, ChevronUp, Edit3,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Types ─────────────────────────────────────────────────────────────────
interface QuestionItem {
  id: string;
  question: string;
  expectedKeyPoints: string[];
  followUp: string;
  difficulty: "basic" | "intermediate" | "advanced";
  techTag: string;
  estimatedMinutes: number;
  approvedByTech?: boolean;
  approvedByHR?: boolean;
  editing?: boolean;
}

interface GeneratedQuestions {
  technicalQuestions:  QuestionItem[];
  scenarioQuestions:   QuestionItem[];
  behavioralQuestions: QuestionItem[];
  eqQuestions:         QuestionItem[];
  whiteboardAssessment: QuestionItem[];
  timeAllocation: { technical: number; scenario: number; behavioral: number; eq: number; whiteboard: number };
}

// ─── Step metadata ──────────────────────────────────────────────────────────
const STEPS = [
  { label: "Basic Info",        short: "Info"       },
  { label: "Tech Context",      short: "Tech"       },
  { label: "Soft Skills",       short: "Skills"     },
  { label: "JD Creation",       short: "JD"         },
  { label: "JD Approval",       short: "Approval"   },
  { label: "Questions",         short: "Questions"  },
  { label: "Dual Approval",     short: "Review"     },
  { label: "Activated",         short: "Done"       },
];

// ─── Helpers ────────────────────────────────────────────────────────────────
const MANAGER_TYPES = ["Team Lead","People Manager","Director","VP","Engineering Manager"];
const SENIOR_TYPES  = ["Director","VP","People Manager","Engineering Manager","Architect"];

function isManagerRole(rt: string)  { return MANAGER_TYPES.includes(rt); }
function isSeniorRole(rt: string)   { return SENIOR_TYPES.includes(rt); }

// ─── Sub-components ─────────────────────────────────────────────────────────
function RadioGroup({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          style={{
            padding: "7px 14px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            border: `1px solid ${value === opt ? "#0EA5E9" : "#E2E8F0"}`,
            background: value === opt ? "rgba(14,165,233,0.08)" : "#F8FAFC",
            color: value === opt ? "#0284C7" : "#475569",
            transition: "all 0.15s",
            fontFamily: "var(--font-sans)",
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 100,
        background: checked ? "#0EA5E9" : "#E2E8F0",
        border: "none", cursor: "pointer", transition: "all 0.2s",
        position: "relative", flexShrink: 0,
        boxShadow: checked ? "0 2px 8px rgba(14,165,233,0.30)" : "none",
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

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput("");
  };
  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
    if (e.key === "Backspace" && !input && tags.length) onChange(tags.slice(0, -1));
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 12px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, minHeight: 44, alignItems: "center" }}>
      {tags.map((t) => (
        <span key={t} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(14,165,233,0.10)", border: "1px solid rgba(14,165,233,0.22)", color: "#0284C7", fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 100, fontFamily: "var(--font-mono)" }}>
          {t}
          <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} style={{ background: "none", border: "none", cursor: "pointer", color: "#0284C7", padding: 0, lineHeight: 1, fontSize: 14 }}>×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={add}
        placeholder={tags.length === 0 ? placeholder : ""}
        style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, color: "#0F2147", flex: 1, minWidth: 120, fontFamily: "var(--font-sans)" }}
      />
    </div>
  );
}

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{label}</label>
      {hint && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <FieldLabel label={label} hint={hint} />
      {children}
    </div>
  );
}

const SELECT_STYLE: React.CSSProperties = {
  background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8,
  padding: "10px 14px", fontSize: 13, color: "#0F2147", fontFamily: "var(--font-sans)",
  cursor: "pointer", outline: "none", width: "100%", fontWeight: 500,
};

function SliderField({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (v: number) => void }) {
  const color = value >= 70 ? "#10B981" : value >= 40 ? "#0EA5E9" : "#94A3B8";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{label}</label>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 800, color: "#0F2147" }}>{value}</span>
      </div>
      <input
        type="range" min={0} max={100} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: color, cursor: "pointer" }}
      />
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ height: 4, flex: 1, borderRadius: 2, background: "#E2E8F0", overflow: "hidden", marginRight: 8, alignSelf: "center" }}>
          <div style={{ height: "100%", width: `${value}%`, background: color, borderRadius: 2, transition: "width 0.2s" }} />
        </div>
      </div>
      <p style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.5 }}>{hint}</p>
    </div>
  );
}

function DiffBadge({ diff }: { diff: string }) {
  const cfg: Record<string, { color: string; bg: string }> = {
    basic:        { color: "#10B981", bg: "rgba(16,185,129,0.08)" },
    intermediate: { color: "#0EA5E9", bg: "rgba(14,165,233,0.08)" },
    advanced:     { color: "#8B5CF6", bg: "rgba(139,92,246,0.08)" },
  };
  const c = cfg[diff] ?? cfg.intermediate;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color: c.color, background: c.bg, padding: "2px 8px", borderRadius: 100, whiteSpace: "nowrap" }}>
      {diff.charAt(0).toUpperCase() + diff.slice(1)}
    </span>
  );
}

function QuestionCard({
  q, onApprove, onRemove, onEdit, approveLabel, approved,
}: {
  q: QuestionItem;
  onApprove: () => void;
  onRemove: () => void;
  onEdit: (updated: QuestionItem) => void;
  approveLabel: string;
  approved: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing]   = useState(false);
  const [editText, setEditText] = useState(q.question);

  const saveEdit = () => {
    onEdit({ ...q, question: editText });
    setEditing(false);
  };

  return (
    <div style={{
      background: approved ? "rgba(16,185,129,0.03)" : "#fff",
      border: `1px solid ${approved ? "rgba(16,185,129,0.25)" : "#E2E8F0"}`,
      borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10,
      transition: "all 0.15s",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1 }}>
          {editing ? (
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #0EA5E9", fontSize: 13, color: "#0F2147", fontFamily: "var(--font-sans)", resize: "vertical", outline: "none", minHeight: 80 }}
              autoFocus
            />
          ) : (
            <p style={{ fontSize: 13, color: "#0F2147", lineHeight: 1.55, fontWeight: 500, margin: 0 }}>{q.question}</p>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <DiffBadge diff={q.difficulty} />
          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#94A3B8", background: "#F1F5F9", padding: "2px 7px", borderRadius: 100, border: "1px solid #E2E8F0" }}>
            {q.estimatedMinutes}m
          </span>
        </div>
      </div>

      {/* Tech tag + action row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#0284C7", background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.18)", padding: "2px 8px", borderRadius: 4 }}>
            {q.techTag}
          </span>
          <button type="button" onClick={() => setExpanded(!expanded)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", fontSize: 11, display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font-sans)" }}>
            Key points {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {editing ? (
            <>
              <button type="button" onClick={saveEdit} className="btn-primary" style={{ fontSize: 11, padding: "5px 10px" }}>Save</button>
              <button type="button" onClick={() => { setEditing(false); setEditText(q.question); }} className="btn-ghost" style={{ fontSize: 11, padding: "5px 10px" }}>Cancel</button>
            </>
          ) : (
            <>
              <button
                type="button" onClick={onApprove}
                style={{
                  padding: "5px 12px", fontSize: 11, fontWeight: 700, borderRadius: 7, cursor: "pointer", border: "none",
                  background: approved ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.08)",
                  color: approved ? "#059669" : "#10B981",
                  display: "flex", alignItems: "center", gap: 4,
                  fontFamily: "var(--font-sans)",
                }}
              >
                <Check size={11} /> {approved ? "Approved" : approveLabel}
              </button>
              <button type="button" onClick={() => setEditing(true)} style={{ padding: "5px 8px", fontSize: 11, borderRadius: 7, cursor: "pointer", border: "1px solid #E2E8F0", background: "#F8FAFC", color: "#64748B", fontFamily: "var(--font-sans)" }}>
                <Edit3 size={11} />
              </button>
              <button type="button" onClick={onRemove} style={{ padding: "5px 8px", fontSize: 11, borderRadius: 7, cursor: "pointer", border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.06)", color: "#EF4444", fontFamily: "var(--font-sans)" }}>
                <Trash2 size={11} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expanded: key points + follow-up */}
      {expanded && (
        <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Expected Key Points</p>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {q.expectedKeyPoints.map((pt, i) => (
                <li key={i} style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>{pt}</li>
              ))}
            </ul>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Follow-up</p>
            <p style={{ fontSize: 12, color: "#475569", fontStyle: "italic", lineHeight: 1.5 }}>&ldquo;{q.followUp}&rdquo;</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function NewPositionFlow({ onClose }: { onClose: () => void }) {
  const { addPosition } = useAppStore();
  const [step, setStep] = useState(0);

  // Step 1 — Basic Info
  const [positionTitle,          setPositionTitle]          = useState("");
  const [company,                setCompany]                = useState("");
  const [department,             setDepartment]             = useState("");
  const [roleType,               setRoleType]               = useState("Individual Contributor");
  const [experienceLevel,        setExperienceLevel]        = useState("5–8 years");
  const [teamSize,               setTeamSize]               = useState("2–5");
  const [hasBudgetOwnership,     setHasBudgetOwnership]     = useState(false);
  const [hasHiringResponsibility,setHasHiringResponsibility]= useState(false);
  const [interviewDuration,      setInterviewDuration]      = useState("30");

  // Step 2 — Tech Context
  const [primaryDomain,  setPrimaryDomain]  = useState("Backend Engineering");
  const [mustHaveTech,   setMustHaveTech]   = useState<string[]>([]);
  const [niceToHaveTech, setNiceToHaveTech] = useState<string[]>([]);
  const [domainContext,  setDomainContext]  = useState("Fintech");
  const [companyStage,   setCompanyStage]   = useState("Growth Stage");
  const [workMode,       setWorkMode]       = useState("Hands-on (writes code/does the work)");
  const [isNewRole,      setIsNewRole]      = useState("New Role");
  const [redFlags,       setRedFlags]       = useState("");

  // Step 3 — Soft Skills
  const [weights, setWeights] = useState({ technical: 70, leadership: 50, communication: 60, problemSolving: 65, cultureFit: 55 });
  const [interviewStyle,      setInterviewStyle]      = useState("Structured");
  const [behavioralFramework, setBehavioralFramework] = useState("STAR method");

  // Step 4 — JD
  const [jdTab,        setJdTab]        = useState<"generate" | "paste" | "upload">("generate");
  const [generatedJD,  setGeneratedJD]  = useState("");
  const [pastedJD,     setPastedJD]     = useState("");
  const [jdLoading,    setJdLoading]    = useState(false);
  const [jdWordCount,  setJdWordCount]  = useState(0);

  // Step 5 — JD Approval
  const [techLeadEmail,    setTechLeadEmail]    = useState("tech@interviewcentral.ai");
  const [jdSent,           setJdSent]           = useState(false);
  const [jdApproved,       setJdApproved]       = useState(false);
  const [approvedAt,       setApprovedAt]       = useState("");

  // Step 6 — Question Generation
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questions,        setQuestions]        = useState<GeneratedQuestions | null>(null);

  // Step 7 — Dual Approval
  const [reviewTab, setReviewTab] = useState<"tech" | "hr">("tech");

  // Derived
  const finalJD = jdTab === "generate" ? generatedJD : pastedJD;

  // ── Navigation ─────────────────────────────────────────────────────────
  const canContinue = () => {
    if (step === 0) return positionTitle.trim() !== "" && company.trim() !== "";
    if (step === 3) return finalJD.trim().length > 50;
    if (step === 4) return jdApproved;
    if (step === 5) return questions !== null;
    if (step === 6) {
      if (!questions) return false;
      const allTech = [...(questions.technicalQuestions ?? []), ...(questions.scenarioQuestions ?? []), ...(questions.whiteboardAssessment ?? [])];
      const allHR   = [...(questions.behavioralQuestions ?? []), ...(questions.eqQuestions ?? [])];
      return allTech.every((q) => q.approvedByTech) && allHR.every((q) => q.approvedByHR);
    }
    return true;
  };

  const next = () => {
    if (step === 5 && !questions) { generateQuestions(); return; }
    if (canContinue()) setStep((s) => Math.min(s + 1, 7));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  // ── API calls ──────────────────────────────────────────────────────────
  const generateJD = async () => {
    setJdLoading(true);
    try {
      const res = await fetch("/api/generate-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionTitle, company, department, roleType, experienceLevel,
          teamSize, hasBudgetOwnership, hasHiringResponsibility, interviewDuration,
          primaryDomain, mustHaveTech, niceToHaveTech, domainContext, companyStage,
          workMode, isNewRole, redFlags, weights, interviewStyle, behavioralFramework,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGeneratedJD(data.jd);
      setJdWordCount(data.wordCount ?? 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate JD";
      toast.error(msg);
    } finally {
      setJdLoading(false);
    }
  };

  const generateQuestions = async () => {
    setQuestionsLoading(true);
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionTitle, company, experienceLevel, roleType,
          primaryDomain, mustHaveTech, niceToHaveTech, domainContext,
          workMode, weights, interviewStyle, behavioralFramework,
          interviewDuration, redFlags, approvedJD: finalJD,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setQuestions(data.questions);
      setStep(6);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate questions";
      toast.error(msg);
    } finally {
      setQuestionsLoading(false);
    }
  };

  // ── Dual approval helpers ──────────────────────────────────────────────
  const updateQuestion = (
    section: keyof Omit<GeneratedQuestions, "timeAllocation">,
    id: string,
    patch: Partial<QuestionItem>,
  ) => {
    if (!questions) return;
    setQuestions({
      ...questions,
      [section]: (questions[section] as QuestionItem[]).map((q) =>
        q.id === id ? { ...q, ...patch } : q
      ),
    });
  };

  const removeQuestion = (section: keyof Omit<GeneratedQuestions, "timeAllocation">, id: string) => {
    if (!questions) return;
    setQuestions({ ...questions, [section]: (questions[section] as QuestionItem[]).filter((q) => q.id !== id) });
  };

  const approveAllTech = () => {
    if (!questions) return;
    const patch = (arr: QuestionItem[]) => arr.map((q) => ({ ...q, approvedByTech: true }));
    setQuestions({
      ...questions,
      technicalQuestions:   patch(questions.technicalQuestions),
      scenarioQuestions:    patch(questions.scenarioQuestions),
      whiteboardAssessment: patch(questions.whiteboardAssessment),
    });
  };
  const approveAllHR = () => {
    if (!questions) return;
    const patch = (arr: QuestionItem[]) => arr.map((q) => ({ ...q, approvedByHR: true }));
    setQuestions({
      ...questions,
      behavioralQuestions: patch(questions.behavioralQuestions),
      eqQuestions:         patch(questions.eqQuestions),
    });
  };

  // ── Activation ────────────────────────────────────────────────────────
  const activatePosition = () => {
    const id = `p${Date.now()}`;
    addPosition({
      id,
      title: positionTitle,
      company,
      department,
      experienceLevel,
      techStack: mustHaveTech,
      status: "active",
      interviewsScheduled: 0,
      interviewsCompleted: 0,
      createdAt: new Date().toISOString().split("T")[0],
      approvals: { techLead: true, hr: true },
    });
    setStep(7);
  };

  // ── Totals for step 7 gate ─────────────────────────────────────────────
  const techTotal = questions ? (questions.technicalQuestions.length + questions.scenarioQuestions.length + questions.whiteboardAssessment.length) : 0;
  const techApproved = questions ? ([...questions.technicalQuestions, ...questions.scenarioQuestions, ...questions.whiteboardAssessment].filter((q) => q.approvedByTech).length) : 0;
  const hrTotal    = questions ? (questions.behavioralQuestions.length + questions.eqQuestions.length) : 0;
  const hrApproved = questions ? ([...questions.behavioralQuestions, ...questions.eqQuestions].filter((q) => q.approvedByHR).length) : 0;
  const allApproved = techTotal > 0 && hrTotal > 0 && techApproved === techTotal && hrApproved === hrTotal;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "#FAFAFA",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* ── Top bar ── */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #E2E8F0",
        padding: "0 32px", height: 60, display: "flex", alignItems: "center",
        justifyContent: "space-between", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, #0F2147, #0EA5E9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={14} color="#fff" />
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "#0F2147" }}>
            New Position Setup
          </span>
        </div>
        <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 6, borderRadius: 8, display: "flex", alignItems: "center" }}>
          <X size={20} />
        </button>
      </div>

      {/* ── Stepper ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E2E8F0", padding: "16px 32px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, maxWidth: 960, margin: "0 auto" }}>
          {STEPS.map((s, i) => {
            const done    = i < step;
            const current = i === step;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0,
                    background: done ? "#10B981" : current ? "#0EA5E9" : "#F1F5F9",
                    color: done || current ? "#fff" : "#94A3B8",
                    border: current ? "2px solid rgba(14,165,233,0.3)" : "none",
                    boxShadow: current ? "0 0 0 3px rgba(14,165,233,0.12)" : "none",
                    transition: "all 0.2s",
                  }}>
                    {done ? <Check size={12} /> : i + 1}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: current ? 700 : 500, color: current ? "#0F2147" : done ? "#10B981" : "#94A3B8", whiteSpace: "nowrap", display: window.innerWidth < 900 ? "none" : undefined }}>
                    {s.short}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, margin: "0 8px", background: done ? "#10B981" : "#E2E8F0", transition: "background 0.3s" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* ── STEP 0: Basic Info ── */}
          {step === 0 && (
            <>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#0F2147" }}>Basic Position Info</h2>
                <p style={{ fontSize: 14, color: "#94A3B8", marginTop: 4 }}>Tell us about the role you&apos;re hiring for.</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Position Title *">
                  <input className="input" placeholder="e.g. Senior Java Engineer" value={positionTitle} onChange={(e) => setPositionTitle(e.target.value)} />
                </Field>
                <Field label="Company Name *">
                  <input className="input" placeholder="e.g. FinEdge Technologies" value={company} onChange={(e) => setCompany(e.target.value)} />
                </Field>
                <Field label="Department">
                  <input className="input" placeholder="e.g. Engineering, Product" value={department} onChange={(e) => setDepartment(e.target.value)} />
                </Field>
                <Field label="Role Type">
                  <select style={SELECT_STYLE} value={roleType} onChange={(e) => setRoleType(e.target.value)}>
                    {["Individual Contributor","Team Lead","People Manager","Architect","Director","VP","Product Manager","Engineering Manager"].map((r) => <option key={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="Experience Level">
                  <select style={SELECT_STYLE} value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)}>
                    {["0–2 years","2–5 years","5–8 years","8–12 years","12–18 years","18+ years"].map((r) => <option key={r}>{r}</option>)}
                  </select>
                </Field>
                {isManagerRole(roleType) && (
                  <Field label="Team Size to Manage">
                    <select style={SELECT_STYLE} value={teamSize} onChange={(e) => setTeamSize(e.target.value)}>
                      {["No direct reports","2–5","6–15","15+"].map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </Field>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {isSeniorRole(roleType) && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0F2147" }}>Budget Ownership</div>
                      <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>This role manages a budget</div>
                    </div>
                    <Toggle checked={hasBudgetOwnership} onChange={setHasBudgetOwnership} />
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0F2147" }}>Hiring Responsibility</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>This role participates in hiring decisions</div>
                  </div>
                  <Toggle checked={hasHiringResponsibility} onChange={setHasHiringResponsibility} />
                </div>
              </div>

              <Field label="Interview Duration">
                <RadioGroup options={["30 minutes","45 minutes"]} value={`${interviewDuration} minutes`} onChange={(v) => setInterviewDuration(v.replace(" minutes",""))} />
              </Field>
            </>
          )}

          {/* ── STEP 1: Tech Context ── */}
          {step === 1 && (
            <>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#0F2147" }}>Technical & Domain Context</h2>
                <p style={{ fontSize: 14, color: "#94A3B8", marginTop: 4 }}>Help us understand the technical and business environment.</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Primary Domain">
                  <select style={SELECT_STYLE} value={primaryDomain} onChange={(e) => setPrimaryDomain(e.target.value)}>
                    {["Backend Engineering","Frontend Engineering","Fullstack","Data Engineering","Data Science","ML/AI","Infrastructure/DevOps","Security","Mobile","Product Management","Engineering Management","IT Risk & Compliance","Business Intelligence","Other"].map((r) => <option key={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="Domain Context (Industry)">
                  <select style={SELECT_STYLE} value={domainContext} onChange={(e) => setDomainContext(e.target.value)}>
                    {["Fintech","Healthtech","Ecommerce","SaaS","Enterprise IT","Edtech","Logistics","Gaming","Other"].map((r) => <option key={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="Company Stage">
                  <select style={SELECT_STYLE} value={companyStage} onChange={(e) => setCompanyStage(e.target.value)}>
                    {["Early Startup","Growth Stage","Scale-up","Large Enterprise","Public Company"].map((r) => <option key={r}>{r}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Must-Have Technologies" hint="Type and press Enter to add tags">
                <TagInput tags={mustHaveTech} onChange={setMustHaveTech} placeholder="e.g. Java, Spring Boot, Kafka…" />
              </Field>

              <Field label="Nice-to-Have Technologies" hint="Optional — type and press Enter">
                <TagInput tags={niceToHaveTech} onChange={setNiceToHaveTech} placeholder="e.g. Kubernetes, Terraform…" />
              </Field>

              <Field label="Work Mode">
                <RadioGroup
                  options={["Hands-on (writes code/does the work)","Hybrid (leads + contributes)","Oversight (leads, does not execute)"]}
                  value={workMode}
                  onChange={setWorkMode}
                />
              </Field>

              <Field label="Role type">
                <RadioGroup options={["New Role","Backfill"]} value={isNewRole} onChange={setIsNewRole} />
              </Field>

              <Field label="Specific gaps or red flags to probe (optional)" hint="e.g. Last 3 people in this role struggled with cross-functional communication">
                <textarea
                  className="input"
                  placeholder="Leave blank if none"
                  value={redFlags}
                  onChange={(e) => setRedFlags(e.target.value)}
                  style={{ resize: "vertical", minHeight: 80 }}
                />
              </Field>
            </>
          )}

          {/* ── STEP 2: Soft Skills ── */}
          {step === 2 && (
            <>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#0F2147" }}>Soft Skill Weightage</h2>
                <p style={{ fontSize: 14, color: "#94A3B8", marginTop: 4 }}>Calibrate how Claude weights each dimension when generating questions and scoring.</p>
              </div>

              <div className="card" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <SliderField label="Technical Depth" hint="Influences the number of technical deep-dive questions and coding exercises." value={weights.technical} onChange={(v) => setWeights({ ...weights, technical: v })} />
                <div style={{ height: 1, background: "#F1F5F9" }} />
                <SliderField label="Leadership & People Skills" hint="Shapes team-building, conflict resolution, and org design questions." value={weights.leadership} onChange={(v) => setWeights({ ...weights, leadership: v })} />
                <div style={{ height: 1, background: "#F1F5F9" }} />
                <SliderField label="Communication & Stakeholder Management" hint="Drives questions on cross-functional alignment, exec communication, and presentations." value={weights.communication} onChange={(v) => setWeights({ ...weights, communication: v })} />
                <div style={{ height: 1, background: "#F1F5F9" }} />
                <SliderField label="Problem Solving & Judgment" hint="Influences ambiguity handling, trade-off reasoning, and scenario design." value={weights.problemSolving} onChange={(v) => setWeights({ ...weights, problemSolving: v })} />
                <div style={{ height: 1, background: "#F1F5F9" }} />
                <SliderField label="Culture Fit & Adaptability" hint="Shapes questions around values alignment, change management, and growth mindset." value={weights.cultureFit} onChange={(v) => setWeights({ ...weights, cultureFit: v })} />
              </div>

              <Field label="Interview Style">
                <RadioGroup options={["Conversational","Structured","Pressure test"]} value={interviewStyle} onChange={setInterviewStyle} />
              </Field>
              <Field label="Behavioral Framework">
                <RadioGroup options={["STAR method","Situational","Free-form"]} value={behavioralFramework} onChange={setBehavioralFramework} />
              </Field>
            </>
          )}

          {/* ── STEP 3: JD Creation ── */}
          {step === 3 && (
            <>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#0F2147" }}>Job Description</h2>
                <p style={{ fontSize: 14, color: "#94A3B8", marginTop: 4 }}>Generate, paste, or upload your job description.</p>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 0, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 4 }}>
                {(["generate","paste","upload"] as const).map((t) => (
                  <button
                    key={t} type="button"
                    disabled={t === "upload"}
                    onClick={() => setJdTab(t)}
                    style={{
                      flex: 1, padding: "8px 16px", borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: t === "upload" ? "not-allowed" : "pointer",
                      border: "none", fontFamily: "var(--font-sans)",
                      background: jdTab === t ? "#fff" : "transparent",
                      color: t === "upload" ? "#CBD5E1" : jdTab === t ? "#0F2147" : "#94A3B8",
                      boxShadow: jdTab === t ? "0 1px 3px rgba(15,33,71,0.08)" : "none",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      transition: "all 0.15s",
                    }}
                  >
                    {t === "generate" && <Sparkles size={13} />}
                    {t === "paste"    && <Clipboard size={13} />}
                    {t === "upload"   && <Upload size={13} />}
                    {t === "generate" ? "Generate JD" : t === "paste" ? "Paste Existing" : "Upload JD"}
                    {t === "upload" && <span style={{ fontSize: 10, color: "#CBD5E1", marginLeft: 4 }}>— Coming soon</span>}
                  </button>
                ))}
              </div>

              {/* Tab A — Generate */}
              {jdTab === "generate" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Summary */}
                  <div className="card" style={{ background: "#F8FAFF", border: "1px solid rgba(14,165,233,0.15)" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Input Summary</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, color: "#475569" }}>
                      {[
                        ["Position", positionTitle || "—"],
                        ["Company",  company || "—"],
                        ["Role",     `${roleType} · ${experienceLevel}`],
                        ["Domain",   `${primaryDomain} · ${domainContext}`],
                        ["Work Mode", workMode.split(" ")[0]],
                        ["Tech",     mustHaveTech.slice(0,3).join(", ") || "—"],
                        ["Duration", `${interviewDuration} min`],
                        ["Style",    interviewStyle],
                      ].map(([k,v]) => (
                        <div key={k} style={{ display: "flex", gap: 6 }}>
                          <span style={{ color: "#94A3B8", minWidth: 70 }}>{k}:</span>
                          <span style={{ fontWeight: 600, color: "#0F2147" }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {generatedJD ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: "#94A3B8" }}>{jdWordCount} words</span>
                        <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={generateJD}>
                          <RefreshCw size={13} /> Regenerate
                        </button>
                      </div>
                      <textarea
                        value={generatedJD}
                        onChange={(e) => setGeneratedJD(e.target.value)}
                        style={{
                          width: "100%", padding: "16px", borderRadius: 10, border: "1px solid #E2E8F0",
                          fontSize: 13, color: "#0F2147", fontFamily: "var(--font-sans)",
                          resize: "vertical", outline: "none", lineHeight: 1.65,
                          minHeight: 400, background: "#fff",
                        }}
                      />
                    </>
                  ) : (
                    <button type="button" className="btn-primary" style={{ alignSelf: "flex-start", gap: 8 }} onClick={generateJD} disabled={jdLoading}>
                      {jdLoading ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Claude is drafting your JD…</> : <><Sparkles size={14} /> Generate JD</>}
                    </button>
                  )}
                </div>
              )}

              {/* Tab B — Paste */}
              {jdTab === "paste" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <textarea
                    value={pastedJD}
                    onChange={(e) => setPastedJD(e.target.value)}
                    placeholder="Paste your job description here…"
                    style={{
                      width: "100%", padding: "16px", borderRadius: 10, border: "1px solid #E2E8F0",
                      fontSize: 13, color: "#0F2147", fontFamily: "var(--font-sans)",
                      resize: "vertical", outline: "none", lineHeight: 1.65,
                      minHeight: 360, background: "#fff",
                    }}
                  />
                  {pastedJD.trim().length > 50 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#10B981" }}>
                      <CheckCircle2 size={13} /> JD ready — {pastedJD.trim().split(/\s+/).length} words
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── STEP 4: JD Approval ── */}
          {step === 4 && (
            <>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#0F2147" }}>JD Approval</h2>
                <p style={{ fontSize: 14, color: "#94A3B8", marginTop: 4 }}>Send the job description to your Tech Lead for review.</p>
              </div>

              {/* JD preview */}
              <div className="card" style={{ maxHeight: 300, overflowY: "auto" }}>
                <pre style={{ fontSize: 12, color: "#475569", lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "var(--font-sans)", margin: 0 }}>
                  {finalJD}
                </pre>
              </div>

              {!jdApproved ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <Field label="Tech Lead Email">
                    <div style={{ display: "flex", gap: 10 }}>
                      <input className="input" type="email" value={techLeadEmail} onChange={(e) => setTechLeadEmail(e.target.value)} style={{ flex: 1 }} />
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => { setJdSent(true); toast.success("JD sent to Tech Lead"); }}
                        disabled={jdSent}
                        style={{ flexShrink: 0 }}
                      >
                        <Mail size={14} />
                        {jdSent ? "Sent" : "Send for Approval"}
                      </button>
                    </div>
                  </Field>

                  {jdSent && (
                    <div style={{ padding: "16px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#D97706", fontSize: 13, fontWeight: 600 }}>
                        <AlertCircle size={15} /> Waiting for Tech Lead approval…
                      </div>
                      <button
                        type="button"
                        style={{ alignSelf: "flex-start", padding: "7px 16px", fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: "pointer", border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.08)", color: "#059669", fontFamily: "var(--font-sans)" }}
                        onClick={() => {
                          setJdApproved(true);
                          setApprovedAt(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
                          toast.success("JD approved by Tech Lead!");
                        }}
                      >
                        <Check size={12} style={{ display: "inline", marginRight: 4 }} />
                        Simulate Approval (Demo)
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: "20px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <CheckCircle2 size={20} color="#10B981" />
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#059669" }}>JD Approved</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#64748B" }}>Approved by Tech Lead · {approvedAt}</p>
                  <p style={{ fontSize: 12, color: "#94A3B8" }}>You can now proceed to generate interview questions.</p>
                </div>
              )}
            </>
          )}

          {/* ── STEP 5: Question Generation ── */}
          {step === 5 && (
            <>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#0F2147" }}>Question Generation</h2>
                <p style={{ fontSize: 14, color: "#94A3B8", marginTop: 4 }}>Claude will generate a tailored question bank for this position.</p>
              </div>

              {questionsLoading ? (
                <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
                  <Loader2 size={32} color="#0EA5E9" style={{ animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#0F2147" }}>Generating interview questions…</p>
                  <p style={{ fontSize: 13, color: "#94A3B8", marginTop: 6 }}>Claude is tailoring questions to the approved JD and role context.</p>
                </div>
              ) : questions ? (
                <div className="card" style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.2)", textAlign: "center", padding: "40px 20px" }}>
                  <CheckCircle2 size={36} color="#10B981" style={{ margin: "0 auto 12px" }} />
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#059669" }}>
                    {(questions.technicalQuestions?.length ?? 0) + (questions.scenarioQuestions?.length ?? 0) + (questions.behavioralQuestions?.length ?? 0) + (questions.eqQuestions?.length ?? 0) + (questions.whiteboardAssessment?.length ?? 0)} questions generated
                  </p>
                  <p style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>Click Continue to review and approve questions.</p>
                </div>
              ) : (
                <div className="card" style={{ textAlign: "center", padding: "48px 20px" }}>
                  <FileText size={32} color="#CBD5E1" style={{ margin: "0 auto 16px" }} />
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#0F2147", marginBottom: 6 }}>Ready to generate</p>
                  <p style={{ fontSize: 13, color: "#94A3B8", marginBottom: 20 }}>
                    Based on the approved JD, Claude will create technical, behavioral, scenario, EQ, and whiteboard questions.
                  </p>
                  <button type="button" className="btn-primary" onClick={generateQuestions} disabled={questionsLoading}>
                    <Sparkles size={14} /> Generate Questions
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── STEP 6: Dual Approval ── */}
          {step === 6 && questions && (
            <>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#0F2147" }}>Dual Review & Approval</h2>
                <p style={{ fontSize: 14, color: "#94A3B8", marginTop: 4 }}>Tech Lead reviews technical questions · HR reviews behavioral questions.</p>
              </div>

              {/* Progress bar */}
              <div style={{ display: "flex", gap: 12 }}>
                {[
                  { label: "Tech Lead Review", approved: techApproved, total: techTotal, color: "#0EA5E9" },
                  { label: "HR Review",        approved: hrApproved,   total: hrTotal,   color: "#10B981" },
                ].map((b) => (
                  <div key={b.label} style={{ flex: 1, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, padding: "12px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
                      <span style={{ fontWeight: 600, color: "#475569" }}>{b.label}</span>
                      <span style={{ fontFamily: "var(--font-mono)", color: b.approved === b.total && b.total > 0 ? b.color : "#94A3B8", fontWeight: 700 }}>{b.approved}/{b.total}</span>
                    </div>
                    <div style={{ height: 4, background: "#F1F5F9", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${b.total > 0 ? (b.approved / b.total) * 100 : 0}%`, background: b.color, borderRadius: 2, transition: "width 0.3s" }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Tab switcher */}
              <div style={{ display: "flex", gap: 0, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 4 }}>
                {([["tech","Tech Lead Review"],["hr","HR Review"]] as const).map(([k,l]) => (
                  <button key={k} type="button" onClick={() => setReviewTab(k)}
                    style={{ flex: 1, padding: "8px 16px", borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none", fontFamily: "var(--font-sans)", background: reviewTab === k ? "#fff" : "transparent", color: reviewTab === k ? "#0F2147" : "#94A3B8", boxShadow: reviewTab === k ? "0 1px 3px rgba(15,33,71,0.08)" : "none", transition: "all 0.15s" }}>
                    {l}
                  </button>
                ))}
              </div>

              {/* Tech Lead tab */}
              {reviewTab === "tech" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={approveAllTech}>
                      <Check size={12} /> Approve All
                    </button>
                  </div>
                  {(["technicalQuestions","scenarioQuestions","whiteboardAssessment"] as const).map((section) => {
                    const labels: Record<string, string> = { technicalQuestions: "Technical", scenarioQuestions: "Scenario", whiteboardAssessment: "Whiteboard" };
                    return (
                      <div key={section}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>{labels[section]}</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {questions[section].map((q) => (
                            <QuestionCard
                              key={q.id} q={q} approveLabel="Approve"
                              approved={!!q.approvedByTech}
                              onApprove={() => updateQuestion(section, q.id, { approvedByTech: !q.approvedByTech })}
                              onRemove={() => removeQuestion(section, q.id)}
                              onEdit={(updated) => updateQuestion(section, q.id, updated)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* HR tab */}
              {reviewTab === "hr" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={approveAllHR}>
                      <Check size={12} /> Approve All
                    </button>
                  </div>
                  {(["behavioralQuestions","eqQuestions"] as const).map((section) => {
                    const labels: Record<string, string> = { behavioralQuestions: "Behavioral", eqQuestions: "EQ / Values" };
                    return (
                      <div key={section}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>{labels[section]}</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {questions[section].map((q) => (
                            <QuestionCard
                              key={q.id} q={q} approveLabel="Approve"
                              approved={!!q.approvedByHR}
                              onApprove={() => updateQuestion(section, q.id, { approvedByHR: !q.approvedByHR })}
                              onRemove={() => removeQuestion(section, q.id)}
                              onEdit={(updated) => updateQuestion(section, q.id, updated)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Gate message */}
              {!allApproved && (
                <div style={{ padding: "12px 16px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.22)", borderRadius: 10, fontSize: 12, color: "#D97706", display: "flex", gap: 8, alignItems: "center" }}>
                  <AlertCircle size={14} />
                  {techApproved < techTotal
                    ? `Tech Lead: ${techTotal - techApproved} question${techTotal - techApproved !== 1 ? "s" : ""} pending`
                    : `HR: ${hrTotal - hrApproved} question${hrTotal - hrApproved !== 1 ? "s" : ""} pending`}
                </div>
              )}

              {allApproved && (
                <button type="button" className="btn-navy" style={{ width: "100%", justifyContent: "center", fontSize: 14 }} onClick={activatePosition}>
                  <Sparkles size={15} /> Activate Position
                </button>
              )}
            </>
          )}

          {/* ── STEP 7: Activated ── */}
          {step === 7 && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{
                width: 80, height: 80, borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.06))",
                border: "2px solid rgba(16,185,129,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 24px",
                boxShadow: "0 0 0 8px rgba(16,185,129,0.06)",
              }}>
                <CheckCircle2 size={36} color="#10B981" />
              </div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "#0F2147", marginBottom: 8 }}>
                Position is now ACTIVE
              </h2>
              <p style={{ fontSize: 14, color: "#94A3B8", marginBottom: 28 }}>
                Your position has been created and is ready for candidates.
              </p>

              <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
                {[
                  { label: "Position",  value: positionTitle },
                  { label: "Questions", value: questions ? String((questions.technicalQuestions?.length ?? 0) + (questions.scenarioQuestions?.length ?? 0) + (questions.behavioralQuestions?.length ?? 0) + (questions.eqQuestions?.length ?? 0) + (questions.whiteboardAssessment?.length ?? 0)) : "—" },
                  { label: "Duration",  value: `${interviewDuration} min` },
                  { label: "Tech Stack", value: mustHaveTech.slice(0,2).join(", ") || "—" },
                ].map((s) => (
                  <div key={s.label} style={{ padding: "14px 20px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, minWidth: 120 }}>
                    <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0F2147" }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    toast.success("Candidate upload coming soon");
                    onClose();
                  }}
                >
                  <Plus size={15} /> Upload Candidates
                </button>
                <button type="button" className="btn-ghost" onClick={onClose}>
                  Back to Positions
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom nav ── */}
      {step < 7 && (
        <div style={{
          background: "#fff", borderTop: "1px solid #E2E8F0",
          padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={back}
            disabled={step === 0}
            style={{ opacity: step === 0 ? 0.4 : 1 }}
          >
            <ChevronLeft size={15} /> Back
          </button>

          <span style={{ fontSize: 12, color: "#94A3B8", fontFamily: "var(--font-mono)" }}>
            Step {step + 1} of {STEPS.length}
          </span>

          {step === 6 ? null : (
            <button
              type="button"
              className="btn-primary"
              onClick={next}
              disabled={step === 5 && questionsLoading}
            >
              {step === 5 && questionsLoading
                ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Generating…</>
                : step === 5 && !questions
                ? <><Sparkles size={14} /> Generate Questions</>
                : step === 4 && !jdApproved
                ? "Awaiting Approval…"
                : <>{step === 3 && finalJD.length < 50 ? "Add JD to continue" : "Continue"} <ChevronRight size={15} /></>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
