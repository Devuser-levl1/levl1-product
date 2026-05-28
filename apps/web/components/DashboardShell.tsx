"use client";

import { useAppStore } from "@/store/appStore";
import Sidebar from "./Sidebar";
import Header from "./Header";
import DashboardPage from "./dashboard/DashboardPage";
import PositionsPage from "./positions/PositionsPage";
import CandidatesPage from "./candidates/CandidatesPage";
import InterviewsPage from "./interviews/InterviewsPage";
import ReportsPage from "./reports/ReportsPage";
import SettingsPage from "./settings/SettingsPage";

const SIDEBAR_EXPANDED = 240;
const SIDEBAR_COLLAPSED = 64;

export default function DashboardShell() {
  const { activeSection, sidebarCollapsed } = useAppStore();

  const ml = sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  const renderPage = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardPage />;
      case "positions":
        return <PositionsPage />;
      case "candidates":
        return <CandidatesPage />;
      case "interviews":
        return <InterviewsPage />;
      case "reports":
        return <ReportsPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--bg)",
      }}
    >
      <Sidebar />
      <main
        style={{
          flex: 1,
          marginLeft: ml,
          transition: "margin-left 0.25s ease",
          minHeight: "100vh",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Header />
        <div style={{ flex: 1 }}>
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
