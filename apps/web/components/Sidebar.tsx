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
  Zap,
  Plus,
  Upload,
  LifeBuoy,
  Radar,
} from "lucide-react";
import { useState } from "react";
import { SupportModal } from "@/components/ui/SupportModal";
import { useAccountType } from "@/hooks/useAccountType";

interface NavItem {
  section: NavSection;
  icon: React.ElementType;
  label: string;
}

const NAV_MAIN: NavItem[] = [
  { section: "dashboard",  icon: LayoutDashboard, label: "Dashboard"  },
  { section: "positions",  icon: Briefcase,       label: "Positions"  },
  { section: "clients",    icon: Building2,       label: "Clients"    },
  { section: "candidates", icon: Users,            label: "Candidates" },
  { section: "interviews", icon: Video,            label: "Interviews" },
  { section: "control-room", icon: Radar,          label: "Control Room" },
  { section: "reports",    icon: BarChart2,        label: "Reports"    },
  { section: "analytics",  icon: LineChart,        label: "Analytics"  },
];

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
  const navMain = isCompany ? NAV_MAIN.filter((n) => n.section !== "clients") : NAV_MAIN;

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
        borderRight: "1px solid rgba(255,255,255,0.07)",
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
          borderBottom: "1px solid rgba(255,255,255,0.08)",
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
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            background: "var(--lv-sidebar-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 4px 12px rgba(124,58,237,0.40)",
          }}
        >
          <Zap size={15} color="white" strokeWidth={2.5} fill="white" />
        </div>

        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.15, delay: 0.05 }}
              style={{ overflow: "hidden", whiteSpace: "nowrap" }}
            >
              <div
                style={{
                  fontFamily: "var(--lv-font-sans)",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#FFFFFF",
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}
              >
                Levl1
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.40)",
                  marginTop: 3,
                  fontFamily: "var(--font-sans)",
                }}
              >
                AI Interview Platform
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
        {/* New Position CTA */}
        <button
          data-tour="new-position"
          onClick={() => {
            setActiveSection("positions");
            setShowNewPositionFlow(true);
          }}
          title={sidebarCollapsed ? "New Position" : undefined}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: sidebarCollapsed ? "center" : "flex-start",
            gap: 8,
            padding: sidebarCollapsed ? "9px" : "9px 12px",
            borderRadius: 6,
            minHeight: 40,
            background: "#FFFFFF",            /* the primary action on the brand panel */
            border: "1px solid #FFFFFF",
            color: "#4338CA",                 /* fixed: white button on the brand panel in both themes */
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "var(--font-sans)",
            boxShadow: "0 2px 8px rgba(15,23,42,0.18)",
            transition: "all 0.15s",
            marginBottom: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#EEF2FF";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#FFFFFF";
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
          onClick={() => {
            setActiveSection("candidates");
            setShowUploadFlow(true);
          }}
          title={sidebarCollapsed ? "Upload Candidates" : undefined}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: sidebarCollapsed ? "center" : "flex-start",
            gap: 8,
            padding: sidebarCollapsed ? "9px" : "9px 12px",
            borderRadius: 8,
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.70)",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "var(--font-sans)",
            transition: "all 0.15s",
            marginBottom: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.12)";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.07)";
            e.currentTarget.style.color = "rgba(255,255,255,0.70)";
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

        {/* Label */}
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(255,255,255,0.25)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "4px 12px 8px",
                fontFamily: "var(--font-sans)",
              }}
            >
              Main Menu
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {navMain.map(({ section, icon: Icon, label }) => {
            const isActive = activeSection === section;
            return (
              <button
                key={section}
                data-tour={`nav-${section}`}
                className={`sidebar-link${isActive ? " active" : ""}`}
                onClick={() => setActiveSection(section)}
                title={sidebarCollapsed ? label : undefined}
                style={{
                  justifyContent: sidebarCollapsed ? "center" : "flex-start",
                  padding: sidebarCollapsed ? "9px" : "9px 12px",
                  minHeight: 38,
                }}
              >
                <Icon size={18} style={{ flexShrink: 0 }} strokeWidth={isActive ? 2.25 : 1.75} />
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

        <div
          style={{
            height: 1,
            background: "rgba(255,255,255,0.07)",
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
                  minHeight: 38,
                }}
              >
                <Icon size={18} style={{ flexShrink: 0 }} strokeWidth={isActive ? 2.25 : 1.75} />
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
          borderTop: "1px solid rgba(255,255,255,0.08)",
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
                background: "rgba(255,255,255,0.06)",
                border: "none",
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: "var(--lv-sidebar-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "white",
                  flexShrink: 0,
                }}
              >
                {userInitials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#fff",
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
                    color: "rgba(255,255,255,0.72)",
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
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.55)",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "var(--font-sans)",
            transition: "all 0.15s",
            minHeight: 34,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.10)";
            e.currentTarget.style.color = "rgba(255,255,255,0.85)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            e.currentTarget.style.color = "rgba(255,255,255,0.55)";
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
          onClick={toggleSidebar}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "7px 10px",
            borderRadius: 8,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.50)",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "var(--font-sans)",
            transition: "all 0.15s",
            minHeight: 34,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            e.currentTarget.style.color = "rgba(255,255,255,0.85)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            e.currentTarget.style.color = "rgba(255,255,255,0.50)";
          }}
        >
          {sidebarCollapsed ? (
            <ChevronRight size={15} />
          ) : (
            <>
              <ChevronLeft size={15} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
