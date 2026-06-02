"use client";

import { useState, KeyboardEvent } from "react";
import { useAppStore } from "@/store/appStore";
import {
  X, ChevronRight, ChevronLeft, Check, Plus, Trash2,
  RefreshCw, Loader2, FileText, Upload, Clipboard,
  Mail, AlertCircle, CheckCircle2, Sparkles,
  ChevronDown, ChevronUp, Edit3, Play, Search,
} from "lucide-react";
import toast from "react-hot-toast";
import { VOICE_OPTIONS } from "@/lib/voiceOptions";

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
  isNew?: boolean;
  isReplacement?: boolean;
}

interface GeneratedQuestions {
  technicalQuestions:   QuestionItem[];
  scenarioQuestions:    QuestionItem[];
  behavioralQuestions:  QuestionItem[];
  eqQuestions:          QuestionItem[];
  whiteboardAssessment: QuestionItem[];
  timeAllocation: { technical: number; scenario: number; behavioral: number; eq: number; whiteboard: number };
}

interface ParsedJD {
  requiredSkills:          string[];
  niceToHaveSkills:        string[];
  experienceLevel:         string;
  roleType:                string;
  primaryDomain:           string;
  keyResponsibilities:     string[];
  technicalRequirements:   string[];
  leadershipRequirements:  string[];
  extractedTechStack:      string[];
  seniorityLevel:          string;
}

// ─── Step metadata ──────────────────────────────────────────────────────────
const STEPS = [
  { label: "Basic Info",    short: "Info"      }, // 0
  { label: "JD Input",      short: "JD"        }, // 1
  { label: "Skills Review", short: "Skills"    }, // 2
  { label: "Settings",      short: "Settings"  }, // 3
  { label: "JD Approval",   short: "Approval"  }, // 4
  { label: "Questions",     short: "Questions" }, // 5
  { label: "Dual Approval", short: "Review"    }, // 6
  { label: "Activated",     short: "Done"      }, // 7
];

// ─── Helpers ────────────────────────────────────────────────────────────────
const MANAGER_TYPES = ["Team Lead","People Manager","Director","VP","Engineering Manager"];
const SENIOR_TYPES  = ["Director","VP","People Manager","Engineering Manager","Architect"];
function isManagerRole(rt: string) { return MANAGER_TYPES.includes(rt); }
function isSeniorRole(rt: string)  { return SENIOR_TYPES.includes(rt); }

// ─── Sub-components ─────────────────────────────────────────────────────────
function RadioGroup({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => (
        <button key={opt} type="button" onClick={() => onChange(opt)} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", border: `1px solid ${value === opt ? "#7C3AED" : "#E2E8F0"}`, background: value === opt ? "rgba(124,58,237,0.08)" : "#F8FAFC", color: value === opt ? "#6D28D9" : "#475569", transition: "all 0.15s", fontFamily: "var(--font-sans)" }}>
          {opt}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} style={{ width: 44, height: 24, borderRadius: 100, background: checked ? "#7C3AED" : "#E2E8F0", border: "none", cursor: "pointer", transition: "all 0.2s", position: "relative", flexShrink: 0, boxShadow: checked ? "0 2px 8px rgba(124,58,237,0.30)" : "none" }}>
      <div style={{ position: "absolute", top: 3, left: checked ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }} />
    </button>
  );
}

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState("");
  const add = () => { const v = input.trim(); if (v && !tags.includes(v)) onChange([...tags, v]); setInput(""); };
  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
    if (e.key === "Backspace" && !input && tags.length) onChange(tags.slice(0, -1));
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 12px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, minHeight: 44, alignItems: "center" }}>
      {tags.map((t) => (
        <span key={t} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(124,58,237,0.10)", border: "1px solid rgba(124,58,237,0.22)", color: "#6D28D9", fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 100, fontFamily: "var(--font-mono)" }}>
          {t}
          <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} style={{ background: "none", border: "none", cursor: "pointer", color: "#6D28D9", padding: 0, lineHeight: 1, fontSize: 14 }}>×</button>
        </span>
      ))}
      <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} onBlur={add} placeholder={tags.length === 0 ? placeholder : ""} style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, color: "#4F46E5", flex: 1, minWidth: 120, fontFamily: "var(--font-sans)" }} />
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
  padding: "10px 14px", fontSize: 13, color: "#4F46E5", fontFamily: "var(--font-sans)",
  cursor: "pointer", outline: "none", width: "100%", fontWeight: 500,
};

function SliderField({ label, hint, value, onChange, color }: { label: string; hint: string; value: number; onChange: (v: number) => void; color?: string }) {
  const c = color ?? (value >= 70 ? "#10B981" : value >= 40 ? "#7C3AED" : "#94A3B8");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{label}</label>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 800, color: "#4F46E5" }}>{value}%</span>
      </div>
      <input type="range" min={0} max={100} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", accentColor: c, cursor: "pointer" }} />
      {hint && <p style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.5, margin: 0 }}>{hint}</p>}
    </div>
  );
}

function DiffBadge({ diff }: { diff: string }) {
  const cfg: Record<string, { color: string; bg: string }> = {
    basic:        { color: "#10B981", bg: "rgba(16,185,129,0.08)" },
    intermediate: { color: "#7C3AED", bg: "rgba(124,58,237,0.08)" },
    advanced:     { color: "#8B5CF6", bg: "rgba(139,92,246,0.08)" },
  };
  const c = cfg[diff] ?? cfg.intermediate;
  return <span style={{ fontSize: 10, fontWeight: 700, color: c.color, background: c.bg, padding: "2px 8px", borderRadius: 100, whiteSpace: "nowrap" }}>{diff.charAt(0).toUpperCase() + diff.slice(1)}</span>;
}

function QuestionCard({ q, onApprove, onRemove, onEdit, onReplace, approveLabel, approved, isReplacing }: {
  q: QuestionItem; onApprove: () => void; onRemove: () => void; onEdit: (updated: QuestionItem) => void;
  onReplace?: () => void; approveLabel: string; approved: boolean; isReplacing?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing]   = useState(false);
  const [editText, setEditText] = useState(q.question);
  const saveEdit = () => { onEdit({ ...q, question: editText }); setEditing(false); };
  return (
    <div style={{ background: approved ? "rgba(16,185,129,0.03)" : "#fff", border: `1px solid ${approved ? "rgba(16,185,129,0.22)" : "#E2E8F0"}`, borderLeft: `3px solid ${approved ? "#10B981" : "#CBD5E1"}`, borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, transition: "all 0.15s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
        {q.isNew && <span style={{ fontSize: 9, fontWeight: 800, color: "#fff", background: "#7C3AED", padding: "2px 7px", borderRadius: 100, letterSpacing: "0.04em", textTransform: "uppercase" }}>New</span>}
        {q.isReplacement && !q.isNew && <span style={{ fontSize: 9, fontWeight: 800, color: "#fff", background: "#8B5CF6", padding: "2px 7px", borderRadius: 100, letterSpacing: "0.04em", textTransform: "uppercase" }}>Replaced</span>}
        {approved && <span style={{ fontSize: 9, fontWeight: 800, color: "#059669", background: "rgba(16,185,129,0.10)", padding: "2px 7px", borderRadius: 100, letterSpacing: "0.04em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 3 }}><Check size={8} /> Approved</span>}
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1 }}>
          {editing ? (
            <textarea value={editText} onChange={(e) => setEditText(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #7C3AED", fontSize: 13, color: "#4F46E5", fontFamily: "var(--font-sans)", resize: "vertical", outline: "none", minHeight: 80 }} autoFocus />
          ) : (
            <p style={{ fontSize: 13, color: "#4F46E5", lineHeight: 1.55, fontWeight: 500, margin: 0 }}>{q.question}</p>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <DiffBadge diff={q.difficulty} />
          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#94A3B8", background: "#F1F5F9", padding: "2px 7px", borderRadius: 100, border: "1px solid #E2E8F0" }}>{q.estimatedMinutes}m</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "#6D28D9", background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.18)", padding: "2px 8px", borderRadius: 4 }}>{q.techTag}</span>
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
              <button type="button" onClick={onApprove} style={{ padding: "5px 12px", fontSize: 11, fontWeight: 700, borderRadius: 7, cursor: "pointer", border: "none", background: approved ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.08)", color: approved ? "#059669" : "#10B981", display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font-sans)" }}>
                <Check size={11} /> {approved ? "Approved" : approveLabel}
              </button>
              <button type="button" onClick={() => setEditing(true)} style={{ padding: "5px 8px", fontSize: 11, borderRadius: 7, cursor: "pointer", border: "1px solid #E2E8F0", background: "#F8FAFC", color: "#64748B", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", gap: 4 }}><Edit3 size={11} /></button>
              {onReplace && (
                <button type="button" onClick={onReplace} disabled={isReplacing} style={{ padding: "5px 8px", fontSize: 11, borderRadius: 7, cursor: isReplacing ? "not-allowed" : "pointer", border: "1px solid rgba(139,92,246,0.25)", background: "rgba(139,92,246,0.06)", color: "#7C3AED", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", gap: 4, opacity: isReplacing ? 0.6 : 1 }}>
                  {isReplacing ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={11} />}
                </button>
              )}
              <button type="button" onClick={onRemove} style={{ padding: "5px 8px", fontSize: 11, borderRadius: 7, cursor: "pointer", border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.06)", color: "#EF4444", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", gap: 4 }}><Trash2 size={11} /></button>
            </>
          )}
        </div>
      </div>
      {expanded && (
        <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Expected Key Points</p>
            <ul style={{ margin: 0, paddingLeft: 16 }}>{q.expectedKeyPoints.map((pt, i) => <li key={i} style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>{pt}</li>)}</ul>
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

  // ── Step 0: Basic Info ─────────────────────────────────────────────────
  const [positionTitle,           setPositionTitle]           = useState("");
  const [company,                 setCompany]                 = useState("");
  const [department,              setDepartment]              = useState("");
  const [roleType,                setRoleType]                = useState("Individual Contributor");
  const [experienceLevel,         setExperienceLevel]         = useState("5–8 years");
  const [teamSize,                setTeamSize]                = useState("2–5");
  const [hasBudgetOwnership,      setHasBudgetOwnership]      = useState(false);
  const [hasHiringResponsibility, setHasHiringResponsibility] = useState(false);
  // Contact emails
  const [techLeadEmail,           setTechLeadEmail]           = useState("");
  const [hrEmail,                 setHrEmail]                 = useState("");
  const [clientManagerEmail,      setClientManagerEmail]      = useState("");
  // Voice
  const [voiceAccent,             setVoiceAccent]             = useState<string | null>(null);
  const [previewingVoice,         setPreviewingVoice]         = useState(false);

  // ── Step 1: JD Input ───────────────────────────────────────────────────
  const [jdTab,      setJdTab]      = useState<"paste" | "generate" | "upload">("paste");
  const [pastedJD,   setPastedJD]   = useState("");
  const [generatedJD,setGeneratedJD]= useState("");
  const [jdLoading,  setJdLoading]  = useState(false);
  const [jdWordCount,setJdWordCount]= useState(0);
  const [jdParsing,  setJdParsing]  = useState(false);
  const [jdParsed,   setJdParsed]   = useState(false);
  const [parsedData, setParsedData] = useState<ParsedJD | null>(null);
  // JD generate tab local inputs
  const [genDomain,  setGenDomain]  = useState("Backend Engineering");
  const [genKeys,    setGenKeys]    = useState<string[]>([]);

  // ── Step 2: Skills Review ─────────────────────────────────────────────
  const [mustHaveTech,    setMustHaveTech]    = useState<string[]>([]);
  const [niceToHaveTech,  setNiceToHaveTech]  = useState<string[]>([]);
  const [primaryDomain,   setPrimaryDomain]   = useState("Backend Engineering");
  const [domainContext,   setDomainContext]   = useState("Fintech");
  const [companyStage,    setCompanyStage]    = useState("Growth Stage");
  const [workMode,        setWorkMode]        = useState("Hands-on (writes code/does the work)");
  const [isNewRole,       setIsNewRole]       = useState("New Role");
  const [redFlags,        setRedFlags]        = useState("");

  // ── Step 3: Settings ───────────────────────────────────────────────────
  const [weights, setWeights]                 = useState({ technical: 70, leadership: 50, communication: 60, problemSolving: 65, cultureFit: 55 });
  const [interviewStyle,      setInterviewStyle]      = useState("Structured");
  const [behavioralFramework, setBehavioralFramework] = useState("STAR method");
  const [dynamicIntensity,    setDynamicIntensity]    = useState<"light" | "standard" | "deep">("standard");
  const [l2ScoreThreshold,    setL2ScoreThreshold]    = useState(75);
  const [scoringRubric,       setScoringRubric]       = useState({ technical: 40, problemSolving: 30, behavioral: 20, eq: 10 });
  const [rubricApproved,      setRubricApproved]      = useState(false);
  const [sendRubricToClient,  setSendRubricToClient]  = useState(false);

  // ── Step 4: JD Approval ────────────────────────────────────────────────
  const [jdSent,    setJdSent]    = useState(false);
  const [jdApproved,setJdApproved]= useState(false);
  const [approvedAt,setApprovedAt]= useState("");

  // ── Step 5: Questions ──────────────────────────────────────────────────
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questions,        setQuestions]        = useState<GeneratedQuestions | null>(null);

  // ── Step 6: Dual Approval ──────────────────────────────────────────────
  const [reviewTab, setReviewTab] = useState<"tech" | "hr">("tech");
  const [removedQuestionTexts, setRemovedQuestionTexts] = useState<string[]>([]);
  const [replacingIds,  setReplacingIds]  = useState<Record<string, boolean>>({});
  const [generatingMore,setGeneratingMore]= useState<Record<string, boolean>>({});

  // Derived
  const finalJD = jdTab === "generate" ? generatedJD : pastedJD;

  // Rubric total
  const rubricTotal = scoringRubric.technical + scoringRubric.problemSolving + scoringRubric.behavioral + scoringRubric.eq;

  // ── Canary ────────────────────────────────────────────────────────────
  const canContinue = () => {
    if (step === 0) return positionTitle.trim() !== "" && company.trim() !== "";
    if (step === 1) return finalJD.trim().length > 50;
    if (step === 2) return true; // skills always passable
    if (step === 3) return true;
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

  // ── Parse JD ──────────────────────────────────────────────────────────
  const parseJD = async () => {
    const text = finalJD.trim();
    if (text.length < 50) { toast.error("JD is too short to parse"); return; }
    setJdParsing(true);
    try {
      const res = await fetch("/api/positions/parse-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText: text }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setParsedData(data);
      // Auto-populate step 2
      if (data.requiredSkills?.length)   setMustHaveTech(data.extractedTechStack ?? data.requiredSkills);
      if (data.niceToHaveSkills?.length) setNiceToHaveTech(data.niceToHaveSkills);
      if (data.primaryDomain)            setPrimaryDomain(data.primaryDomain);
      if (data.experienceLevel)          setExperienceLevel(data.experienceLevel);
      if (data.roleType)                 setRoleType(data.roleType);
      setJdParsed(true);
      toast.success("JD parsed — review extracted details in Step 3");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "JD parsing failed");
    } finally {
      setJdParsing(false);
    }
  };

  // ── Generate JD ──────────────────────────────────────────────────────
  const generateJD = async () => {
    setJdLoading(true);
    try {
      const res = await fetch("/api/generate-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionTitle, company, department, roleType, experienceLevel,
          primaryDomain: genDomain, mustHaveTech: genKeys,
          interviewDuration: 30, weights, interviewStyle, behavioralFramework,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGeneratedJD(data.jd);
      setJdWordCount(data.wordCount ?? 0);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate JD");
    } finally {
      setJdLoading(false);
    }
  };

  // ── Generate Questions ────────────────────────────────────────────────
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
          interviewDuration: 30, redFlags, approvedJD: finalJD,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setQuestions(data.questions);
      setStep(6);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate questions");
    } finally {
      setQuestionsLoading(false);
    }
  };

  // ── Dual approval helpers ─────────────────────────────────────────────
  const updateQuestion = (section: keyof Omit<GeneratedQuestions, "timeAllocation">, id: string, patch: Partial<QuestionItem>) => {
    if (!questions) return;
    setQuestions({ ...questions, [section]: (questions[section] as QuestionItem[]).map((q) => q.id === id ? { ...q, ...patch } : q) });
  };
  const removeQuestion = (section: keyof Omit<GeneratedQuestions, "timeAllocation">, id: string) => {
    if (!questions) return;
    const removed = (questions[section] as QuestionItem[]).find((q) => q.id === id);
    if (removed) setRemovedQuestionTexts((prev) => [...prev, removed.question]);
    setQuestions({ ...questions, [section]: (questions[section] as QuestionItem[]).filter((q) => q.id !== id) });
  };
  const replaceQuestion = async (section: keyof Omit<GeneratedQuestions, "timeAllocation">, q: QuestionItem, sectionType: string) => {
    setReplacingIds((prev) => ({ ...prev, [q.id]: true }));
    try {
      const res = await fetch("/api/generate-more-questions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionType, positionTitle, experienceLevel, techStack: mustHaveTech, domainContext, existingQuestionTexts: (questions![section] as QuestionItem[]).filter((x) => x.id !== q.id).map((x) => x.question), removedQuestionTexts: [...removedQuestionTexts, q.question], count: 1 }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const [newQ] = data.questions as QuestionItem[];
      if (!newQ) throw new Error("No replacement received");
      setQuestions((prev) => { if (!prev) return prev; return { ...prev, [section]: (prev[section] as QuestionItem[]).map((x) => x.id === q.id ? { ...newQ, isReplacement: true } : x) }; });
      setRemovedQuestionTexts((prev) => [...prev, q.question]);
      toast.success("Question replaced");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Replace failed");
    } finally {
      setReplacingIds((prev) => { const n = { ...prev }; delete n[q.id]; return n; });
    }
  };
  const generateMoreForSection = async (section: keyof Omit<GeneratedQuestions, "timeAllocation">, sectionType: string) => {
    if (!questions) return;
    setGeneratingMore((prev) => ({ ...prev, [section]: true }));
    try {
      const res = await fetch("/api/generate-more-questions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionType, positionTitle, experienceLevel, techStack: mustHaveTech, domainContext, existingQuestionTexts: (questions[section] as QuestionItem[]).map((x) => x.question), removedQuestionTexts, count: 5 }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const newQs: QuestionItem[] = (data.questions as QuestionItem[]).map((q) => ({ ...q, isNew: true }));
      setQuestions((prev) => { if (!prev) return prev; return { ...prev, [section]: [...(prev[section] as QuestionItem[]), ...newQs] }; });
      toast.success(`${newQs.length} new questions added`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGeneratingMore((prev) => { const n = { ...prev }; delete n[section]; return n; });
    }
  };
  const approveAllTech = () => {
    if (!questions) return;
    const patch = (arr: QuestionItem[]) => arr.map((q) => ({ ...q, approvedByTech: true }));
    setQuestions({ ...questions, technicalQuestions: patch(questions.technicalQuestions), scenarioQuestions: patch(questions.scenarioQuestions), whiteboardAssessment: patch(questions.whiteboardAssessment) });
  };
  const approveAllHR = () => {
    if (!questions) return;
    const patch = (arr: QuestionItem[]) => arr.map((q) => ({ ...q, approvedByHR: true }));
    setQuestions({ ...questions, behavioralQuestions: patch(questions.behavioralQuestions), eqQuestions: patch(questions.eqQuestions) });
  };

  // ── Totals ───────────────────────────────────────────────────────────
  const techTotal    = questions ? (questions.technicalQuestions.length + questions.scenarioQuestions.length + questions.whiteboardAssessment.length) : 0;
  const techApproved = questions ? ([...questions.technicalQuestions, ...questions.scenarioQuestions, ...questions.whiteboardAssessment].filter((q) => q.approvedByTech).length) : 0;
  const hrTotal      = questions ? (questions.behavioralQuestions.length + questions.eqQuestions.length) : 0;
  const hrApproved   = questions ? ([...questions.behavioralQuestions, ...questions.eqQuestions].filter((q) => q.approvedByHR).length) : 0;
  const allApproved  = techTotal > 0 && hrTotal > 0 && techApproved === techTotal && hrApproved === hrTotal;

  // ── Activate ─────────────────────────────────────────────────────────
  const activatePosition = async () => {
    if (!questions) return;
    try {
      const posRes = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: positionTitle, company, department, experienceLevel, roleType,
          primaryDomain, techStack: mustHaveTech, goodToHave: niceToHaveTech,
          domainContext, workMode, interviewDuration: 30,
          dynamicIntensity, voiceAccent: voiceAccent ?? "american",
          jdText: finalJD,
          techLeadEmail, hrEmail, clientManagerEmail,
          techLeadApproved: techApproved === techTotal && techTotal > 0,
          hrApproved: hrApproved === hrTotal && hrTotal > 0,
          status: allApproved ? "active" : "pending_approval",
          l2ScoreThreshold, rubricApproved, scoringRubric,
          softSkillWeightage: weights,
        }),
      });
      if (!posRes.ok) { const err = await posRes.json(); throw new Error(err.error ?? "Failed to create position"); }
      const position = await posRes.json();
      await fetch(`/api/positions/${position.id}/questions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technicalQuestions: questions.technicalQuestions, scenarioQuestions: questions.scenarioQuestions,
          behavioralQuestions: questions.behavioralQuestions, eqQuestions: questions.eqQuestions,
          whiteboardQuestions: questions.whiteboardAssessment, timeAllocation: questions.timeAllocation,
          techLeadApproved: techApproved === techTotal && techTotal > 0,
          hrApproved: hrApproved === hrTotal && hrTotal > 0,
        }),
      }).catch(() => console.warn("[activatePosition] Question set save failed"));

      addPosition({
        id: position.id, title: positionTitle, company, department,
        experienceLevel, techStack: mustHaveTech,
        status: allApproved ? "active" : "pending_approval",
        interviewsScheduled: 0, interviewsCompleted: 0,
        createdAt: new Date().toISOString().split("T")[0],
        approvals: { techLead: techApproved === techTotal && techTotal > 0, hr: hrApproved === hrTotal && hrTotal > 0 },
        interviewDuration: 30, dynamicQuestionIntensity: dynamicIntensity,
        voiceAccent: voiceAccent ?? undefined,
      });
      toast.success("Position created and saved!");
      setStep(7);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to activate position");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#FAFAFA", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* ── Top bar ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E2E8F0", padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, #4F46E5, #7C3AED)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={14} color="#fff" />
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "#4F46E5" }}>New Position Setup</span>
        </div>
        <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 6, borderRadius: 8, display: "flex", alignItems: "center" }}><X size={20} /></button>
      </div>

      {/* ── Stepper ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E2E8F0", padding: "16px 32px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, maxWidth: 960, margin: "0 auto" }}>
          {STEPS.map((s, i) => {
            const done = i < step, current = i === step;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, background: done ? "#10B981" : current ? "#7C3AED" : "#F1F5F9", color: done || current ? "#fff" : "#94A3B8", border: current ? "2px solid rgba(124,58,237,0.3)" : "none", boxShadow: current ? "0 0 0 3px rgba(124,58,237,0.12)" : "none", transition: "all 0.2s" }}>
                    {done ? <Check size={12} /> : i + 1}
                  </div>
                  <span className="step-label" style={{ fontSize: 11, fontWeight: current ? 700 : 500, color: current ? "#4F46E5" : done ? "#10B981" : "#94A3B8", whiteSpace: "nowrap" }}>{s.short}</span>
                </div>
                {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, margin: "0 8px", background: done ? "#10B981" : "#E2E8F0", transition: "background 0.3s" }} />}
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
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#4F46E5" }}>Basic Position Info</h2>
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

              {isSeniorRole(roleType) && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8 }}>
                  <div><div style={{ fontSize: 13, fontWeight: 600, color: "#4F46E5" }}>Budget Ownership</div><div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>This role manages a budget</div></div>
                  <Toggle checked={hasBudgetOwnership} onChange={setHasBudgetOwnership} />
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8 }}>
                <div><div style={{ fontSize: 13, fontWeight: 600, color: "#4F46E5" }}>Hiring Responsibility</div><div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>This role participates in hiring decisions</div></div>
                <Toggle checked={hasHiringResponsibility} onChange={setHasHiringResponsibility} />
              </div>

              {/* Contact emails */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Contact Emails</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Field label="Tech Lead Email" hint="For question approval">
                    <input className="input" type="email" placeholder="techteam@client.com" value={techLeadEmail} onChange={(e) => setTechLeadEmail(e.target.value)} />
                  </Field>
                  <Field label="HR Contact Email" hint="For behavioral question approval">
                    <input className="input" type="email" placeholder="hr@client.com" value={hrEmail} onChange={(e) => setHrEmail(e.target.value)} />
                  </Field>
                  <Field label="Client Manager Email" hint="For JD approval">
                    <input className="input" type="email" placeholder="manager@client.com" value={clientManagerEmail} onChange={(e) => setClientManagerEmail(e.target.value)} />
                  </Field>
                </div>
              </div>

              {/* Voice accent */}
              <div>
                <FieldLabel label="Interviewer Voice" hint="Optional — overrides your account default for this position only" />
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "9px 12px", borderRadius: 8, border: `1px solid ${voiceAccent === null ? "rgba(124,58,237,0.30)" : "#E2E8F0"}`, background: voiceAccent === null ? "rgba(124,58,237,0.06)" : "#F8FAFC", transition: "all 0.12s" }}>
                    <input type="radio" name="posVoice" checked={voiceAccent === null} onChange={() => setVoiceAccent(null)} style={{ accentColor: "#7C3AED", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: voiceAccent === null ? "#6D28D9" : "#475569", fontWeight: voiceAccent === null ? 600 : 400 }}>Use account default</span>
                  </label>
                  {VOICE_OPTIONS.map((v) => (
                    <label key={v.key} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "9px 12px", borderRadius: 8, border: `1px solid ${voiceAccent === v.key ? "rgba(124,58,237,0.30)" : "#E2E8F0"}`, background: voiceAccent === v.key ? "rgba(124,58,237,0.06)" : "#F8FAFC", transition: "all 0.12s" }}>
                      <input type="radio" name="posVoice" value={v.key} checked={voiceAccent === v.key} onChange={() => setVoiceAccent(v.key)} style={{ accentColor: "#7C3AED", flexShrink: 0 }} />
                      <span style={{ fontSize: 16 }}>{v.flag}</span>
                      <span style={{ fontSize: 13, color: voiceAccent === v.key ? "#6D28D9" : "#475569", fontWeight: voiceAccent === v.key ? 600 : 400, flex: 1 }}>{v.accent}</span>
                      <span style={{ fontSize: 11, color: "#94A3B8" }}>Interviewer: <strong style={{ color: "#7C3AED" }}>{v.interviewerName}</strong></span>
                      <button type="button" onClick={async (e) => {
                        e.preventDefault(); if (previewingVoice) return; setPreviewingVoice(true);
                        try {
                          const res = await fetch("/api/interview/generate-speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: `Hi, I am ${v.interviewerName}, your AI interviewer for today.`, voiceAccent: v.key }) });
                          if (res.ok) { const buf = await res.arrayBuffer(); new Audio(URL.createObjectURL(new Blob([buf], { type: "audio/mpeg" }))).play(); }
                        } catch {}
                        setPreviewingVoice(false);
                      }} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(124,58,237,0.20)", background: "rgba(124,58,237,0.07)", color: "#7C3AED", fontSize: 11, fontWeight: 600, cursor: previewingVoice ? "wait" : "pointer", fontFamily: "var(--font-sans)", flexShrink: 0 }}>
                        <Play size={10} fill="#7C3AED" /> Preview
                      </button>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── STEP 1: JD Input ── */}
          {step === 1 && (
            <>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#4F46E5" }}>Job Description</h2>
                <p style={{ fontSize: 14, color: "#94A3B8", marginTop: 4 }}>Paste, generate, or upload the JD — we&apos;ll extract skills automatically.</p>
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: 0, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 4 }}>
                {(["paste","generate","upload"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setJdTab(t)} style={{ flex: 1, padding: "8px 16px", borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none", fontFamily: "var(--font-sans)", background: jdTab === t ? "#fff" : "transparent", color: jdTab === t ? "#4F46E5" : "#94A3B8", boxShadow: jdTab === t ? "0 1px 3px rgba(79,70,229,0.08)" : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.15s" }}>
                    {t === "paste" && <Clipboard size={13} />}
                    {t === "generate" && <Sparkles size={13} />}
                    {t === "upload" && <Upload size={13} />}
                    {t === "paste" ? "Paste JD" : t === "generate" ? "Generate JD" : "Upload JD"}
                  </button>
                ))}
              </div>

              {/* TAB A — Paste JD */}
              {jdTab === "paste" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <textarea
                    value={pastedJD}
                    onChange={(e) => { setPastedJD(e.target.value); setJdParsed(false); }}
                    placeholder="Paste your client's job description here…"
                    style={{ width: "100%", padding: "16px", borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 13, color: "#4F46E5", fontFamily: "var(--font-sans)", resize: "vertical", outline: "none", lineHeight: 1.65, minHeight: 360, background: "#fff" }}
                  />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {pastedJD.trim().length > 50 ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748B" }}>
                        <FileText size={13} color="#94A3B8" /> {pastedJD.trim().split(/\s+/).length} words
                      </div>
                    ) : <div />}
                    <button
                      type="button"
                      onClick={parseJD}
                      disabled={jdParsing || pastedJD.trim().length < 50}
                      style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: pastedJD.trim().length < 50 ? "not-allowed" : "pointer", border: "none", background: pastedJD.trim().length < 50 ? "#F1F5F9" : "linear-gradient(135deg, #4F46E5, #7C3AED)", color: pastedJD.trim().length < 50 ? "#94A3B8" : "#fff", fontFamily: "var(--font-sans)", transition: "opacity 0.15s", opacity: jdParsing ? 0.7 : 1 }}
                    >
                      {jdParsing ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Parsing JD…</> : <><Search size={13} /> Parse JD</>}
                    </button>
                  </div>
                  {jdParsed && parsedData && (
                    <div style={{ padding: "14px 16px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.20)", borderRadius: 10, display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <CheckCircle2 size={16} color="#10B981" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginBottom: 4 }}>JD parsed successfully — review extracted details in Step 3</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {parsedData.extractedTechStack?.slice(0, 6).map(t => (
                            <span key={t} style={{ fontSize: 10, fontFamily: "var(--font-mono)", padding: "2px 8px", borderRadius: 4, background: "rgba(16,185,129,0.10)", color: "#059669", border: "1px solid rgba(16,185,129,0.20)" }}>{t}</span>
                          ))}
                          {(parsedData.extractedTechStack?.length ?? 0) > 6 && <span style={{ fontSize: 10, color: "#64748B" }}>+{parsedData.extractedTechStack.length - 6} more</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB B — Generate JD */}
              {jdTab === "generate" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="card" style={{ background: "#F8FAFF", border: "1px solid rgba(124,58,237,0.15)" }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Position Context</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div style={{ fontSize: 12, color: "#475569" }}><span style={{ color: "#94A3B8" }}>Role:</span> <strong style={{ color: "#4F46E5" }}>{positionTitle || "—"}</strong></div>
                      <div style={{ fontSize: 12, color: "#475569" }}><span style={{ color: "#94A3B8" }}>Company:</span> <strong style={{ color: "#4F46E5" }}>{company || "—"}</strong></div>
                      <div style={{ fontSize: 12, color: "#475569" }}><span style={{ color: "#94A3B8" }}>Experience:</span> <strong style={{ color: "#4F46E5" }}>{experienceLevel}</strong></div>
                      <div style={{ fontSize: 12, color: "#475569" }}><span style={{ color: "#94A3B8" }}>Type:</span> <strong style={{ color: "#4F46E5" }}>{roleType}</strong></div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <Field label="Primary Domain">
                      <select style={SELECT_STYLE} value={genDomain} onChange={(e) => setGenDomain(e.target.value)}>
                        {["Backend Engineering","Frontend Engineering","Fullstack","Data Engineering","Data Science","ML/AI","Infrastructure/DevOps","Security","Mobile","Product Management","Engineering Management","Business Intelligence","Other"].map((r) => <option key={r}>{r}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Key Skills" hint="Type and press Enter">
                    <TagInput tags={genKeys} onChange={setGenKeys} placeholder="e.g. Java, Spring Boot, Kafka…" />
                  </Field>
                  {generatedJD ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: "#94A3B8" }}>{jdWordCount} words</span>
                        <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={generateJD}><RefreshCw size={13} /> Regenerate</button>
                      </div>
                      <textarea value={generatedJD} onChange={(e) => setGeneratedJD(e.target.value)} style={{ width: "100%", padding: "16px", borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 13, color: "#4F46E5", fontFamily: "var(--font-sans)", resize: "vertical", outline: "none", lineHeight: 1.65, minHeight: 400, background: "#fff" }} />
                      <div style={{ fontSize: 12, color: "#94A3B8", display: "flex", alignItems: "center", gap: 6 }}>
                        <AlertCircle size={12} /> This JD needs client approval before interviews begin
                      </div>
                    </>
                  ) : (
                    <button type="button" className="btn-primary" style={{ alignSelf: "flex-start", gap: 8 }} onClick={generateJD} disabled={jdLoading}>
                      {jdLoading ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Claude is drafting your JD…</> : <><Sparkles size={14} /> Generate JD</>}
                    </button>
                  )}
                </div>
              )}

              {/* TAB C — Upload JD */}
              {jdTab === "upload" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div
                    style={{ border: "2px dashed #CBD5E1", borderRadius: 12, padding: "48px 24px", textAlign: "center", background: "#F8FAFC", cursor: "pointer" }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={async (e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (!file) return;
                      const fd = new FormData(); fd.append("file", file);
                      try {
                        const res = await fetch("/api/parse-resume", { method: "POST", body: fd });
                        const data = await res.json();
                        if (data.text) { setPastedJD(data.text); setJdTab("paste"); toast.success("File extracted — review and parse below"); }
                      } catch { toast.error("File extraction failed"); }
                    }}
                  >
                    <Upload size={28} color="#94A3B8" style={{ margin: "0 auto 12px" }} />
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Drop PDF or DOCX here</p>
                    <p style={{ fontSize: 12, color: "#94A3B8" }}>or click to browse</p>
                    <input type="file" accept=".pdf,.docx" style={{ display: "none" }} onChange={async (e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      const fd = new FormData(); fd.append("file", file);
                      try {
                        const res = await fetch("/api/parse-resume", { method: "POST", body: fd });
                        const data = await res.json();
                        if (data.text) { setPastedJD(data.text); setJdTab("paste"); toast.success("File extracted — review and parse below"); }
                      } catch { toast.error("File extraction failed"); }
                    }} id="jd-upload" />
                    <label htmlFor="jd-upload" style={{ display: "inline-block", marginTop: 12, padding: "7px 18px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#fff", color: "#475569", cursor: "pointer", fontSize: 13, fontFamily: "var(--font-sans)", fontWeight: 500 }}>Browse files</label>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── STEP 2: Skills Review ── */}
          {step === 2 && (
            <>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#4F46E5" }}>Skills Review</h2>
                <p style={{ fontSize: 14, color: "#94A3B8", marginTop: 4 }}>
                  {jdParsed ? "Auto-populated from your JD — edit as needed." : "Enter the skills manually."}
                </p>
              </div>

              {jdParsed && (
                <div style={{ padding: "10px 14px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.18)", borderRadius: 9, fontSize: 12, color: "#059669", display: "flex", gap: 8, alignItems: "center" }}>
                  <CheckCircle2 size={13} /> Skills auto-populated from JD parse — review and adjust below
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <FieldLabel label="Required Skills / Tech Stack" hint="Must have — questions asked on all of these" />
                  <TagInput tags={mustHaveTech} onChange={setMustHaveTech} placeholder="e.g. Java, Spring Boot, Kafka…" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <FieldLabel label="Good to Have" hint="Preferred — AI will include if time permits" />
                  <TagInput tags={niceToHaveTech} onChange={setNiceToHaveTech} placeholder="e.g. Kubernetes, Terraform…" />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <Field label="Experience Level">
                  <select style={SELECT_STYLE} value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)}>
                    {["0–2 years","2–5 years","5–8 years","8–12 years","12–18 years","18+ years"].map((r) => <option key={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="Role Type">
                  <select style={SELECT_STYLE} value={roleType} onChange={(e) => setRoleType(e.target.value)}>
                    {["Individual Contributor","Team Lead","People Manager","Architect","Director","VP","Product Manager","Engineering Manager"].map((r) => <option key={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="Primary Domain">
                  <select style={SELECT_STYLE} value={primaryDomain} onChange={(e) => setPrimaryDomain(e.target.value)}>
                    {["Backend Engineering","Frontend Engineering","Fullstack","Data Engineering","Data Science","ML/AI","Infrastructure/DevOps","Security","Mobile","Product Management","Engineering Management","IT Risk & Compliance","Business Intelligence","Other"].map((r) => <option key={r}>{r}</option>)}
                  </select>
                </Field>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Field label="Industry / Domain Context">
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

              <Field label="Work Mode">
                <RadioGroup options={["Hands-on (writes code/does the work)","Hybrid (leads + contributes)","Oversight (leads, does not execute)"]} value={workMode} onChange={setWorkMode} />
              </Field>

              <Field label="Role Type">
                <RadioGroup options={["New Role","Backfill"]} value={isNewRole} onChange={setIsNewRole} />
              </Field>

              <Field label="Specific gaps or red flags to probe (optional)" hint="e.g. Last 3 people struggled with cross-functional communication">
                <textarea className="input" placeholder="Leave blank if none" value={redFlags} onChange={(e) => setRedFlags(e.target.value)} style={{ resize: "vertical", minHeight: 80 }} />
              </Field>
            </>
          )}

          {/* ── STEP 3: Settings ── */}
          {step === 3 && (
            <>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#4F46E5" }}>Interview Settings</h2>
                <p style={{ fontSize: 14, color: "#94A3B8", marginTop: 4 }}>Configure scoring weights, L2 threshold, and interview style.</p>
              </div>

              {/* Soft skill sliders */}
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>Soft Skill Weightage</p>
                <SliderField label="Technical Depth" hint="Influences the number of technical deep-dive questions." value={weights.technical} onChange={(v) => setWeights({ ...weights, technical: v })} />
                <div style={{ height: 1, background: "#F1F5F9" }} />
                <SliderField label="Leadership & People Skills" hint="Shapes team-building and org design questions." value={weights.leadership} onChange={(v) => setWeights({ ...weights, leadership: v })} />
                <div style={{ height: 1, background: "#F1F5F9" }} />
                <SliderField label="Communication & Stakeholder Management" hint="Drives questions on cross-functional alignment." value={weights.communication} onChange={(v) => setWeights({ ...weights, communication: v })} />
                <div style={{ height: 1, background: "#F1F5F9" }} />
                <SliderField label="Problem Solving & Judgment" hint="Influences ambiguity handling and trade-off reasoning." value={weights.problemSolving} onChange={(v) => setWeights({ ...weights, problemSolving: v })} />
                <div style={{ height: 1, background: "#F1F5F9" }} />
                <SliderField label="Culture Fit & Adaptability" hint="Shapes values alignment and growth mindset questions." value={weights.cultureFit} onChange={(v) => setWeights({ ...weights, cultureFit: v })} />
              </div>

              <Field label="Interview Style">
                <RadioGroup options={["Conversational","Structured","Pressure test"]} value={interviewStyle} onChange={setInterviewStyle} />
              </Field>
              <Field label="Behavioral Framework">
                <RadioGroup options={["STAR method","Situational","Free-form"]} value={behavioralFramework} onChange={setBehavioralFramework} />
              </Field>

              {/* Dynamic intensity */}
              <div>
                <FieldLabel label="Live Dynamic Question Intensity" hint="AI generates these in real time based on candidate responses" />
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  {(["light","standard","deep"] as const).map((level) => {
                    const cfg = { light: { label: "Light", sub: "1–2 questions" }, standard: { label: "Standard", sub: "3–4 questions" }, deep: { label: "Deep", sub: "5–6 questions" } };
                    const active = dynamicIntensity === level;
                    return (
                      <button key={level} type="button" onClick={() => setDynamicIntensity(level)} style={{ flex: 1, padding: "10px 12px", borderRadius: 8, cursor: "pointer", border: `1px solid ${active ? "#7C3AED" : "#E2E8F0"}`, background: active ? "rgba(124,58,237,0.06)" : "#fff", textAlign: "left", fontFamily: "var(--font-sans)" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: active ? "#6D28D9" : "#4F46E5" }}>{cfg[level].label}</div>
                        <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>{cfg[level].sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* L2 Threshold */}
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#4F46E5" }}>L2 Submission Threshold</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>Minimum score for L2 recommendation</div>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 800, color: "#4F46E5" }}>{l2ScoreThreshold}<span style={{ fontSize: 14, fontWeight: 400, color: "#94A3B8" }}>/100</span></span>
                </div>
                <input type="range" min={50} max={95} step={5} value={l2ScoreThreshold} onChange={(e) => setL2ScoreThreshold(Number(e.target.value))} style={{ width: "100%", accentColor: "#7C3AED", cursor: "pointer", marginBottom: 10 }} />
                <p style={{ fontSize: 11, color: "#94A3B8", margin: 0 }}>
                  Candidates scoring below <strong>{l2ScoreThreshold}</strong> will be marked &ldquo;Not recommended for L2&rdquo; even if the AI recommends Yes.
                </p>
              </div>

              {/* Scoring Rubric */}
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#4F46E5" }}>Scoring Rubric</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>Must total 100%</div>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 800, color: rubricTotal === 100 ? "#10B981" : "#EF4444" }}>
                    {rubricTotal}% {rubricTotal === 100 ? "✓" : "≠ 100"}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <SliderField label="Technical Depth" hint="" value={scoringRubric.technical} onChange={(v) => setScoringRubric(r => ({ ...r, technical: v }))} color="#4F46E5" />
                  <SliderField label="Problem Solving" hint="" value={scoringRubric.problemSolving} onChange={(v) => setScoringRubric(r => ({ ...r, problemSolving: v }))} color="#7C3AED" />
                  <SliderField label="Behavioral / STAR" hint="" value={scoringRubric.behavioral} onChange={(v) => setScoringRubric(r => ({ ...r, behavioral: v }))} color="#10B981" />
                  <SliderField label="EQ & Soft Skills" hint="" value={scoringRubric.eq} onChange={(v) => setScoringRubric(r => ({ ...r, eq: v }))} color="#F59E0B" />
                </div>
                <div style={{ marginTop: 16, padding: "12px", background: "#F8FAFC", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="checkbox" id="send-rubric" checked={sendRubricToClient} onChange={(e) => { setSendRubricToClient(e.target.checked); setRubricApproved(e.target.checked); }} style={{ accentColor: "#7C3AED" }} />
                  <label htmlFor="send-rubric" style={{ fontSize: 12, color: "#475569", cursor: "pointer" }}>
                    Send rubric to client for approval before interviews begin
                    {clientManagerEmail && <span style={{ color: "#94A3B8" }}> ({clientManagerEmail})</span>}
                  </label>
                </div>
              </div>
            </>
          )}

          {/* ── STEP 4: JD Approval ── */}
          {step === 4 && (
            <>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#4F46E5" }}>JD Approval</h2>
                <p style={{ fontSize: 14, color: "#94A3B8", marginTop: 4 }}>Send the job description to your client manager for review.</p>
              </div>
              <div className="card" style={{ maxHeight: 300, overflowY: "auto" }}>
                <pre style={{ fontSize: 12, color: "#475569", lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: "var(--font-sans)", margin: 0 }}>{finalJD}</pre>
              </div>
              {!jdApproved ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <Field label="Client Manager Email">
                    <div style={{ display: "flex", gap: 10 }}>
                      <input className="input" type="email" value={clientManagerEmail} onChange={(e) => setClientManagerEmail(e.target.value)} style={{ flex: 1 }} placeholder="manager@client.com" />
                      <button type="button" className="btn-primary" onClick={() => { setJdSent(true); toast.success("JD sent to client manager"); }} disabled={jdSent || !clientManagerEmail} style={{ flexShrink: 0 }}>
                        <Mail size={14} /> {jdSent ? "Sent" : "Send for Approval"}
                      </button>
                    </div>
                  </Field>
                  {jdSent && (
                    <div style={{ padding: "16px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#D97706", fontSize: 13, fontWeight: 600 }}><AlertCircle size={15} /> Waiting for client manager approval…</div>
                      <button type="button" style={{ alignSelf: "flex-start", padding: "7px 16px", fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: "pointer", border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.08)", color: "#059669", fontFamily: "var(--font-sans)" }} onClick={() => { setJdApproved(true); setApprovedAt(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })); toast.success("JD approved!"); }}>
                        <Check size={12} style={{ display: "inline", marginRight: 4 }} /> Simulate Approval (Demo)
                      </button>
                    </div>
                  )}
                  <button type="button" style={{ alignSelf: "flex-start", padding: "7px 16px", fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: "pointer", border: "1px solid #E2E8F0", background: "#F8FAFC", color: "#64748B", fontFamily: "var(--font-sans)" }} onClick={() => { setJdApproved(true); setApprovedAt(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })); }}>
                    Skip approval (continue anyway)
                  </button>
                </div>
              ) : (
                <div style={{ padding: "20px", background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}><CheckCircle2 size={20} color="#10B981" /><span style={{ fontSize: 15, fontWeight: 700, color: "#059669" }}>JD Approved</span></div>
                  <p style={{ fontSize: 12, color: "#64748B" }}>Approved · {approvedAt}</p>
                  <p style={{ fontSize: 12, color: "#94A3B8" }}>You can now proceed to generate interview questions.</p>
                </div>
              )}
            </>
          )}

          {/* ── STEP 5: Question Generation ── */}
          {step === 5 && (
            <>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#4F46E5" }}>Question Generation</h2>
                <p style={{ fontSize: 14, color: "#94A3B8", marginTop: 4 }}>Claude will generate a tailored question bank for this position.</p>
              </div>
              {questionsLoading ? (
                <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
                  <Loader2 size={32} color="#7C3AED" style={{ animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#4F46E5" }}>Generating interview questions…</p>
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
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#4F46E5", marginBottom: 6 }}>Ready to generate</p>
                  <p style={{ fontSize: 13, color: "#94A3B8", marginBottom: 20 }}>Claude will create technical, behavioral, scenario, EQ, and whiteboard questions based on the JD.</p>
                  <button type="button" className="btn-primary" onClick={generateQuestions} disabled={questionsLoading}><Sparkles size={14} /> Generate Questions</button>
                </div>
              )}
            </>
          )}

          {/* ── STEP 6: Dual Approval ── */}
          {step === 6 && questions && (
            <>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#4F46E5" }}>Dual Review & Approval</h2>
                <p style={{ fontSize: 14, color: "#94A3B8", marginTop: 4 }}>Tech Lead reviews technical questions · HR reviews behavioral questions.</p>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {[{ label: "Tech Lead Review", approved: techApproved, total: techTotal, color: "#7C3AED" }, { label: "HR Review", approved: hrApproved, total: hrTotal, color: "#10B981" }].map((b) => (
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
              <div style={{ display: "flex", gap: 0, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 4 }}>
                {([["tech","Tech Lead Review"],["hr","HR Review"]] as const).map(([k,l]) => (
                  <button key={k} type="button" onClick={() => setReviewTab(k)} style={{ flex: 1, padding: "8px 16px", borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none", fontFamily: "var(--font-sans)", background: reviewTab === k ? "#fff" : "transparent", color: reviewTab === k ? "#4F46E5" : "#94A3B8", boxShadow: reviewTab === k ? "0 1px 3px rgba(79,70,229,0.08)" : "none", transition: "all 0.15s" }}>{l}</button>
                ))}
              </div>

              {/* Tech Lead tab */}
              {reviewTab === "tech" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}><button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={approveAllTech}><Check size={12} /> Approve All</button></div>
                  {(["technicalQuestions","scenarioQuestions","whiteboardAssessment"] as const).map((section) => {
                    const meta: Record<string, { label: string; type: string }> = { technicalQuestions: { label: "Technical", type: "technical" }, scenarioQuestions: { label: "Scenario", type: "scenario" }, whiteboardAssessment: { label: "Whiteboard", type: "whiteboard" } };
                    const { label, type } = meta[section];
                    const sTotal = questions[section].length, sApproved = questions[section].filter((q) => q.approvedByTech).length;
                    return (
                      <div key={section} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>{label}</p>
                          <span style={{ fontSize: 11, color: sApproved === sTotal && sTotal > 0 ? "#10B981" : "#94A3B8", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{sApproved}/{sTotal} approved</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {questions[section].map((q) => (
                            <QuestionCard key={q.id} q={q} approveLabel="Approve" approved={!!q.approvedByTech} isReplacing={!!replacingIds[q.id]}
                              onApprove={() => updateQuestion(section, q.id, { approvedByTech: !q.approvedByTech })}
                              onRemove={() => removeQuestion(section, q.id)}
                              onEdit={(updated) => updateQuestion(section, q.id, updated)}
                              onReplace={() => replaceQuestion(section, q, type)} />
                          ))}
                        </div>
                        <button type="button" disabled={!!generatingMore[section]} onClick={() => generateMoreForSection(section, type)} style={{ alignSelf: "flex-start", padding: "7px 14px", fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: generatingMore[section] ? "not-allowed" : "pointer", border: "1px dashed #CBD5E1", background: "#F8FAFC", color: "#475569", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", gap: 6, opacity: generatingMore[section] ? 0.7 : 1 }}>
                          {generatingMore[section] ? <><Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Generating…</> : <><Plus size={12} /> Generate 5 More {label} Questions</>}
                        </button>
                      </div>
                    );
                  })}
                  {/* Dynamic Questions panel */}
                  <div style={{ background: "rgba(79,70,229,0.03)", border: "1px solid rgba(79,70,229,0.10)", borderRadius: 12, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 14 }}>🔴</span><span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "#4F46E5" }}>Live Dynamic Questions</span></div>
                    <p style={{ fontSize: 12, color: "#64748B", lineHeight: 1.6, margin: 0 }}>Generated in real time during the interview based on each candidate&apos;s responses. Cannot be pre-reviewed.</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#475569" }}><Check size={11} color="#10B981" /> Resume project deep dives · Follow-up probes · Coding challenges (if hands-on)</div>
                  </div>
                </div>
              )}

              {/* HR tab */}
              {reviewTab === "hr" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}><button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={approveAllHR}><Check size={12} /> Approve All</button></div>
                  {(["behavioralQuestions","eqQuestions"] as const).map((section) => {
                    const meta: Record<string, { label: string; type: string }> = { behavioralQuestions: { label: "Behavioral", type: "behavioral" }, eqQuestions: { label: "EQ / Values", type: "eq" } };
                    const { label, type } = meta[section];
                    const sTotal = questions[section].length, sApproved = questions[section].filter((q) => q.approvedByHR).length;
                    return (
                      <div key={section} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>{label}</p>
                          <span style={{ fontSize: 11, color: sApproved === sTotal && sTotal > 0 ? "#10B981" : "#94A3B8", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{sApproved}/{sTotal} approved</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {questions[section].map((q) => (
                            <QuestionCard key={q.id} q={q} approveLabel="Approve" approved={!!q.approvedByHR} isReplacing={!!replacingIds[q.id]}
                              onApprove={() => updateQuestion(section, q.id, { approvedByHR: !q.approvedByHR })}
                              onRemove={() => removeQuestion(section, q.id)}
                              onEdit={(updated) => updateQuestion(section, q.id, updated)}
                              onReplace={() => replaceQuestion(section, q, type)} />
                          ))}
                        </div>
                        <button type="button" disabled={!!generatingMore[section]} onClick={() => generateMoreForSection(section, type)} style={{ alignSelf: "flex-start", padding: "7px 14px", fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: generatingMore[section] ? "not-allowed" : "pointer", border: "1px dashed #CBD5E1", background: "#F8FAFC", color: "#475569", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", gap: 6, opacity: generatingMore[section] ? 0.7 : 1 }}>
                          {generatingMore[section] ? <><Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Generating…</> : <><Plus size={12} /> Generate 5 More {label} Questions</>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {!allApproved && (
                <div style={{ padding: "12px 16px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.22)", borderRadius: 10, fontSize: 12, color: "#D97706", display: "flex", gap: 8, alignItems: "center" }}>
                  <AlertCircle size={14} />
                  {techApproved < techTotal ? `Tech Lead: ${techTotal - techApproved} question${techTotal - techApproved !== 1 ? "s" : ""} pending` : `HR: ${hrTotal - hrApproved} question${hrTotal - hrApproved !== 1 ? "s" : ""} pending`}
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
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.06))", border: "2px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 0 0 8px rgba(16,185,129,0.06)" }}>
                <CheckCircle2 size={36} color="#10B981" />
              </div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "#4F46E5", marginBottom: 8 }}>Position is now ACTIVE</h2>
              <p style={{ fontSize: 14, color: "#94A3B8", marginBottom: 28 }}>Your position has been created and is ready for candidates.</p>
              <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
                {[
                  { label: "Position", value: positionTitle },
                  { label: "Questions", value: questions ? String((questions.technicalQuestions?.length ?? 0) + (questions.scenarioQuestions?.length ?? 0) + (questions.behavioralQuestions?.length ?? 0) + (questions.eqQuestions?.length ?? 0) + (questions.whiteboardAssessment?.length ?? 0)) : "—" },
                  { label: "Tech Stack", value: mustHaveTech.slice(0, 2).join(", ") || "—" },
                  { label: "L2 Threshold", value: `${l2ScoreThreshold}/100` },
                ].map((s) => (
                  <div key={s.label} style={{ padding: "14px 20px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, minWidth: 120 }}>
                    <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#4F46E5" }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button type="button" className="btn-primary" onClick={() => { toast.success("Candidate upload coming soon"); onClose(); }}><Plus size={15} /> Upload Candidates</button>
                <button type="button" className="btn-ghost" onClick={onClose}>Back to Positions</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom nav ── */}
      {step < 7 && (
        <div style={{ background: "#fff", borderTop: "1px solid #E2E8F0", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <button type="button" className="btn-ghost" onClick={back} disabled={step === 0} style={{ opacity: step === 0 ? 0.4 : 1 }}><ChevronLeft size={15} /> Back</button>
          <span style={{ fontSize: 12, color: "#94A3B8", fontFamily: "var(--font-mono)" }}>Step {step + 1} of {STEPS.length}</span>
          {step === 6 ? null : (
            <button type="button" className="btn-primary" onClick={next} disabled={(step === 5 && questionsLoading) || (step === 3 && rubricTotal !== 100)}>
              {step === 5 && questionsLoading ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Generating…</>
                : step === 5 && !questions ? <><Sparkles size={14} /> Generate Questions</>
                : step === 4 && !jdApproved ? "Awaiting Approval…"
                : step === 3 && rubricTotal !== 100 ? `Rubric must total 100% (${rubricTotal}%)`
                : step === 1 && finalJD.trim().length < 50 ? "Add JD to continue"
                : <>{step === 1 && !jdParsed && finalJD.length > 50 ? "Continue without parsing" : "Continue"} <ChevronRight size={15} /></>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
