"use client";

import { useState } from "react";
import { useAppStore, Position } from "@/store/appStore";
import { Plus, CheckCircle, Clock, Search, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import NewPositionFlow from "./NewPositionFlow";
import { Tooltip, HelpIcon } from "@/components/ui/Tooltip";

type FilterTab = "all" | Position["status"];

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all",              label: "All"              },
  { key: "active",           label: "Active"           },
  { key: "pending_approval", label: "Pending Approval" },
  { key: "draft",            label: "Draft"            },
  { key: "paused",           label: "Paused"           },
  { key: "closed",           label: "Closed"           },
];

const STATUS_CFG = {
  active:           { label: "Active",           badge: "badge-success" },
  pending_approval: { label: "Pending Approval", badge: "badge-warning" },
  draft:            { label: "Draft",            badge: "badge-muted"   },
  paused:           { label: "Paused",           badge: "badge-muted"   },
  closed:           { label: "Closed",           badge: "badge-danger"  },
} as const;

function ApprovalDot({ approved, role }: { approved: boolean; role: string }) {
  const tip = approved
    ? `${role} has approved the questions`
    : `${role} approval pending — position cannot go live until approved`;
  return (
    <Tooltip content={tip} position="top">
      <div
        style={{
          width: 18, height: 18, borderRadius: "50%",
          background: approved ? "rgba(16,185,129,0.10)" : "#F1F5F9",
          border: `1px solid ${approved ? "rgba(16,185,129,0.25)" : "#E2E8F0"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "default",
        }}
      >
        {approved ? <CheckCircle size={10} color="#10B981" /> : <Clock size={10} color="#94A3B8" />}
      </div>
    </Tooltip>
  );
}

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

  return (
    <>
    {showNewPositionFlow && <NewPositionFlow onClose={() => setShowNewPositionFlow(false)} />}
    <div style={{ padding: "36px 40px", display: "flex", flexDirection: "column", gap: 24, maxWidth: 1280 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "#4F46E5", letterSpacing: "-0.025em" }}>
              Positions
            </h1>
            <HelpIcon
              content="Each position has a dedicated question set approved by your tech lead and HR. Once approved, every candidate for that role uses the same questions."
              position="right"
            />
          </div>
          <p style={{ fontSize: 14, color: "#94A3B8", marginTop: 6, fontWeight: 500 }}>
            Manage open roles and track interview progress.
          </p>
        </div>
        <Tooltip content="Claude AI generates tailored questions based on the JD and tech stack" position="left">
          <button className="btn-primary" onClick={() => setShowNewPositionFlow(true)}>
            <Plus size={16} />
            New Position
          </button>
        </Tooltip>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        {/* Filter tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            background: "#F8FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: 10,
            padding: 4,
          }}
        >
          {TABS.filter((t) => counts[t.key] > 0 || t.key === "all").map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "6px 14px",
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                border: "none",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: 7,
                fontFamily: "var(--font-sans)",
                background: activeTab === tab.key ? "#fff" : "transparent",
                color:      activeTab === tab.key ? "#4F46E5" : "#94A3B8",
                boxShadow:  activeTab === tab.key ? "0 1px 3px rgba(79,70,229,0.08)" : "none",
              }}
            >
              {tab.label}
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  background: activeTab === tab.key ? "rgba(124,58,237,0.1)" : "#F1F5F9",
                  color:      activeTab === tab.key ? "#6D28D9" : "#94A3B8",
                  padding: "1px 6px",
                  borderRadius: 100,
                  fontWeight: 700,
                }}
              >
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search size={14} color="#94A3B8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input
            className="input"
            placeholder="Search positions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36, width: 260, height: 38 }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Table header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.2fr 1.2fr 1fr 130px 70px",
            padding: "10px 20px",
            borderBottom: "1px solid #E2E8F0",
            background: "#F8FAFC",
          }}
        >
          {["Position", "Company", "Department", "Tech Stack", "Status", "View"].map((h) => (
            <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#94A3B8", fontSize: 14 }}>
            No positions match your filters
          </div>
        ) : (
          filtered.map((pos, idx) => {
            const cfg = STATUS_CFG[pos.status];

            return (
              <div
                key={pos.id}
                onClick={() => router.push(`/positions/${pos.id}`)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1.2fr 1.2fr 1fr 130px 70px",
                  padding: "16px 20px",
                  borderBottom: idx < filtered.length - 1 ? "1px solid #F1F5F9" : "none",
                  transition: "background 0.15s",
                  cursor: "pointer",
                  alignItems: "center",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFF")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {/* Position */}
                <div style={{ paddingRight: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#4F46E5", lineHeight: 1.3 }}>
                    {pos.title}
                  </div>
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3 }}>
                    {pos.experienceLevel}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }} data-tour="positions-approval">
                    <ApprovalDot approved={pos.approvals.techLead} role="Tech Lead" />
                    <span style={{ fontSize: 10, color: "#94A3B8" }}>Tech Lead</span>
                    <ApprovalDot approved={pos.approvals.hr} role="HR" />
                    <span style={{ fontSize: 10, color: "#94A3B8" }}>HR</span>
                  </div>
                </div>

                {/* Company */}
                <div style={{ fontSize: 13, color: "#475569", paddingRight: 12 }}>{pos.company}</div>

                {/* Department */}
                <div style={{ fontSize: 13, color: "#475569", paddingRight: 12 }}>{pos.department}</div>

                {/* Tech Stack */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingRight: 12 }}>
                  {pos.techStack.slice(0, 3).map((tech) => (
                    <span
                      key={tech}
                      style={{
                        fontSize: 10,
                        fontFamily: "var(--font-mono)",
                        padding: "2px 7px",
                        borderRadius: 4,
                        background: "#F1F5F9",
                        color: "#475569",
                        border: "1px solid #E2E8F0",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tech}
                    </span>
                  ))}
                  {pos.techStack.length > 3 && (
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: "var(--font-mono)",
                        padding: "2px 7px",
                        borderRadius: 4,
                        background: "#F1F5F9",
                        color: "#94A3B8",
                        border: "1px solid #E2E8F0",
                      }}
                    >
                      +{pos.techStack.length - 3}
                    </span>
                  )}
                </div>

                {/* Status */}
                <div>
                  <Tooltip
                    content={
                      pos.status === "active"           ? "Live — candidates can be invited to interview" :
                      pos.status === "pending_approval" ? "Awaiting tech lead or HR approval before going live" :
                      pos.status === "draft"            ? "Still being set up — questions not yet generated" :
                      pos.status === "paused"           ? "Interviews paused — no new invites will be sent" :
                                                          "Role filled or cancelled — no more interviews"
                    }
                    position="left"
                  >
                    <span className={`badge ${cfg.badge}`} style={{ cursor: "default" }}>{cfg.label}</span>
                  </Tooltip>
                </div>

                {/* View button */}
                <div onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => router.push(`/positions/${pos.id}`)}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "5px 10px", borderRadius: 7,
                      border: "1px solid #E2E8F0", background: "#F8FAFC",
                      color: "#4F46E5", fontSize: 11, fontWeight: 600,
                      cursor: "pointer", fontFamily: "var(--font-sans)",
                      transition: "all 0.12s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#EEF2FF"; e.currentTarget.style.borderColor = "#A5B4FC"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#F8FAFC"; e.currentTarget.style.borderColor = "#E2E8F0"; }}
                  >
                    <ExternalLink size={10} /> View
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
    </>
  );
}
