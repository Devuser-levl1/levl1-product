"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useAppStore, NavSection } from "@/store/appStore";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Building2,
  Users,
  Video,
  BarChart2,
  LineChart,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  Upload,
  LifeBuoy,
  Radar,
  Library,
  ListChecks,
  ClipboardList,
  UserRound,
  ChevronDown,
  AudioLines,
} from "lucide-react";
import { useEffect, useState } from "react";
import { SupportModal } from "@/components/ui/SupportModal";
import { useAccountType } from "@/hooks/useAccountType";
import { ScreenLogo, ScreenIcon } from "@/components/screen/brand/ScreenLogo";
import { PRODUCTS } from "@/config/site";

interface NavItem {
  section: NavSection;
  icon: React.ElementType;
  label: string;
}

// ── Navigation model ─────────────────────────────────────────────────────
// WORKSPACE + LIBRARY are shared by every assessment product (a position and
// its candidates exist before you choose HOW to assess them; rubrics and tasks
// score any format). PRODUCTS holds what is specific to one product: today only
// Screen (AI-led interviews) is live; the others are announced as coming soon.
const NAV_WORKSPACE: NavItem[] = [
  { section: "dashboard",  icon: LayoutDashboard, label: "Dashboard"  },
  { section: "positions",  icon: Briefcase,       label: "Positions"  },
  { section: "candidates", icon: Users,           label: "Candidates" },
  { section: "clients",    icon: Building2,       label: "Clients"    },
  { section: "reports",    icon: BarChart2,       label: "Reports"    },
  { section: "analytics",  icon: LineChart,       label: "Analytics"  },
];

const NAV_SCREEN: NavItem[] = [
  { section: "interviews",   icon: Video, label: "Sessions"     },
  { section: "control-room", icon: Radar, label: "Control Room" },
];

// Product names come from the ONE names config (config/site.ts → PRODUCTS),
// shared with the marketing site. Stage 2 Solve, Stage 3 Interview.
const NAV_COMING_SOON: { key: string; icon: React.ElementType; label: string; tagline: string }[] = [
  { key: "solve",     icon: ClipboardList, label: PRODUCTS.takeHome.name,      tagline: PRODUCTS.takeHome.tagline },
  { key: "interview", icon: UserRound,     label: PRODUCTS.liveInterview.name, tagline: PRODUCTS.liveInterview.tagline },
];

const NAV_LIBRARY: NavItem[] = [
  { section: "rubric-library", icon: ListChecks, label: "Rubric library" },
  { section: "task-bank",      icon: Library,    label: "Task bank"      },
];

const SCREEN_OPEN_KEY = "lv.nav.screenOpen";

const NAV_BOTTOM: NavItem[] = [
  { section: "settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const router = useRouter();
  const { activeSection, setActiveSection, sidebarCollapsed, toggleSidebar, setShowNewPositionFlow, setShowUploadFlow } =
    useAppStore();
  const [supportOpen, setSupportOpen] = useState(false);

  const sidebarWidth = sidebarCollapsed ? 64 : 240;
  // Clients is an agency concept — hidden for in-house (company) accounts.
  // Reads the live account type, so a Settings change applies immediately.
  const { isCompany } = useAccountType();
  // Signed-in user for the footer (was hard-coded to one person's email).
  const accountUser = useAppStore((s) => s.account?.user);
  const userInitials = (accountUser?.name || accountUser?.email || "?").split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  const navWorkspace = isCompany ? NAV_WORKSPACE.filter((n) => n.section !== "clients") : NAV_WORKSPACE;
  // Screen group: open by default, remembered per browser, auto-opens when one of its pages is active.
  const [screenOpen, setScreenOpen] = useState(true);
  useEffect(() => {
    try { const v = window.localStorage.getItem(SCREEN_OPEN_KEY); if (v !== null) setScreenOpen(v === "1"); } catch { /* storage unavailable */ }
  }, []);
  const screenActive = NAV_SCREEN.some((n) => n.section === activeSection);
  useEffect(() => { if (screenActive) setScreenOpen(true); }, [screenActive]);
  const toggleScreen = () => setScreenOpen((o) => {
    const next = !o;
    try { window.localStorage.setItem(SCREEN_OPEN_KEY, next ? "1" : "0"); } catch { /* storage unavailable */ }
    return next;
  });

  const label = (text: string, extra?: React.ReactNode) => (
    <AnimatePresence>
      {!sidebarCollapsed && (
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12, delay: 0.04 }}
          style={{ whiteSpace: "nowrap", fontFamily: "var(--font-sans)", display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{text}</span>{extra}
        </motion.span>
      )}
    </AnimatePresence>
  );
  const sectionHeading = (text: string) => sidebarCollapsed
    ? <div aria-hidden="true" style={{ height: 1, background: "var(--lv-border)", margin: "10px 6px" }} />
    : <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--lv-text-muted)", padding: "12px 12px 6px", fontFamily: "var(--font-sans)" }}>{text}</div>;
  const navLink = ({ section, icon: Icon, label: text }: NavItem, indent = false) => {
    const isActive = activeSection === section;
    return (
      <button
        key={section}
        data-tour={`nav-${section}`}
        className={`sidebar-link${isActive ? " active" : ""}`}
        onClick={() => setActiveSection(section)}
        aria-current={isActive ? "page" : undefined}
        title={sidebarCollapsed ? text : undefined}
        style={{ justifyContent: sidebarCollapsed ? "center" : "flex-start", padding: sidebarCollapsed ? "9px" : indent ? "8px 12px 8px 30px" : "9px 12px", minHeight: 34 }}
      >
        <Icon size={16} style={{ flexShrink: 0 }} strokeWidth={isActive ? 2 : 1.75} />
        {label(text)}
      </button>
    );
  };

  return (
    <motion.aside
      className="desktop-only app-sidebar"
      animate={{ width: sidebarWidth }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        background: "var(--lv-sidebar-bg)",
        borderRight: "1px solid var(--lv-border)",
        zIndex: 50,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />

      {/* ── Brand ── */}
      <button
        data-tour="logo"
        onClick={() => { setActiveSection("dashboard"); router.push("/dashboard"); }}
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 12,
          flexShrink: 0,
          background: "none",
          border: "none",
          borderRadius: 0,
          cursor: "pointer",
          width: "100%",
          textAlign: "left",
        }}
      >
        {/* Levl1 brand mark (components/screen/brand/ScreenLogo.tsx). */}
        {sidebarCollapsed ? (
          <ScreenIcon size={32} />
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.15, delay: 0.05 }}
              style={{ overflow: "hidden" }}
            >
              <ScreenLogo height={34} tone="auto" />
            </motion.div>
          </AnimatePresence>
        )}
      </button>

      {/* ── Navigation ── */}
      <nav
        style={{
          flex: 1,
          padding: "12px 8px",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {/* New Position CTA — the one primary action */}
        <button
          data-tour="new-position"
          className="lv-btn lv-btn--primary lv-btn--full"
          onClick={() => {
            setActiveSection("positions");
            setShowNewPositionFlow(true);
          }}
          title={sidebarCollapsed ? "New Position" : undefined}
          style={{
            justifyContent: sidebarCollapsed ? "center" : "flex-start",
            padding: sidebarCollapsed ? 0 : "0 12px",
            fontSize: 13,
            marginBottom: 6,
          }}
        >
          <Plus size={16} style={{ flexShrink: 0 }} />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12, delay: 0.04 }} style={{ whiteSpace: "nowrap" }}>
                New Position
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Upload Candidates CTA */}
        <button
          className="lv-btn lv-btn--secondary lv-btn--full"
          onClick={() => {
            setActiveSection("candidates");
            setShowUploadFlow(true);
          }}
          title={sidebarCollapsed ? "Upload Candidates" : undefined}
          style={{
            justifyContent: sidebarCollapsed ? "center" : "flex-start",
            padding: sidebarCollapsed ? 0 : "0 12px",
            fontSize: 13,
            marginBottom: 14,
          }}
        >
          <Upload size={16} style={{ flexShrink: 0 }} />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12, delay: 0.04 }} style={{ whiteSpace: "nowrap" }}>
                Upload Candidates
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* ── Workspace (shared by every product) ── */}
        {sectionHeading("Workspace")}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {navWorkspace.map((n) => navLink(n))}
        </div>

        {/* ── Products ── */}
        {sectionHeading("Products")}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Screen — AI-led interviews (live) */}
          {!sidebarCollapsed && (
            <button type="button" className={`sidebar-link${screenActive && !screenOpen ? " active" : ""}`} onClick={toggleScreen}
              aria-expanded={screenOpen} aria-controls="nav-screen-group"
              style={{ justifyContent: "flex-start", padding: "9px 12px", minHeight: 34 }}>
              <AudioLines size={16} style={{ flexShrink: 0 }} strokeWidth={1.75} />
              {label(PRODUCTS.screen.name, <ChevronDown size={14} aria-hidden="true" style={{ marginLeft: "auto", flexShrink: 0, transform: screenOpen ? "none" : "rotate(-90deg)", transition: "transform 0.15s" }} />)}
            </button>
          )}
          {(screenOpen || sidebarCollapsed) && (
            <div id="nav-screen-group" role="group" aria-label={PRODUCTS.screen.name} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {NAV_SCREEN.map((n) => navLink(n, true))}
            </div>
          )}
          {/* Announced products — not clickable yet */}
          {NAV_COMING_SOON.map(({ key, icon: Icon, label: text, tagline }) => (
            <div key={key} className="sidebar-link" role="link" aria-disabled="true" title={`${text} — ${tagline}. Coming soon.`}
              style={{ justifyContent: sidebarCollapsed ? "center" : "flex-start", padding: sidebarCollapsed ? "9px" : "7px 12px", minHeight: 34, cursor: "default", opacity: 0.7 }}>
              <Icon size={16} style={{ flexShrink: 0 }} strokeWidth={1.75} />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12, delay: 0.04 }}
                    style={{ display: "flex", flexDirection: "column", minWidth: 0, fontFamily: "var(--font-sans)", lineHeight: 1.25 }}>
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{text}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: "var(--lv-text-muted)" }}>Coming soon</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* ── Library (shared content) ── */}
        {sectionHeading("Library")}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_LIBRARY.map((n) => navLink(n))}
        </div>

        <div
          style={{
            height: 1,
            background: "var(--lv-border)",
            margin: "12px 4px",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_BOTTOM.map(({ section, icon: Icon, label }) => {
            const isActive = activeSection === section;
            return (
              <button
                key={section}
                className={`sidebar-link${isActive ? " active" : ""}`}
                onClick={() => setActiveSection(section)}
                title={sidebarCollapsed ? label : undefined}
                style={{
                  justifyContent: sidebarCollapsed ? "center" : "flex-start",
                  padding: sidebarCollapsed ? "9px" : "9px 12px",
                  minHeight: 34,
                }}
              >
                <Icon size={16} style={{ flexShrink: 0 }} strokeWidth={isActive ? 2 : 1.75} />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.12, delay: 0.04 }}
                      style={{ whiteSpace: "nowrap", fontFamily: "var(--font-sans)" }}
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Footer ── */}
      <div
        style={{
          borderTop: "1px solid var(--lv-border)",
          padding: "12px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          flexShrink: 0,
        }}
      >
        {/* User row */}
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.button
              className="lv-side-item"
              onClick={() => setActiveSection("settings")}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: "var(--lv-surface-muted)",
                  border: "1px solid var(--lv-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--lv-text-body)",
                  flexShrink: 0,
                }}
              >
                {userInitials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--lv-text)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {accountUser?.name || "Your account"}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--lv-text-muted)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginTop: 1,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {accountUser?.email || "Settings"}
                </div>
              </div>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Help & Support */}
        <button
          className="lv-side-item"
          onClick={() => setSupportOpen(true)}
          title={sidebarCollapsed ? "Help & Support" : undefined}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: sidebarCollapsed ? "center" : "flex-start",
            gap: 8,
            padding: sidebarCollapsed ? "7px" : "7px 10px",
            borderRadius: 8,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "var(--font-sans)",
            transition: "all 0.15s",
            minHeight: 34,
          }}
        >
          <LifeBuoy size={14} style={{ flexShrink: 0 }} />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} style={{ whiteSpace: "nowrap" }}>
                Help &amp; Support
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Collapse toggle */}
        <button
          className="lv-side-item"
          onClick={toggleSidebar}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "7px 10px",
            borderRadius: 8,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "var(--font-sans)",
            transition: "all 0.15s",
            minHeight: 34,
          }}
        >
          {sidebarCollapsed ? (
            <ChevronRight size={16} />
          ) : (
            <>
              <ChevronLeft size={16} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
