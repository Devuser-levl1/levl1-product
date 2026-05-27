"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useAppStore, NavSection } from "@/store/appStore";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Video,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  Plus,
  Upload,
} from "lucide-react";

interface NavItem {
  section: NavSection;
  icon: React.ElementType;
  label: string;
}

const NAV_MAIN: NavItem[] = [
  { section: "dashboard",  icon: LayoutDashboard, label: "Dashboard"  },
  { section: "positions",  icon: Briefcase,       label: "Positions"  },
  { section: "candidates", icon: Users,            label: "Candidates" },
  { section: "interviews", icon: Video,            label: "Interviews" },
  { section: "reports",    icon: BarChart2,        label: "Reports"    },
];

const NAV_BOTTOM: NavItem[] = [
  { section: "settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const { activeSection, setActiveSection, sidebarCollapsed, toggleSidebar, setShowNewPositionFlow, setShowUploadFlow } =
    useAppStore();

  const sidebarWidth = sidebarCollapsed ? 64 : 240;

  return (
    <motion.aside
      animate={{ width: sidebarWidth }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        background: "#4F46E5",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        zIndex: 50,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Brand ── */}
      <div
        style={{
          height: 64,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: "linear-gradient(135deg, #7C3AED 0%, #C4B5FD 100%)",
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
                  fontFamily: "var(--font-display)",
                  fontSize: 15,
                  fontWeight: 700,
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
      </div>

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
            borderRadius: 8,
            background: "rgba(124,58,237,0.18)",
            border: "1px solid rgba(124,58,237,0.30)",
            color: "#C4B5FD",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "var(--font-sans)",
            transition: "all 0.15s",
            marginBottom: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(124,58,237,0.28)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(124,58,237,0.18)";
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
                fontSize: 10,
                fontWeight: 700,
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
          {NAV_MAIN.map(({ section, icon: Icon, label }) => {
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
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 9,
                background: "rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #7C3AED 0%, #C4B5FD 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "white",
                  flexShrink: 0,
                }}
              >
                R
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
                  Recruiter
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.40)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginTop: 1,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  abma3005@gmail.com
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
