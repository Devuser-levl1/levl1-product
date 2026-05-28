"use client";

import DashboardShell from "@/components/DashboardShell";
import { useEffect } from "react";
import { useAppStore } from "@/store/appStore";

export default function SettingsPage() {
  const { setActiveSection } = useAppStore();

  useEffect(() => {
    setActiveSection("settings");
  }, [setActiveSection]);

  return <DashboardShell />;
}
