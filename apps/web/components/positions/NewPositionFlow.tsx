"use client";

import { useEffect, useId, useState, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { MustHaveEditor } from "./MustHaveEditor";
import { LogisticsEditor } from "./LogisticsEditor";
import type { LogisticsConfig } from "@/lib/screen/logistics/config";
import { DEFAULT_MIX, contactEmailError, formatExperience, sanitizeKnockouts, type ConceptRubricItem, type KnockoutQuestion, type QuestionMix } from "@/lib/screen/position-config";
import { ConceptRubricEditor, ExperienceRangeInput, KnockoutEditor, QuestionMixEditor, experienceValid } from "./SetupFields";
import { InterviewModeField } from "./InterviewModeField";
import { suggestMode, type InterviewMode } from "@/lib/screen/workspace/modes";
import { useAppStore } from "@/store/appStore";
import {
  X, ChevronRight, ChevronLeft, Check, Plus, Trash2,
  RefreshCw, FileText, Upload, Clipboard,
  Mail, AlertCircle, CheckCircle2, Sparkles,
  ChevronDown, ChevronUp, Edit3, Play, Search, ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import { VOICE_OPTIONS } from "@/lib/voiceOptions";
import { useAccountType } from "@/hooks/useAccountType";
import {
  Button, Card, Eyebrow, Badge, Alert, EmptyState, Modal, ActionBar, Checkbox,
  Field as FormField, Input, Select, Textarea, type Tone,
} from "@/components/screen/ui";
import { lv, space, text, radius, size } from "@/lib/screen/ui/tokens";

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
// Design-System Pass 3 (group 2b): these render with the Screen tokens and
// canonical components. Props and behaviour are unchanged.
function RadioGroup({ options, value, onChange, label }: { options: string[]; value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <div className="lv-seg" role="radiogroup" aria-label={label}>
      {options.map((opt) => (
        <button key={opt} type="button" role="radio" aria-checked={value === opt} className="lv-seg__opt" onClick={() => onChange(opt)}>
          {opt}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="lv-switch" onClick={() => onChange(!checked)} />;
}

function TagInput({ tags, onChange, placeholder, label }: { tags: string[]; onChange: (t: string[]) => void; placeholder?: string; label?: string }) {
  const [input, setInput] = useState("");
  const add = () => { const v = input.trim(); if (v && !tags.includes(v)) onChange([...tags, v]); setInput(""); };
  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
    if (e.key === "Backspace" && !input && tags.length) onChange(tags.slice(0, -1));
  };
  return (
    <div className="lv-taginput" style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: `6px ${space[3]}px`, background: lv.surface, border: `1px solid ${lv.borderControl}`, borderRadius: radius.md, minHeight: size.touch, alignItems: "center" }}>
      {tags.map((t) => (
        <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: lv.brandSoft, border: `1px solid ${lv.brandSoftBorder}`, color: lv.brandText, fontSize: text.xs, fontWeight: 600, padding: "2px 4px 2px 8px", borderRadius: radius.pill, fontFamily: lv.fontMono }}>
          {t}
          <button type="button" aria-label={`Remove ${t}`} className="lv-chip-add" onClick={() => onChange(tags.filter((x) => x !== t))}
            style={{ background: "none", border: "none", cursor: "pointer", color: lv.brandText, padding: 0, width: 18, height: 18, borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <X size={12} aria-hidden="true" />
          </button>
        </span>
      ))}
      <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} onBlur={add} aria-label={label} placeholder={tags.length === 0 ? placeholder : ""}
        style={{ border: "none", outline: "none", background: "transparent", fontSize: text.base, color: lv.text, flex: 1, minWidth: 120, minHeight: 28, fontFamily: lv.fontSans }} />
    </div>
  );
}

/** Label + hint for a composite control (not a single input — use FormField for those). */
function FieldLabel({ label, hint, id, required }: { label: string; hint?: string; id?: string; required?: boolean }) {
  return (
    <div style={{ marginBottom: space[2] }}>
      <div id={id} className="lv-label">{label}{required && <span className="lv-req" aria-hidden="true">*</span>}</div>
      {hint && <div className="lv-hint" style={{ marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
      <FieldLabel id={id} label={label} hint={hint} required={required} />
      {children}
    </div>
  );
}

function SliderField({ label, hint, value, onChange, color }: { label: string; hint: string; value: number; onChange: (v: number) => void; color?: string }) {
  const id = useId();
  const c = color ?? lv.brand;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <label htmlFor={id} className="lv-label">{label}</label>
        <span style={{ fontFamily: lv.fontMono, fontSize: text.base, fontWeight: 600, color: lv.text }}>{value}%</span>
      </div>
      <input id={id} type="range" min={0} max={100} value={value} onChange={(e) => onChange(Number(e.target.value))} className="lv-range" style={{ accentColor: c }} />
      {hint && <p className="lv-hint" style={{ margin: 0 }}>{hint}</p>}
    </div>
  );
}

function DiffBadge({ diff }: { diff: string }) {
  const tone: Record<string, Tone> = { basic: "success", intermediate: "brand", advanced: "info" };
  return <Badge tone={tone[diff] ?? "brand"}>{diff.charAt(0).toUpperCase() + diff.slice(1)}</Badge>;
}

function QuestionCard({ q, onApprove, onRemove, onEdit, onReplace, approveLabel, approved, isReplacing }: {
  q: QuestionItem; onApprove: () => void; onRemove: () => void; onEdit: (updated: QuestionItem) => void;
  onReplace?: () => void; approveLabel: string; approved: boolean; isReplacing?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing]   = useState(false);
  const [editText, setEditText] = useState(q.question);
  const saveEdit = () => { onEdit({ ...q, question: editText }); setEditing(false); };
  const flag = (bg: string, fg: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 600, color: fg, background: bg, padding: "2px 7px", borderRadius: radius.pill, letterSpacing: "0.04em", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 3 });
  return (
    <div className="lv-card" style={{ background: approved ? lv.successSoft : lv.surface, borderColor: approved ? lv.successBorder : lv.border, borderLeft: `3px solid ${approved ? lv.success : lv.borderStrong}`, padding: `${space[3]}px ${space[4]}px`, display: "flex", flexDirection: "column", gap: space[3] }}>
      {(q.isNew || q.isReplacement || approved) && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {q.isNew && <span style={flag(lv.brand, lv.onBrand)}>New</span>}
          {q.isReplacement && !q.isNew && <span style={flag(lv.accent, lv.onBrand)}>Replaced</span>}
          {approved && <span style={flag(lv.surface, lv.success)}><Check size={9} aria-hidden="true" /> Approved</span>}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", gap: space[3], flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 260px", minWidth: 0 }}>
          {editing ? (
            <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} aria-label="Edit question" style={{ minHeight: 80, resize: "vertical" }} autoFocus />
          ) : (
            <p style={{ fontSize: text.base, color: lv.text, lineHeight: 1.55, fontWeight: 500, margin: 0 }}>{q.question}</p>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <DiffBadge diff={q.difficulty} />
          <Badge tone="neutral">{q.estimatedMinutes}m</Badge>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space[2], flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: space[2], alignItems: "center" }}>
          <span style={{ fontSize: text.xs, fontFamily: lv.fontMono, color: lv.accent, background: lv.accentSoft, border: `1px solid ${lv.border}`, padding: "2px 8px", borderRadius: radius.sm }}>{q.techTag}</span>
          <Button variant="tertiary" size="sm" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} rightIcon={expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}>
            Key points
          </Button>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {editing ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => { setEditing(false); setEditText(q.question); }}>Cancel</Button>
              <Button size="sm" onClick={saveEdit}>Save</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" size="sm" aria-pressed={approved} onClick={onApprove} leftIcon={<Check size={14} color={lv.success} />}>
                {approved ? "Approved" : approveLabel}
              </Button>
              <Button variant="ghost" size="sm" iconOnly aria-label="Edit question" title="Edit" onClick={() => setEditing(true)}><Edit3 size={14} /></Button>
              {onReplace && (
                <Button variant="ghost" size="sm" iconOnly aria-label="Replace question" title="Replace" onClick={onReplace} loading={isReplacing}>
                  {!isReplacing && <RefreshCw size={14} />}
                </Button>
              )}
              <Button variant="ghost" size="sm" iconOnly aria-label="Remove question" title="Remove" onClick={onRemove} style={{ color: lv.danger }}><Trash2 size={14} /></Button>
            </>
          )}
        </div>
      </div>
      {expanded && (
        <div style={{ background: lv.surfaceSunken, border: `1px solid ${lv.border}`, borderRadius: radius.md, padding: `${space[3]}px ${space[4]}px`, display: "flex", flexDirection: "column", gap: space[3] }}>
          <div>
            <Eyebrow style={{ marginBottom: 6 }}>Expected Key Points</Eyebrow>
            <ul style={{ margin: 0, paddingLeft: 16 }}>{q.expectedKeyPoints.map((pt, i) => <li key={i} style={{ fontSize: text.sm, color: lv.textBody, lineHeight: 1.6 }}>{pt}</li>)}</ul>
          </div>
          <div>
            <Eyebrow style={{ marginBottom: 4 }}>Follow-up</Eyebrow>
            <p style={{ fontSize: text.sm, color: lv.textBody, fontStyle: "italic", lineHeight: 1.5, margin: 0 }}>&ldquo;{q.followUp}&rdquo;</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Shared bits for the step bodies below.
const stepTitle: React.CSSProperties = { fontFamily: lv.fontDisplay, fontSize: text.xl, fontWeight: 600, letterSpacing: "-0.02em", color: lv.text, margin: 0 };
const stepDesc: React.CSSProperties = { fontSize: text.base, color: lv.textMuted, margin: `${space[1]}px 0 0` };
const twoCol: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: space[4] };
const panel: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: space[3], padding: `${space[3]}px ${space[4]}px`, background: lv.surface, border: `1px solid ${lv.border}`, borderRadius: radius.md };
const ROLE_TYPES = ["Individual Contributor","Team Lead","People Manager","Architect","Director","VP","Product Manager","Engineering Manager"];
const nowHHMM = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function StepHeading({ title, desc }: { title: string; desc: React.ReactNode }) {
  return (
    <div>
      <h2 id="npf-step-title" style={stepTitle} tabIndex={-1}>{title}</h2>
      <p style={stepDesc}>{desc}</p>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function NewPositionFlow({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { addPosition } = useAppStore();
  const [step, setStep] = useState(0);

  // ── Step 0: Basic Info ─────────────────────────────────────────────────
  const [positionTitle,           setPositionTitle]           = useState("");
  const [company,                 setCompany]                 = useState("");
  // Account type (agency vs in-house company) — decides whether we ask for a
  // client company + client contacts, or use the account's own org + one
  // in-house hiring contact. Unknown/legacy accounts behave as 'agency'.
  const acct = useAccountType();   // live, shared account type (Settings changes apply immediately)
  const isCompany = acct.isCompany;
  // In-house: the hiring company IS the account — fill it, don't ask.
  useEffect(() => { if (isCompany && acct.orgName) setCompany(acct.orgName); }, [isCompany, acct.orgName]);
  // In-house: one hiring contact handles every approval (JD, rubric, questions).
  // In-house: the hiring contact pre-fills the tech-lead + HR approvers while
  // they still mirror it; once edited they stay independent (per-job values).
  const setHiringContact = (v: string) => {
    setTechLeadEmail((t) => (t === "" || t === clientManagerEmail ? v : t));
    setHrEmail((h) => (h === "" || h === clientManagerEmail ? v : h));
    setClientManagerEmail(v);
  };
  const [department,              setDepartment]              = useState("");
  const [roleType,                setRoleType]                = useState("Individual Contributor");
  // #4 — experience is a min–max range; experienceLevel is the derived display string.
  const [expMin, setExpMin] = useState<number | "">(5);
  const [expMax, setExpMax] = useState<number | "">(8);
  const expOk = experienceValid(expMin, expMax);
  const experienceLevel = expOk ? formatExperience({ min: expMin as number, max: expMax as number }) : "";
  const expPayload = expOk ? { experienceMin: expMin, experienceMax: expMax } : {};
  // #15 question mix · #13 JD concept rubric · #14 knockout questions
  const [questionMix, setQuestionMix] = useState<QuestionMix>(DEFAULT_MIX);
  const [conceptRubric, setConceptRubric] = useState<ConceptRubricItem[]>([]);
  const [rubricGenerating, setRubricGenerating] = useState(false);
  const [knockouts, setKnockouts] = useState<KnockoutQuestion[]>([]);
  // Observe & Defend — null follows the JD-suggested mode (HR can override).
  const [interviewMode, setInterviewMode] = useState<InterviewMode | null>(null);
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
  const [mustHaves,       setMustHaves]       = useState<string[]>([]);
  const [logistics,       setLogistics]       = useState<LogisticsConfig>({});
  const [primaryDomain,   setPrimaryDomain]   = useState("Backend Engineering");
  const [domainContext,   setDomainContext]   = useState("Fintech");
  const [companyStage,    setCompanyStage]    = useState("Growth Stage");
  const [workMode,        setWorkMode]        = useState("Hands-on (writes code/does the work)");
  const [isNewRole,       setIsNewRole]       = useState("New Role");
  const [redFlags,        setRedFlags]        = useState("");

  // ── Step 3: Settings ───────────────────────────────────────────────────
  const [weights, setWeights]                 = useState({ technical: 70, leadership: 50, communication: 60, problemSolving: 65, cultureFit: 55 });
  const [interviewStyle,      setInterviewStyle]      = useState("Structured");
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
  const [savedPositionId,   setSavedPositionId]   = useState<string | null>(null);
  const [emailApprovalSent, setEmailApprovalSent] = useState(false);
  const [sendingApproval,   setSendingApproval]   = useState(false);
  const [activating,        setActivating]        = useState(false);
  const [dupModal,          setDupModal]          = useState<{ existingId: string; message: string } | null>(null);

  // Derived
  const finalJD = jdTab === "generate" ? generatedJD : pastedJD;
  // JD approval only needed when JD was AI-generated — pasted/uploaded means client already provided it
  const requiresJDApproval = jdTab === "generate";

  // Rubric total
  const rubricTotal = scoringRubric.technical + scoringRubric.problemSolving + scoringRubric.behavioral + scoringRubric.eq;

  // Fixpack 7 #1 — per-job approver emails (validated before Continue + on the API).
  const emailErr = {
    techLeadEmail: contactEmailError(techLeadEmail),
    hrEmail: contactEmailError(hrEmail),
    clientManagerEmail: contactEmailError(clientManagerEmail),
  };
  const contactEmailsOk = !emailErr.techLeadEmail && !emailErr.hrEmail && !emailErr.clientManagerEmail;

  // ── Canary ────────────────────────────────────────────────────────────
  const canContinue = () => {
    if (step === 0) return positionTitle.trim() !== "" && company.trim() !== "" && expOk && contactEmailsOk;
    if (step === 1) return finalJD.trim().length > 50;
    if (step === 2) return expOk;
    if (step === 3) return true;
    if (step === 4) return !requiresJDApproval || jdApproved; // auto-pass for pasted/uploaded JDs
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
    if (step === 0 && !contactEmailsOk) { toast.error("Fix the highlighted email address to continue."); return; }
    if (step === 5 && !questions) { generateQuestions(); return; }
    // Skip JD Approval step entirely when not required
    if (step === 3 && !requiresJDApproval) { setStep(5); return; }
    if (step === 5 && !requiresJDApproval) { /* no back skip needed */ }
    if (canContinue()) setStep((s) => Math.min(s + 1, 7));
  };
  const back = () => {
    // Skip JD Approval step on back when not required
    if (step === 5 && !requiresJDApproval) { setStep(3); return; }
    setStep((s) => Math.max(s - 1, 0));
  };

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
      if (typeof data.experienceMin === "number" && typeof data.experienceMax === "number") { setExpMin(data.experienceMin); setExpMax(data.experienceMax); }
      if (Array.isArray(data.mustHaves) && data.mustHaves.length) setMustHaves((cur) => Array.from(new Set([...cur, ...data.mustHaves])).slice(0, 8));
      if (data.roleType)                 setRoleType(data.roleType);
      setJdParsed(true);
      toast.success("JD parsed — review the auto-filled details");
      setStep(2);  // #6 — land on the auto-filled Skills page
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "JD parsing failed");
    } finally {
      setJdParsing(false);
    }
  };

  // ── #13 Generate the JD-based concept rubric ──────────────────────────
  const generateConceptRubric = async () => {
    setRubricGenerating(true);
    try {
      const res = await fetch("/api/positions/concept-rubric", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdText: finalJD, positionTitle, ...expPayload, skills: mustHaveTech, mustHaves }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Rubric generation failed");
      setConceptRubric(data.rubric);
      toast.success("Concept rubric generated — review and edit");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Rubric generation failed");
    } finally {
      setRubricGenerating(false);
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
          ...expPayload, weights, interviewStyle,
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
          workMode, weights, interviewStyle, ...expPayload, questionMix, conceptRubric,
          interviewDuration: 30, redFlags, approvedJD: finalJD, mustHaves,
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
  const sendForApprovalViaEmail = async () => {
    if (!questions || !techLeadEmail && !hrEmail) {
      toast.error("Add a Tech Lead or HR email in Step 1 before sending for approval");
      return;
    }
    setSendingApproval(true);
    try {
      // Create position in DB if not already saved
      let posId = savedPositionId;
      if (!posId) {
        const posRes = await fetch("/api/positions", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: positionTitle, company, department, experienceLevel, roleType,
            primaryDomain, techStack: mustHaveTech, goodToHave: niceToHaveTech, mustHaves, logistics, ...expPayload, questionMix, conceptRubric, knockoutQuestions: sanitizeKnockouts(knockouts), interviewMode,
            domainContext, workMode, interviewDuration: 30,
            dynamicIntensity, voiceAccent: voiceAccent ?? null,  // null = use the account default voice
            jdText: finalJD, techLeadEmail, hrEmail, clientManagerEmail,
            status: "pending_approval",
            l2ScoreThreshold, rubricApproved, scoringRubric, softSkillWeightage: weights,
          }),
        });
        if (posRes.status === 401) { window.location.assign("/interviews/login?expired=1"); throw new Error("Your session has expired — please sign in again."); } if (!posRes.ok) { const err = await posRes.json(); throw new Error(err.error ?? "Failed to create position"); }
        const pos = await posRes.json();
        posId = pos.id;
        setSavedPositionId(posId);
        // Save question set
        await fetch(`/api/positions/${posId}/questions`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            technicalQuestions: questions.technicalQuestions, scenarioQuestions: questions.scenarioQuestions,
            behavioralQuestions: questions.behavioralQuestions, eqQuestions: questions.eqQuestions,
            whiteboardQuestions: questions.whiteboardAssessment, timeAllocation: questions.timeAllocation,
          }),
        }).catch(() => console.warn("[sendForApproval] Question set save failed"));
        addPosition({
          id: pos.id, title: positionTitle, company, department,
          experienceLevel, techStack: mustHaveTech, status: "pending_approval",
          interviewsScheduled: 0, interviewsCompleted: 0,
          createdAt: new Date().toISOString().split("T")[0],
          approvals: { techLead: false, hr: false },
          interviewDuration: 30, dynamicQuestionIntensity: dynamicIntensity,
        });
      }
      // Send approval emails
      const approvalRes = await fetch(`/api/positions/${posId}/send-approvals`, { method: "POST" });
      const approvalData = await approvalRes.json();
      if (!approvalRes.ok) throw new Error(approvalData.error ?? "Failed to send approvals");
      setEmailApprovalSent(true);
      const sent = approvalData.sent ?? [];
      if (approvalData.emailsConfigured) {
        toast.success(`Approval emails sent to ${sent.length > 0 ? sent.join(" & ") : "approvers"}`);
      } else {
        toast("Approval tokens created — add RESEND_API_KEY to send emails automatically");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send approvals");
    } finally {
      setSendingApproval(false);
    }
  };

  const activatePosition = async () => {
    if (!questions || activating) return;
    setActivating(true);
    try {
      const posRes = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: positionTitle, company, department, experienceLevel, roleType,
          primaryDomain, techStack: mustHaveTech, goodToHave: niceToHaveTech, mustHaves, logistics, ...expPayload, questionMix, conceptRubric, knockoutQuestions: sanitizeKnockouts(knockouts), interviewMode,
          domainContext, workMode, interviewDuration: 30,
          dynamicIntensity, voiceAccent: voiceAccent ?? null,  // null = use the account default voice
          jdText: finalJD,
          techLeadEmail, hrEmail, clientManagerEmail,
          techLeadApproved: techApproved === techTotal && techTotal > 0,
          hrApproved: hrApproved === hrTotal && hrTotal > 0,
          status: allApproved ? "active" : "pending_approval",
          l2ScoreThreshold, rubricApproved, scoringRubric,
          softSkillWeightage: weights,
        }),
      });
      if (posRes.status === 409) {
        const dup = await posRes.json();
        setDupModal({ existingId: dup.existingId, message: dup.message });
        return;
      }
      if (posRes.status === 401) { window.location.assign("/interviews/login?expired=1"); throw new Error("Your session has expired — please sign in again."); } if (!posRes.ok) { const err = await posRes.json(); throw new Error(err.error ?? "Failed to create position"); }
      const position = await posRes.json();
      setSavedPositionId(position.id);
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
    } finally {
      setActivating(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  const gutter = "clamp(16px, 4vw, 32px)";
  const totalQuestions = questions ? (questions.technicalQuestions?.length ?? 0) + (questions.scenarioQuestions?.length ?? 0) + (questions.behavioralQuestions?.length ?? 0) + (questions.eqQuestions?.length ?? 0) + (questions.whiteboardAssessment?.length ?? 0) : 0;
  const extractFile = async (file: File) => {
    const fd = new FormData(); fd.append("file", file);
    try {
      const res = await fetch("/api/parse-resume", { method: "POST", body: fd });
      const data = await res.json();
      if (data.text) { setPastedJD(data.text); setJdTab("paste"); toast.success("File extracted — review and parse below"); }
    } catch { toast.error("File extraction failed"); }
  };
  const reviewSection = (
    sections: readonly ("technicalQuestions" | "scenarioQuestions" | "whiteboardAssessment" | "behavioralQuestions" | "eqQuestions")[],
    meta: Record<string, { label: string; type: string }>,
    approvedKey: "approvedByTech" | "approvedByHR",
  ) => sections.map((section) => {
    const { label, type } = meta[section];
    const sTotal = questions![section].length, sApproved = questions![section].filter((q) => q[approvedKey]).length;
    return (
      <section key={section} aria-label={`${label} questions`} style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
        <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
          <Eyebrow>{label}</Eyebrow>
          <span style={{ fontSize: text.xs, color: sApproved === sTotal && sTotal > 0 ? lv.success : lv.textMuted, fontFamily: lv.fontMono, fontWeight: 600 }}>{sApproved}/{sTotal} approved</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
          {questions![section].map((q) => (
            <QuestionCard key={q.id} q={q} approveLabel="Approve" approved={!!q[approvedKey]} isReplacing={!!replacingIds[q.id]}
              onApprove={() => updateQuestion(section, q.id, { [approvedKey]: !q[approvedKey] })}
              onRemove={() => removeQuestion(section, q.id)}
              onEdit={(updated) => updateQuestion(section, q.id, updated)}
              onReplace={() => replaceQuestion(section, q, type)} />
          ))}
        </div>
        <Button variant="secondary" size="sm" style={{ alignSelf: "flex-start", borderStyle: "dashed" }} loading={!!generatingMore[section]} leftIcon={<Plus size={14} />}
          onClick={() => generateMoreForSection(section, type)}>
          {generatingMore[section] ? "Generating…" : `Generate 5 More ${label} Questions`}
        </Button>
      </section>
    );
  });

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="npf-title" style={{ position: "fixed", inset: 0, zIndex: 200, background: lv.bg, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: lv.fontSans }}>

      {/* Duplicate position modal */}
      <Modal open={!!dupModal} onClose={() => setDupModal(null)} size="sm" title="Position already exists"
        description={dupModal && <>{dupModal.message}<br />Do you want to open the existing position or create a new one?</>}
        footer={<ActionBar>
          <Button variant="secondary" onClick={() => setDupModal(null)}>Create New Anyway</Button>
          <Button rightIcon={<ExternalLink size={14} />} onClick={() => { if (!dupModal) return; window.open(`/positions/${dupModal.existingId}`, "_blank"); setDupModal(null); onClose(); }}>Open Existing</Button>
        </ActionBar>} />

      {/* ── Top bar ── */}
      <div style={{ background: lv.surface, borderBottom: `1px solid ${lv.border}`, padding: `0 ${gutter}`, height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: space[3] }}>
          <span id="npf-title" style={{ fontFamily: lv.fontDisplay, fontSize: text.md, fontWeight: 600, color: lv.text }}>New Position Setup</span>
        </div>
        <Button variant="ghost" iconOnly aria-label="Close new position setup" onClick={onClose}><X size={20} /></Button>
      </div>

      {/* ── Stepper ── */}
      <nav aria-label="Setup progress" style={{ background: lv.surface, borderBottom: `1px solid ${lv.border}`, padding: `${space[4]}px ${gutter}`, flexShrink: 0 }}>
        <ol style={{ display: "flex", alignItems: "center", gap: 0, maxWidth: 960, margin: "0 auto", padding: 0, listStyle: "none" }}>
          {STEPS.map((s, i) => {
            const done = i < step, current = i === step;
            return (
              <li key={i} aria-current={current ? "step" : undefined} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                  <div aria-hidden="true" style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: text.xs, fontWeight: 600, flexShrink: 0, background: done ? lv.success : current ? lv.brand : lv.surfaceMuted, color: done || current ? lv.onBrand : lv.textMuted, boxShadow: current ? lv.focusRing : "none", transition: `all ${lv.dur}` }}>
                    {done ? <Check size={12} /> : i + 1}
                  </div>
                  <span className="step-label" style={{ fontSize: text.xs, fontWeight: current ? 600 : 500, color: current ? lv.brandText : done ? lv.success : lv.textMuted, whiteSpace: "nowrap" }}>{s.short}</span>
                  <span className="lv-sr-only">{s.label}{done ? " (done)" : current ? " (current)" : ""}</span>
                </div>
                {i < STEPS.length - 1 && <div aria-hidden="true" style={{ flex: 1, height: 2, margin: "0 8px", background: done ? lv.success : lv.border, transition: `background ${lv.dur}` }} />}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* ── Content ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: `${space[8]}px ${gutter}` }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: space[6] }}>

          {/* ── STEP 0: Basic Info ── */}
          {step === 0 && (
            <>
              <StepHeading title="Basic Position Info" desc={<>Tell us about the position you&apos;re hiring for.</>} />

              <div style={twoCol}>
                <FormField label="Position Title" required>
                  <Input placeholder="e.g. Senior Java Engineer" value={positionTitle} onChange={(e) => setPositionTitle(e.target.value)} />
                </FormField>
                {!isCompany && (
                  <FormField label="Client Company" required hint="The company you're hiring for">
                    <Input placeholder="e.g. FinEdge Technologies" value={company} onChange={(e) => setCompany(e.target.value)} />
                  </FormField>
                )}
                <FormField label="Department">
                  <Input placeholder="e.g. Engineering, Product" value={department} onChange={(e) => setDepartment(e.target.value)} />
                </FormField>
                <FormField label="Role Type">
                  <Select value={roleType} onChange={(e) => setRoleType(e.target.value)}>
                    {ROLE_TYPES.map((r) => <option key={r}>{r}</option>)}
                  </Select>
                </FormField>
                <Field label="Experience (years)" required>
                  <ExperienceRangeInput min={expMin} max={expMax} onChange={(a, b) => { setExpMin(a); setExpMax(b); }} />
                </Field>
                {isManagerRole(roleType) && (
                  <FormField label="Team Size to Manage">
                    <Select value={teamSize} onChange={(e) => setTeamSize(e.target.value)}>
                      {["No direct reports","2–5","6–15","15+"].map((r) => <option key={r}>{r}</option>)}
                    </Select>
                  </FormField>
                )}
              </div>

              {isSeniorRole(roleType) && (
                <div style={panel}>
                  <div><div style={{ fontSize: text.sm, fontWeight: 600, color: lv.text }}>Budget Ownership</div><div className="lv-hint" style={{ marginTop: 2 }}>This role manages a budget</div></div>
                  <Toggle label="Budget ownership" checked={hasBudgetOwnership} onChange={setHasBudgetOwnership} />
                </div>
              )}
              <div style={panel}>
                <div><div style={{ fontSize: text.sm, fontWeight: 600, color: lv.text }}>Hiring Responsibility</div><div className="lv-hint" style={{ marginTop: 2 }}>This role participates in hiring decisions</div></div>
                <Toggle label="Hiring responsibility" checked={hasHiringResponsibility} onChange={setHasHiringResponsibility} />
              </div>

              {/* Per-job contacts + approvers — these vary job to job, so they live on the position. */}
              <div style={{ display: "flex", flexDirection: "column", gap: space[3], paddingTop: space[2] }}>
                <Eyebrow>{isCompany ? "Hiring contact & approvers" : "Client contacts & approvers"}</Eyebrow>
                <div className="lv-hint" style={{ marginTop: -4 }}>
                  For this position only. The technical lead and HR receive the question-approval emails and updates for this job.
                </div>
                <div style={twoCol}>
                  {isCompany ? (
                    <FormField label="Hiring contact email" hint="Approves the JD and rubric" error={emailErr.clientManagerEmail}>
                      <Input type="email" autoComplete="off" placeholder="hiring.manager@yourcompany.com" value={clientManagerEmail} onChange={(e) => setHiringContact(e.target.value)} />
                    </FormField>
                  ) : (
                    <FormField label="Client hiring manager email" hint="Approves the JD and rubric" error={emailErr.clientManagerEmail}>
                      <Input type="email" autoComplete="off" placeholder="manager@client.com" value={clientManagerEmail} onChange={(e) => setClientManagerEmail(e.target.value)} />
                    </FormField>
                  )}
                  <FormField label="Technical lead email" hint="Approves technical, scenario and whiteboard questions" error={emailErr.techLeadEmail}>
                    <Input type="email" autoComplete="off" placeholder={isCompany ? "techlead@yourcompany.com" : "techlead@client.com"} value={techLeadEmail} onChange={(e) => setTechLeadEmail(e.target.value)} />
                  </FormField>
                  <FormField label="HR email" hint="Approves behavioural and EQ questions" error={emailErr.hrEmail}>
                    <Input type="email" autoComplete="off" placeholder={isCompany ? "hr@yourcompany.com" : "hr@client.com"} value={hrEmail} onChange={(e) => setHrEmail(e.target.value)} />
                  </FormField>
                </div>
              </div>

              {/* Voice accent */}
              <Field label="Interviewer Voice" hint="Optional — overrides your account default for this position only">
                <div role="radiogroup" aria-label="Interviewer voice" style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
                  <label className="lv-option" data-checked={voiceAccent === null}>
                    <input type="radio" name="posVoice" checked={voiceAccent === null} onChange={() => setVoiceAccent(null)} />
                    <span style={{ fontSize: text.sm, color: voiceAccent === null ? lv.brandText : lv.textBody, fontWeight: voiceAccent === null ? 600 : 400 }}>Use account default</span>
                  </label>
                  {VOICE_OPTIONS.map((v) => (
                    <label key={v.key} className="lv-option" data-checked={voiceAccent === v.key} style={{ flexWrap: "wrap" }}>
                      <input type="radio" name="posVoice" value={v.key} checked={voiceAccent === v.key} onChange={() => setVoiceAccent(v.key)} />
                      <span style={{ fontSize: text.sm, color: voiceAccent === v.key ? lv.brandText : lv.textBody, fontWeight: voiceAccent === v.key ? 600 : 400, flex: 1 }}>{v.accent}</span>
                      <span style={{ fontSize: text.xs, color: lv.textMuted }}>Interviewer: <strong style={{ color: lv.textBody }}>{v.interviewerName}</strong></span>
                      <Button variant="secondary" size="sm" aria-label={`Preview ${v.interviewerName}'s voice`} leftIcon={<Play size={12} fill="currentColor" />} style={{ cursor: previewingVoice ? "wait" : undefined }}
                        onClick={async (e) => {
                          e.preventDefault(); if (previewingVoice) return; setPreviewingVoice(true);
                          try {
                            const res = await fetch("/api/interview/generate-speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: `Hi, I am ${v.interviewerName}, your AI interviewer for today.`, voiceAccent: v.key }) });
                            if (res.ok) { const buf = await res.arrayBuffer(); new Audio(URL.createObjectURL(new Blob([buf], { type: "audio/mpeg" }))).play(); }
                          } catch {}
                          setPreviewingVoice(false);
                        }}>
                        Preview
                      </Button>
                    </label>
                  ))}
                </div>
              </Field>
            </>
          )}

          {/* ── STEP 1: JD Input ── */}
          {step === 1 && (
            <>
              <StepHeading title="Job Description" desc={<>Paste, generate, or upload the JD — we&apos;ll extract skills automatically.</>} />

              {/* Tabs */}
              <div className="lv-seg lv-seg--track" role="tablist" aria-label="How to add the job description">
                {(["paste","generate","upload"] as const).map((t) => (
                  <button key={t} type="button" role="tab" aria-selected={jdTab === t} className="lv-seg__opt" onClick={() => setJdTab(t)}>
                    {t === "paste" && <Clipboard size={14} aria-hidden="true" />}
                    {t === "generate" && <Sparkles size={14} aria-hidden="true" />}
                    {t === "upload" && <Upload size={14} aria-hidden="true" />}
                    {t === "paste" ? "Paste JD" : t === "generate" ? "Generate JD" : "Upload JD"}
                  </button>
                ))}
              </div>

              {/* TAB A — Paste JD */}
              {jdTab === "paste" && (
                <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
                  <Textarea
                    aria-label="Job description"
                    value={pastedJD}
                    onChange={(e) => { setPastedJD(e.target.value); setJdParsed(false); }}
                    placeholder="Paste your client's job description here…"
                    style={{ resize: "vertical", lineHeight: 1.65, minHeight: 360 }}
                  />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space[3] }}>
                    {pastedJD.trim().length > 50 ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: text.xs, color: lv.textMuted }}>
                        <FileText size={14} aria-hidden="true" /> {pastedJD.trim().split(/\s+/).length} words
                      </div>
                    ) : <div />}
                    <Button onClick={parseJD} disabled={pastedJD.trim().length < 50} loading={jdParsing} leftIcon={<Search size={14} />}>
                      {jdParsing ? "Parsing JD…" : "Parse JD"}
                    </Button>
                  </div>
                  {jdParsed && parsedData && (
                    <Alert tone="success" title="JD parsed successfully — review extracted details in Step 3">
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: space[1] }}>
                        {parsedData.extractedTechStack?.slice(0, 6).map(t => <Badge key={t} tone="success">{t}</Badge>)}
                        {(parsedData.extractedTechStack?.length ?? 0) > 6 && <span style={{ fontSize: text.xs, color: lv.textMuted }}>+{parsedData.extractedTechStack.length - 6} more</span>}
                      </div>
                    </Alert>
                  )}
                </div>
              )}

              {/* TAB B — Generate JD */}
              {jdTab === "generate" && (
                <div style={{ display: "flex", flexDirection: "column", gap: space[4] }}>
                  <Card style={{ background: lv.surfaceSunken }}>
                    <Eyebrow style={{ marginBottom: space[3] }}>Position Context</Eyebrow>
                    <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: space[3], margin: 0 }}>
                      {[["Role", positionTitle || "—"], ["Company", company || "—"], ["Experience", experienceLevel], ["Type", roleType]].map(([k, v]) => (
                        <div key={k} style={{ fontSize: text.sm, display: "flex", gap: 6 }}><dt style={{ color: lv.textMuted }}>{k}:</dt> <dd style={{ margin: 0, fontWeight: 600, color: lv.text }}>{v}</dd></div>
                      ))}
                    </dl>
                  </Card>
                  <div style={twoCol}>
                    <FormField label="Primary Domain">
                      <Select value={genDomain} onChange={(e) => setGenDomain(e.target.value)}>
                        {["Backend Engineering","Frontend Engineering","Fullstack","Data Engineering","Data Science","ML/AI","Infrastructure/DevOps","Security","Mobile","Product Management","Engineering Management","Business Intelligence","Other"].map((r) => <option key={r}>{r}</option>)}
                      </Select>
                    </FormField>
                  </div>
                  <Field label="Key Skills" hint="Type and press Enter">
                    <TagInput label="Add a key skill" tags={genKeys} onChange={setGenKeys} placeholder="e.g. Java, Spring Boot, Kafka…" />
                  </Field>
                  {generatedJD ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: text.xs, color: lv.textMuted }}>{jdWordCount} words</span>
                        <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={14} />} onClick={generateJD}>Regenerate</Button>
                      </div>
                      <Textarea aria-label="Generated job description" value={generatedJD} onChange={(e) => setGeneratedJD(e.target.value)} style={{ resize: "vertical", lineHeight: 1.65, minHeight: 400 }} />
                      <div style={{ fontSize: text.xs, color: lv.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
                        <AlertCircle size={14} aria-hidden="true" /> This JD needs client approval before interviews begin
                      </div>
                    </>
                  ) : (
                    <Button style={{ alignSelf: "flex-start" }} onClick={generateJD} loading={jdLoading} leftIcon={<Sparkles size={14} />}>
                      {jdLoading ? "Claude is drafting your JD…" : "Generate JD"}
                    </Button>
                  )}
                </div>
              )}

              {/* TAB C — Upload JD */}
              {jdTab === "upload" && (
                <div className="lv-dropzone"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (!file) return;
                    await extractFile(file);
                  }}
                >
                  <Upload size={28} color={lv.textMuted} aria-hidden="true" style={{ margin: "0 auto 12px" }} />
                  <p style={{ fontSize: text.base, fontWeight: 600, color: lv.text, margin: "0 0 4px" }}>Drop PDF or DOCX here</p>
                  <p style={{ fontSize: text.xs, color: lv.textMuted, margin: 0 }}>or click to browse</p>
                  <input type="file" accept=".pdf,.docx" className="lv-sr-only" onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    await extractFile(file);
                  }} id="jd-upload" />
                  <label htmlFor="jd-upload" className="lv-btn lv-btn--secondary lv-btn--sm" style={{ marginTop: space[3] }}>Browse files</label>
                </div>
              )}
            </>
          )}

          {/* ── STEP 2: Skills Review ── */}
          {step === 2 && (
            <>
              <StepHeading title="Skills Review" desc={jdParsed ? "Auto-populated from your JD — edit as needed." : "Enter the skills manually."} />

              {jdParsed && (
                <Alert tone="success">Skills auto-populated from JD parse — review and adjust below</Alert>
              )}

              <div style={twoCol}>
                <Field label="Required Skills / Tech Stack" hint="Must have — questions asked on all of these">
                  <TagInput label="Add a required skill" tags={mustHaveTech} onChange={setMustHaveTech} placeholder="e.g. Java, Spring Boot, Kafka…" />
                </Field>
                <Field label="Good to Have" hint="Preferred — AI will include if time permits">
                  <TagInput label="Add a good-to-have skill" tags={niceToHaveTech} onChange={setNiceToHaveTech} placeholder="e.g. Kubernetes, Terraform…" />
                </Field>
              </div>

              <Field label="Must-have requirements" hint="Non-negotiables — each is assessed directly and shown as met / not met in the report">
                <MustHaveEditor value={mustHaves} onChange={setMustHaves} suggestions={mustHaveTech} />
              </Field>

              <Field label="Logistics filters (optional)" hint="The interviewer resolves these early — leave blank and it just records the candidate's answer">
                <LogisticsEditor value={logistics} onChange={setLogistics} />
              </Field>

              <Field label="Knockout questions (optional)" hint="Asked word-for-word; a failing answer is flagged for you — never an auto-reject">
                <KnockoutEditor value={knockouts} onChange={setKnockouts} />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: space[4] }}>
                <Field label="Experience (years)" required>
                  <ExperienceRangeInput min={expMin} max={expMax} onChange={(a, b) => { setExpMin(a); setExpMax(b); }} />
                </Field>
                <FormField label="Role Type">
                  <Select value={roleType} onChange={(e) => setRoleType(e.target.value)}>
                    {ROLE_TYPES.map((r) => <option key={r}>{r}</option>)}
                  </Select>
                </FormField>
                <FormField label="Primary Domain">
                  <Select value={primaryDomain} onChange={(e) => setPrimaryDomain(e.target.value)}>
                    {["Backend Engineering","Frontend Engineering","Fullstack","Data Engineering","Data Science","ML/AI","Infrastructure/DevOps","Security","Mobile","Product Management","Engineering Management","IT Risk & Compliance","Business Intelligence","Other"].map((r) => <option key={r}>{r}</option>)}
                  </Select>
                </FormField>
              </div>

              <div style={twoCol}>
                <FormField label="Industry / Domain Context">
                  <Select value={domainContext} onChange={(e) => setDomainContext(e.target.value)}>
                    {["Fintech","Healthtech","Ecommerce","SaaS","Enterprise IT","Edtech","Logistics","Gaming","Other"].map((r) => <option key={r}>{r}</option>)}
                  </Select>
                </FormField>
                <FormField label="Company Stage">
                  <Select value={companyStage} onChange={(e) => setCompanyStage(e.target.value)}>
                    {["Early Startup","Growth Stage","Scale-up","Large Enterprise","Public Company"].map((r) => <option key={r}>{r}</option>)}
                  </Select>
                </FormField>
              </div>

              <Field label="Hands-on involvement">
                <RadioGroup label="Hands-on involvement" options={["Hands-on (writes code/does the work)","Hybrid (leads + contributes)","Oversight (leads, does not execute)"]} value={workMode} onChange={setWorkMode} />
              </Field>

              <Field label="Role Type">
                <RadioGroup label="New role or backfill" options={["New Role","Backfill"]} value={isNewRole} onChange={setIsNewRole} />
              </Field>

              <FormField label="Specific gaps or red flags to probe (optional)" hint="e.g. Last 3 people struggled with cross-functional communication">
                <Textarea placeholder="Leave blank if none" value={redFlags} onChange={(e) => setRedFlags(e.target.value)} style={{ resize: "vertical", minHeight: 80 }} />
              </FormField>
            </>
          )}

          {/* ── STEP 3: Settings ── */}
          {step === 3 && (
            <>
              <StepHeading title="Interview Settings" desc="Configure scoring weights, L2 threshold, and interview style." />

              {/* Soft skill sliders */}
              <Card title="Soft skill weightage">
                <div style={{ display: "flex", flexDirection: "column", gap: space[5] }}>
                  <SliderField label="Technical Depth" hint="Influences the number of technical deep-dive questions." value={weights.technical} onChange={(v) => setWeights({ ...weights, technical: v })} />
                  <SliderField label="Leadership & People Skills" hint="Shapes team-building and org design questions." value={weights.leadership} onChange={(v) => setWeights({ ...weights, leadership: v })} />
                  <SliderField label="Communication & Stakeholder Management" hint="Drives questions on cross-functional alignment." value={weights.communication} onChange={(v) => setWeights({ ...weights, communication: v })} />
                  <SliderField label="Problem Solving & Judgment" hint="Influences ambiguity handling and trade-off reasoning." value={weights.problemSolving} onChange={(v) => setWeights({ ...weights, problemSolving: v })} />
                  <SliderField label="Culture Fit & Adaptability" hint="Shapes values alignment and growth mindset questions." value={weights.cultureFit} onChange={(v) => setWeights({ ...weights, cultureFit: v })} />
                </div>
              </Card>

              <Field label="Interview Style">
                <RadioGroup label="Interview style" options={["Conversational","Structured","Pressure test"]} value={interviewStyle} onChange={setInterviewStyle} />
              </Field>

              {/* Observe & Defend — interview mode (JD suggests; HR overrides) */}
              <Field label="Interview mode" hint="Technical and hybrid add a hands-on coding task the candidate then defends; a task is drafted from your JD">
                <InterviewModeField value={interviewMode} suggested={suggestMode({ title: positionTitle, jdText: finalJD, techStack: mustHaveTech, roleType })} onChange={setInterviewMode} />
              </Field>

              {/* #15 — question mix */}
              <Field label="Question mix" hint="Basic-concept checks test fundamentals; applied & scenario questions test reasoning">
                <QuestionMixEditor value={questionMix} onChange={setQuestionMix} />
              </Field>

              {/* #13 — JD-based concept rubric */}
              <Field label="Role concept rubric" hint="Generated from your JD — edit freely">
                <ConceptRubricEditor value={conceptRubric} onChange={setConceptRubric} onGenerate={generateConceptRubric} generating={rubricGenerating} canGenerate={finalJD.trim().length > 50 || positionTitle.trim() !== ""} />
              </Field>

              {/* Dynamic intensity */}
              <Field label="Live Dynamic Question Intensity" hint="AI generates these in real time based on candidate responses">
                <div className="lv-seg lv-seg--fill" role="radiogroup" aria-label="Live dynamic question intensity">
                  {(["light","standard","deep"] as const).map((level) => {
                    const cfg = { light: { label: "Light", sub: "1–2 questions" }, standard: { label: "Standard", sub: "3–4 questions" }, deep: { label: "Deep", sub: "5–6 questions" } };
                    return (
                      <button key={level} type="button" role="radio" aria-checked={dynamicIntensity === level} className="lv-seg__opt" onClick={() => setDynamicIntensity(level)}
                        style={{ textAlign: "left", padding: `${space[2]}px ${space[3]}px`, display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center" }}>
                        <span style={{ fontSize: text.sm, fontWeight: 600 }}>{cfg[level].label}</span>
                        <span style={{ fontSize: text.xs, color: lv.textMuted, marginTop: 2, fontWeight: 400 }}>{cfg[level].sub}</span>
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* L2 Threshold */}
              <Card title="L2 submission threshold" subtitle="Minimum score for L2 recommendation"
                actions={<span style={{ fontFamily: lv.fontMono, fontSize: text.xl, fontWeight: 600, color: lv.text }}>{l2ScoreThreshold}<span style={{ fontSize: text.base, fontWeight: 400, color: lv.textMuted }}>/100</span></span>}>
                <input type="range" min={50} max={95} step={5} value={l2ScoreThreshold} aria-label="L2 submission threshold" onChange={(e) => setL2ScoreThreshold(Number(e.target.value))} className="lv-range" style={{ marginBottom: space[3] }} />
                <p className="lv-hint" style={{ margin: 0 }}>
                  Candidates scoring below <strong>{l2ScoreThreshold}</strong> will be marked &ldquo;Not recommended for L2&rdquo; even if the AI recommends Yes.
                </p>
              </Card>

              {/* Scoring Rubric */}
              <Card title="Scoring rubric" subtitle="Must total 100%"
                actions={<Badge tone={rubricTotal === 100 ? "success" : "danger"}>{rubricTotal}% {rubricTotal === 100 ? "✓" : "≠ 100"}</Badge>}>
                <div style={{ display: "flex", flexDirection: "column", gap: space[4] }}>
                  <SliderField label="Technical Depth" hint="" value={scoringRubric.technical} onChange={(v) => setScoringRubric(r => ({ ...r, technical: v }))} color={lv.brand} />
                  <SliderField label="Problem Solving" hint="" value={scoringRubric.problemSolving} onChange={(v) => setScoringRubric(r => ({ ...r, problemSolving: v }))} color={lv.accent} />
                  <SliderField label="Behavioral / EQ" hint="" value={scoringRubric.behavioral} onChange={(v) => setScoringRubric(r => ({ ...r, behavioral: v }))} color={lv.success} />
                  <SliderField label="EQ & Soft Skills" hint="" value={scoringRubric.eq} onChange={(v) => setScoringRubric(r => ({ ...r, eq: v }))} color={lv.warning} />
                </div>
                <div style={{ marginTop: space[4], padding: space[3], background: lv.surfaceSunken, border: `1px solid ${lv.border}`, borderRadius: radius.md }}>
                  <Checkbox checked={sendRubricToClient} onChange={(c) => { setSendRubricToClient(c); setRubricApproved(c); }}>
                    Send rubric to {isCompany ? "your hiring contact" : "the client"} for approval before interviews begin
                    {clientManagerEmail && <span style={{ color: lv.textMuted }}> ({clientManagerEmail})</span>}
                  </Checkbox>
                </div>
              </Card>
            </>
          )}

          {/* ── STEP 4: JD Approval ── */}
          {step === 4 && (
            <>
              <StepHeading title="JD Approval" desc={`Send the job description to your ${isCompany ? "hiring contact" : "client hiring manager"} for review.`} />
              <Card style={{ maxHeight: 300, overflowY: "auto" }}>
                <pre style={{ fontSize: text.sm, color: lv.textBody, lineHeight: 1.7, whiteSpace: "pre-wrap", fontFamily: lv.fontSans, margin: 0 }}>{finalJD}</pre>
              </Card>
              {!jdApproved ? (
                <div style={{ display: "flex", flexDirection: "column", gap: space[4] }}>
                  <Field label={isCompany ? "Hiring contact email" : "Client hiring manager email"}>
                    <div style={{ display: "flex", gap: space[2], flexWrap: "wrap" }}>
                      <Input type="email" aria-label={isCompany ? "Hiring contact email" : "Client hiring manager email"} value={clientManagerEmail} onChange={(e) => (isCompany ? setHiringContact(e.target.value) : setClientManagerEmail(e.target.value))} style={{ flex: "1 1 240px", minWidth: 0 }} placeholder={isCompany ? "hiring.manager@yourcompany.com" : "manager@client.com"} />
                      <Button leftIcon={<Mail size={14} />} onClick={() => { setJdSent(true); toast.success(isCompany ? "JD sent to your hiring contact" : "JD sent to client hiring manager"); }} disabled={jdSent || !clientManagerEmail}>
                        {jdSent ? "Sent" : "Send for Approval"}
                      </Button>
                    </div>
                  </Field>
                  {jdSent && (
                    <Alert tone="warning" title={`Waiting for ${isCompany ? "hiring contact" : "client"} approval…`}
                      action={<Button variant="secondary" size="sm" leftIcon={<Check size={14} />} onClick={() => { setJdApproved(true); setApprovedAt(nowHHMM()); toast.success("JD approved!"); }}>Simulate Approval (Demo)</Button>} />
                  )}
                  <Button variant="tertiary" size="sm" style={{ alignSelf: "flex-start" }} onClick={() => { setJdApproved(true); setApprovedAt(nowHHMM()); }}>
                    Skip approval (continue anyway)
                  </Button>
                </div>
              ) : (
                <Alert tone="success" title="JD Approved">
                  Approved · {approvedAt}. You can now proceed to generate interview questions.
                </Alert>
              )}
            </>
          )}

          {/* ── STEP 5: Question Generation ── */}
          {step === 5 && (
            <>
              <StepHeading title="Question Generation" desc="Claude will generate a tailored question bank for this position." />
              {questionsLoading ? (
                <Card style={{ textAlign: "center", padding: `${space[12]}px ${space[5]}px` }}>
                  <div role="status" aria-live="polite">
                    <span className="lv-spinner lv-spinner--lg" aria-hidden="true" style={{ margin: `0 auto ${space[4]}px`, display: "block", color: lv.brand }} />
                    <p style={{ fontSize: text.md, fontWeight: 600, color: lv.text, margin: 0 }}>Generating interview questions…</p>
                    <p style={{ fontSize: text.sm, color: lv.textMuted, marginTop: 6 }}>Claude is tailoring questions to the approved JD and role context.</p>
                  </div>
                </Card>
              ) : questions ? (
                <EmptyState icon={<CheckCircle2 size={22} color={lv.success} />} title={`${totalQuestions} questions generated`}
                  description="Click Continue to review and approve questions." />
              ) : (
                <EmptyState icon={<FileText size={22} />} title="Ready to generate"
                  description="Claude will create technical, behavioral, scenario, EQ, and whiteboard questions based on the JD."
                  action={<Button leftIcon={<Sparkles size={14} />} onClick={generateQuestions} disabled={questionsLoading}>Generate Questions</Button>} />
              )}
            </>
          )}

          {/* ── STEP 6: Dual Approval ── */}
          {step === 6 && questions && (
            <>
              <StepHeading title="Dual Review & Approval" desc="Tech Lead reviews technical questions · HR reviews behavioral questions." />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: space[3] }}>
                {[{ label: "Tech Lead Review", approved: techApproved, total: techTotal, color: lv.brand }, { label: "HR Review", approved: hrApproved, total: hrTotal, color: lv.success }].map((b) => (
                  <Card key={b.label} style={{ padding: `${space[3]}px ${space[4]}px` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: space[2], fontSize: text.sm }}>
                      <span style={{ fontWeight: 600, color: lv.textBody }}>{b.label}</span>
                      <span style={{ fontFamily: lv.fontMono, color: b.approved === b.total && b.total > 0 ? lv.success : lv.textMuted, fontWeight: 600 }}>{b.approved}/{b.total}</span>
                    </div>
                    <div role="progressbar" aria-label={b.label} aria-valuemin={0} aria-valuemax={b.total} aria-valuenow={b.approved} style={{ height: 6, background: lv.surfaceMuted, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${b.total > 0 ? (b.approved / b.total) * 100 : 0}%`, background: b.color, borderRadius: 3, transition: `width ${lv.dur}` }} />
                    </div>
                  </Card>
                ))}
              </div>
              <div className="lv-seg lv-seg--track" role="tablist" aria-label="Review">
                {([["tech","Tech Lead Review"],["hr","HR Review"]] as const).map(([k,l]) => (
                  <button key={k} type="button" role="tab" aria-selected={reviewTab === k} className="lv-seg__opt" onClick={() => setReviewTab(k)}>{l}</button>
                ))}
              </div>

              {/* Tech Lead tab */}
              {reviewTab === "tech" && (
                <div style={{ display: "flex", flexDirection: "column", gap: space[5] }}>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}><Button variant="secondary" size="sm" leftIcon={<Check size={14} />} onClick={approveAllTech}>Approve All</Button></div>
                  {reviewSection(["technicalQuestions","scenarioQuestions","whiteboardAssessment"] as const,
                    { technicalQuestions: { label: "Technical", type: "technical" }, scenarioQuestions: { label: "Scenario", type: "scenario" }, whiteboardAssessment: { label: "Whiteboard", type: "whiteboard" } },
                    "approvedByTech")}
                  {/* Dynamic Questions panel */}
                  <Card style={{ background: lv.brandSoft, borderColor: lv.brandSoftBorder }}
                    title={<span style={{ display: "inline-flex", alignItems: "center", gap: space[2] }}><span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 4, background: lv.danger }} />Live Dynamic Questions</span>}>
                    <p style={{ fontSize: text.sm, color: lv.textBody, lineHeight: 1.6, margin: `0 0 ${space[2]}px` }}>Generated in real time during the interview based on each candidate&apos;s responses. Cannot be pre-reviewed.</p>
                    <div style={{ display: "flex", alignItems: "center", gap: space[2], fontSize: text.sm, color: lv.textBody }}><Check size={14} color={lv.success} aria-hidden="true" /> Resume project deep dives · Follow-up probes · Coding challenges (if hands-on)</div>
                  </Card>
                </div>
              )}

              {/* HR tab */}
              {reviewTab === "hr" && (
                <div style={{ display: "flex", flexDirection: "column", gap: space[5] }}>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}><Button variant="secondary" size="sm" leftIcon={<Check size={14} />} onClick={approveAllHR}>Approve All</Button></div>
                  {reviewSection(["behavioralQuestions","eqQuestions"] as const,
                    { behavioralQuestions: { label: "Behavioral", type: "behavioral" }, eqQuestions: { label: "EQ / Values", type: "eq" } },
                    "approvedByHR")}
                </div>
              )}

              {!allApproved && (
                <Alert tone="warning">
                  {techApproved < techTotal ? `Tech Lead: ${techTotal - techApproved} question${techTotal - techApproved !== 1 ? "s" : ""} pending` : `HR: ${hrTotal - hrApproved} question${hrTotal - hrApproved !== 1 ? "s" : ""} pending`}
                </Alert>
              )}

              {/* Send for external approval via email */}
              {(techLeadEmail || hrEmail) && !emailApprovalSent && (
                <Button variant="secondary" fullWidth leftIcon={<Mail size={14} />} onClick={sendForApprovalViaEmail} loading={sendingApproval}>
                  {sendingApproval ? "Sending…" : "Send for Approval via Email"}
                </Button>
              )}
              {emailApprovalSent && (
                <Alert tone="success">Approval emails sent — position saved as Pending Approval</Alert>
              )}

              {allApproved && (
                <Button fullWidth onClick={activatePosition} loading={activating} leftIcon={<Sparkles size={16} />}>
                  {activating ? "Saving…" : "Activate Position"}
                </Button>
              )}
            </>
          )}

          {/* ── STEP 7: Activated ── */}
          {step === 7 && (
            <div style={{ textAlign: "center", padding: `${space[10]}px 0` }}>
              <div aria-hidden="true" style={{ width: 80, height: 80, borderRadius: "50%", background: lv.successSoft, border: `2px solid ${lv.successBorder}`, display: "flex", alignItems: "center", justifyContent: "center", margin: `0 auto ${space[6]}px` }}>
                <CheckCircle2 size={36} color={lv.success} />
              </div>
              <h2 style={{ ...stepTitle, fontSize: text["2xl"], marginBottom: space[2] }}>Position is now ACTIVE</h2>
              <p style={{ ...stepDesc, marginBottom: space[8] }}>Your position has been created and is ready for candidates.</p>
              <dl style={{ display: "flex", justifyContent: "center", gap: space[4], marginBottom: space[8], flexWrap: "wrap" }}>
                {[
                  { label: "Position", value: positionTitle },
                  { label: "Questions", value: questions ? String(totalQuestions) : "—" },
                  { label: "Tech Stack", value: mustHaveTech.slice(0, 2).join(", ") || "—" },
                  { label: "L2 Threshold", value: `${l2ScoreThreshold}/100` },
                ].map((s) => (
                  <div key={s.label} className="lv-card" style={{ padding: `${space[3]}px ${space[5]}px`, minWidth: 120, textAlign: "left" }}>
                    <dt><Eyebrow style={{ marginBottom: 4 }}>{s.label}</Eyebrow></dt>
                    <dd style={{ margin: 0, fontSize: text.base, fontWeight: 600, color: lv.text }}>{s.value}</dd>
                  </div>
                ))}
              </dl>
              <div style={{ display: "flex", gap: space[3], justifyContent: "center", flexWrap: "wrap" }}>
                <Button variant="secondary" onClick={onClose}>Back to Positions</Button>
                <Button leftIcon={<Plus size={16} />} disabled={!savedPositionId}
                  onClick={() => { if (!savedPositionId) return; onClose(); router.push(`/positions/${savedPositionId}?upload=1`); }}>Upload Candidates</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom nav ── */}
      {step < 7 && (
        <div style={{ background: lv.surface, borderTop: `1px solid ${lv.border}`, padding: `${space[3]}px ${gutter}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: space[3], flexWrap: "wrap", flexShrink: 0 }}>
          <Button variant="secondary" leftIcon={<ChevronLeft size={16} />} onClick={back} disabled={step === 0}>Back</Button>
          <span aria-live="polite" style={{ fontSize: text.xs, color: lv.textMuted, fontFamily: lv.fontMono }}>Step {step + 1} of {STEPS.length}</span>
          {step === 1 && !jdParsed && finalJD.trim().length > 50 ? (
            // #6 — two clear paths: auto-fill the next page from the JD, or do it by hand.
            <div style={{ display: "flex", gap: space[2], flexWrap: "wrap" }}>
              <Button variant="secondary" onClick={next} disabled={jdParsing}>Continue without parsing</Button>
              <Button onClick={parseJD} loading={jdParsing} leftIcon={<Search size={14} />}>
                {jdParsing ? "Parsing JD…" : <>Parse JD &amp; auto-fill</>}
              </Button>
            </div>
          ) : step === 6 ? null : (
            <Button onClick={next} disabled={(step === 3 && rubricTotal !== 100)} loading={step === 5 && questionsLoading}
              leftIcon={step === 5 && !questions && !questionsLoading ? <Sparkles size={14} /> : undefined}
              rightIcon={!(step === 5 && (questionsLoading || !questions)) && !(step === 4 && !jdApproved) && !(step === 3 && rubricTotal !== 100) && !(step === 1 && finalJD.trim().length < 50) ? <ChevronRight size={16} /> : undefined}>
              {step === 5 && questionsLoading ? "Generating…"
                : step === 5 && !questions ? "Generate Questions"
                : step === 4 && !jdApproved ? "Awaiting Approval…"
                : step === 3 && rubricTotal !== 100 ? `Rubric must total 100% (${rubricTotal}%)`
                : step === 1 && finalJD.trim().length < 50 ? "Add JD to continue"
                : step === 1 && !jdParsed && finalJD.length > 50 ? "Continue without parsing" : "Continue"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
