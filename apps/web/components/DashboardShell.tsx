"use client";

import dynamic from "next/dynamic";
import { useAppStore } from "@/store/appStore";
import { useDataLoader } from "@/hooks/useDataLoader";
import Sidebar from "./Sidebar";
import Header from "./Header";
import DashboardPage from "./dashboard/DashboardPage";
import PositionsPage from "./positions/PositionsPage";
import CandidatesPage from "./candidates/CandidatesPage";
import InterviewsPage from "./interviews/InterviewsPage";
import ReportsPage from "./reports/ReportsPage";
import SettingsPage from "./settings/SettingsPage";
// Shepherd.js accesses document/window at import time — must be client-only
const ProductTour = dynamic(
  () => import("./ui/ProductTour").then((m) => ({ default: m.ProductTour })),
  { ssr: false }
);
import { FeedbackWidget } from "./ui/FeedbackWidget";
import { BottomNav } from "./layout/BottomNav";

// Loaded client-side only — uses window.matchMedia, localStorage, navigator
const InstallPrompt = dynamic(
  () => import("./ui/InstallPrompt").then((m) => ({ default: m.InstallPrompt })),
  { ssr: false }
);

const SIDEBAR_EXPANDED  = 240;
const SIDEBAR_COLLAPSED = 64;

export default function DashboardShell() {
  useDataLoader();
  const { activeSection, sidebarCollapsed, setActiveSection, setShowNewPositionFlow } = useAppStore();

  const ml = sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  const handleOpenNewPosition = () => {
    setActiveSection("positions");
    setShowNewPositionFlow(true);
  };

  const renderPage = () => {
    switch (activeSection) {
      case "dashboard":  return <DashboardPage />;
      case "positions":  return <PositionsPage />;
      case "candidates": return <CandidatesPage />;
      case "interviews": return <InterviewsPage />;
      case "reports":    return <ReportsPage />;
      case "settings":   return <SettingsPage />;
      default:           return <DashboardPage />;
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      {/* Sidebar: hidden on mobile via CSS [data-sidebar] selector */}
      <div data-sidebar>
        <Sidebar />
      </div>

      <main
        data-main-content
        style={{
          flex: 1,
          marginLeft: ml,
          transition: "margin-left 0.25s ease",
          minHeight: "100vh",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        className="mobile-nav-pad"
      >
        <Header />
        <div style={{ flex: 1 }}>
          {renderPage()}
        </div>
      </main>

      {/* Global overlays */}
      <ProductTour onOpenNewPosition={handleOpenNewPosition} />
      <FeedbackWidget />
      <BottomNav />
      <InstallPrompt />
    </div>
  );
}
