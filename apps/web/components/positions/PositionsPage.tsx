"use client";

import { useState } from "react";
import { useAppStore, Position } from "@/store/appStore";
import { Plus, CheckCircle, Clock, Search, ArrowRight, Briefcase } from "lucide-react";
import { useRouter } from "next/navigation";
import NewPositionFlow from "./NewPositionFlow";
import { Tooltip, HelpIcon } from "@/components/ui/Tooltip";
import { Page, PageHeader, Button, Input, Tabs, Table, Badge, EmptyState, type Tone, type Column } from "@/components/screen/ui";
import { lv, space, text } from "@/lib/screen/ui/tokens";

// Design-System Pass 3 (group 2a): canonical components + tokens. Filtering,
// search and navigation are unchanged.

type FilterTab = "all" | Position["status"];

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all",              label: "All"              },
  { key: "active",           label: "Active"           },
  { key: "pending_approval", label: "Pending Approval" },
  { key: "draft",            label: "Draft"            },
  { key: "paused",           label: "Paused"           },
  { key: "closed",           label: "Closed"           },
];

const STATUS_CFG: Record<string, { label: string; tone: Tone; tip: string }> = {
  active:           { label: "Active",           tone: "success", tip: "Live — candidates can be invited to interview" },
  pending_approval: { label: "Pending Approval", tone: "warning", tip: "Awaiting tech lead or HR approval before going live" },
  draft:            { label: "Draft",            tone: "neutral", tip: "Still being set up — questions not yet generated" },
  paused:           { label: "Paused",           tone: "neutral", tip: "Interviews paused — no new invites will be sent" },
  closed:           { label: "Closed",           tone: "danger",  tip: "Position filled or cancelled — no more interviews" },
  won:              { label: "Won",              tone: "success", tip: "Filled — a candidate from this position was selected" },
  lost:             { label: "Lost",             tone: "danger",  tip: "Not filled — the requirement was lost or cancelled" },
};

function ApprovalDot({ approved, role }: { approved: boolean; role: string }) {
  const tip = approved
    ? `${role} has approved the questions`
    : `${role} approval pending — position cannot go live until approved`;
  return (
    <Tooltip content={tip} position="top">
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: text.xs, color: approved ? lv.success : lv.textMuted, cursor: "default" }}>
        {approved ? <CheckCircle size={12} aria-hidden="true" /> : <Clock size={12} aria-hidden="true" />}
        {role}<span className="lv-sr-only">{approved ? " approved" : " pending"}</span>
      </span>
    </Tooltip>
  );
}

const chip: React.CSSProperties = {
  fontSize: text.xs, fontFamily: lv.fontMono, padding: "2px 7px", borderRadius: 6,
  background: lv.surfaceMuted, color: lv.textBody, border: `1px solid ${lv.border}`, whiteSpace: "nowrap",
};

export default function PositionsPage() {
  const { positions, showNewPositionFlow, setShowNewPositionFlow } = useAppStore();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [search, setSearch]       = useState("");
  const router = useRouter();

  const filtered = positions.filter((p) => {
    const matchesTab    = activeTab === "all" || p.status === activeTab;
    const matchesSearch =
      search === "" ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.company.toLowerCase().includes(search.toLowerCase()) ||
      p.department.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const counts = TABS.reduce((acc, tab) => {
    acc[tab.key] =
      tab.key === "all"
        ? positions.length
        : positions.filter((p) => p.status === tab.key).length;
    return acc;
  }, {} as Record<FilterTab, number>);

  const open = (id: string) => router.push(`/positions/${id}`);

  const columns: Column<Position>[] = [
    { key: "position", header: "Position", render: (pos) => (
      <div style={{ minWidth: 200 }}>
        <div style={{ fontSize: text.base, fontWeight: 600, color: lv.text, lineHeight: 1.3 }}>{pos.title}</div>
        <div style={{ fontSize: text.xs, color: lv.textMuted, marginTop: 2 }}>{pos.experienceLevel}</div>
        <div style={{ display: "flex", alignItems: "center", gap: space[3], marginTop: space[2] }} data-tour="positions-approval">
          <ApprovalDot approved={pos.approvals.techLead} role="Tech Lead" />
          <ApprovalDot approved={pos.approvals.hr} role="HR" />
        </div>
      </div>
    ) },
    { key: "company", header: "Company", render: (pos) => pos.company },
    { key: "department", header: "Department", render: (pos) => pos.department || "—" },
    { key: "stack", header: "Tech Stack", render: (pos) => (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, minWidth: 140 }}>
        {pos.techStack.slice(0, 3).map((tech) => <span key={tech} style={chip}>{tech}</span>)}
        {pos.techStack.length > 3 && <span style={{ ...chip, color: lv.textMuted }}>+{pos.techStack.length - 3}</span>}
      </div>
    ) },
    { key: "status", header: "Status", render: (pos) => {
      const cfg = STATUS_CFG[pos.status];
      return cfg ? <Tooltip content={cfg.tip} position="left"><Badge tone={cfg.tone}>{cfg.label}</Badge></Tooltip> : null;
    } },
    { key: "open", header: <span className="lv-sr-only">Open</span>, width: 60, render: (pos) => (
      <span onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="sm" iconOnly aria-label={`Open ${pos.title}`} onClick={() => open(pos.id)}><ArrowRight size={16} /></Button>
      </span>
    ) },
  ];

  return (
    <>
    {showNewPositionFlow && <NewPositionFlow onClose={() => setShowNewPositionFlow(false)} />}
    <Page>
      <PageHeader
        title={<span style={{ display: "inline-flex", alignItems: "center", gap: space[2] }}>Positions
          <HelpIcon content="Each position has a dedicated question set approved by your tech lead and HR. Once approved, every candidate for that position uses the same questions." position="right" />
        </span>}
        description="Manage open positions and track interview progress."
        actions={
          <Tooltip content="Claude AI generates tailored questions based on the JD and tech stack" position="left">
            <Button leftIcon={<Plus size={16} />} onClick={() => setShowNewPositionFlow(true)}>New Position</Button>
          </Tooltip>
        }
      />

      {positions.length === 0 ? (
        <EmptyState icon={<Briefcase size={22} />} title="No positions yet"
          description="Create your first position — paste or generate a JD and Levl1 builds a tailored interview for it."
          action={<Button leftIcon={<Plus size={16} />} onClick={() => setShowNewPositionFlow(true)}>Create position</Button>} />
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: space[4], flexWrap: "wrap", marginBottom: space[4] }}>
            <div style={{ flex: "1 1 320px", minWidth: 0 }}>
              <Tabs label="Filter positions by status" value={activeTab} onChange={setActiveTab}
                items={TABS.filter((t) => counts[t.key] > 0 || t.key === "all").map((t) => ({ key: t.key, label: t.label, count: counts[t.key] }))} />
            </div>
            <div style={{ position: "relative", width: 260, maxWidth: "100%" }}>
              <Search size={14} color={lv.textMuted} aria-hidden="true" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
              <Input aria-label="Search positions" placeholder="Search positions…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 34 }} />
            </div>
          </div>

          <Table<Position>
            caption="Positions"
            columns={columns}
            rows={filtered}
            rowKey={(p) => p.id}
            onRowClick={(p) => open(p.id)}
            empty={<EmptyState icon={<Search size={20} />} title="No positions match"
              description="Try a different status or search term."
              action={<Button variant="secondary" size="sm" onClick={() => { setActiveTab("all"); setSearch(""); }}>Clear filters</Button>} />}
          />
        </>
      )}
    </Page>
    </>
  );
}
