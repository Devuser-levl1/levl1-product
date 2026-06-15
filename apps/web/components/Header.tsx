"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, ChevronDown, Settings, LogOut, User } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import toast from "react-hot-toast";
import TrialBanner from "@/components/ui/TrialBanner";
import UpgradeWallModal from "@/components/ui/UpgradeWallModal";

export default function Header() {
  const router = useRouter();
  const { setActiveSection, agencyPlan, setAgencyPlan } = useAppStore();

  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [entHire, setEntHire] = useState(false);
  const [userName, setUserName] = useState('');
  const [userInitials, setUserInitials] = useState('');

  const [notifications, setNotifications] = useState<Array<{
    id: string; title: string; body: string; createdAt: string; isRead: boolean; link?: string
  }>>([])

  const unreadCount = notifications.filter(n => !n.isRead).length

  const notifsRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Load session / agency plan on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        const { user, agency } = data;
        if (user) {
          const parts = (user.name ?? '').split(' ');
          setUserName(parts[0] + (parts[1] ? ' ' + parts[1][0] + '.' : ''));
          setUserInitials(
            (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')
          );
        }
        if (agency) {
          setAgencyPlan({
            agencyId: agency.id,
            agencyName: agency.name,
            plan: agency.plan,
            interviewsUsed: agency.interviewsUsed,
            interviewsLimit: agency.interviewsLimit,
            trialExpiresAt: agency.trialExpiresAt,
            trialDaysLeft: agency.trialDaysLeft ?? 0,
            subscriptionStatus: agency.subscriptionStatus,
          });
        }
      })
      .catch(() => null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load real notifications
  useEffect(() => {
    fetch('/api/notifications')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data)) setNotifications(data)
      })
      .catch(() => {})
  }, [])

  // Cross-product entitlement (Phase 4) — gates the reciprocal Hire launcher.
  useEffect(() => {
    fetch('/api/levl/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => setEntHire(!!d?.entitlements?.hire))
      .catch(() => {})
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUser(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSignOut() {
    setShowUser(false);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    setAgencyPlan(null);
    router.push('/interviews/login');
  }

  function handleOpenNotifs() {
    setShowNotifs(!showNotifs);
    setShowUser(false);
  }

  async function handleMarkAllRead() {
    await fetch('/api/notifications/read', { method: 'POST' }).catch(() => {})
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setShowNotifs(false)
  }

  function formatRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <>
      <UpgradeWallModal />
    <header
      style={{
        background: "#fff",
        borderBottom: "1px solid #E2E8F0",
        padding: "0 32px",
        position: "sticky",
        top: 0,
        zIndex: 40,
        boxShadow: "0 1px 3px rgba(79,70,229,0.04)",
      }}
    >
      {/* Trial banner — only shown on trial plan */}
      {agencyPlan?.plan === 'trial' && (
        <div style={{ paddingTop: 10 }}>
          <TrialBanner />
        </div>
      )}
      <div style={{ height: 64, display: "flex", alignItems: "center", gap: 16 }}>
      {/* Search — hidden on mobile to save space */}
      <div className="header-search" style={{ flex: 1, maxWidth: 400 }}>
        <button
          onClick={() => toast("Search coming soon")}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "9px 14px",
            borderRadius: 9,
            border: "1px solid #E2E8F0",
            background: "#F8FAFC",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#CBD5E1"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; }}
        >
          <Search size={14} color="#94A3B8" />
          <span style={{ fontSize: 13, color: "#94A3B8" }}>Search candidates, positions…</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#CBD5E1", fontFamily: "var(--font-mono)", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 4, padding: "1px 6px" }}>⌘K</span>
        </button>
      </div>

      {/* Right side controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>

        {/* Levl1 SSO — reciprocal launcher to Hire when entitled to both (Phase 5) */}
        {entHire && (
          <a href="/hire/dashboard" target="_blank" rel="noopener" title="Open Levl1 Hire — you're already signed in"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#4F46E5", background: "rgba(79,70,229,0.08)", border: "1px solid rgba(79,70,229,0.22)", borderRadius: 8, padding: "6px 12px", textDecoration: "none" }}>
            <span style={{ color: "#4F46E5" }}>◆</span> Levl1 Hire <span style={{ fontSize: 11 }}>↗</span>
          </a>
        )}

        {/* Notifications bell */}
        <div ref={notifsRef} style={{ position: "relative" }}>
          <button
            onClick={handleOpenNotifs}
            style={{
              width: 36, height: 36, borderRadius: 9,
              background: showNotifs ? "#EEF2FF" : "transparent",
              border: "1px solid transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", position: "relative", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#F1F5F9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = showNotifs ? "#EEF2FF" : "transparent"; }}
          >
            <Bell size={17} color={showNotifs ? "#4F46E5" : "#64748B"} />
            {unreadCount > 0 && (
              <span style={{
                position: "absolute", top: 6, right: 6,
                width: 8, height: 8, borderRadius: "50%",
                background: "#EF4444",
                border: "1.5px solid #fff",
              }} />
            )}
          </button>

          {showNotifs && (
            <div className="header-notif-panel" style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0,
              width: 340, background: "#fff",
              border: "1px solid #E2E8F0", borderRadius: 14,
              boxShadow: "0 12px 40px rgba(79,70,229,0.12)",
              zIndex: 100, overflow: "hidden",
            }}>
              <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "#4F46E5" }}>Notifications</span>
                <button onClick={handleMarkAllRead} style={{ fontSize: 12, color: "#94A3B8", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Mark all read</button>
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: "24px 18px", textAlign: "center", fontSize: 13, color: "#94A3B8" }}>
                  No notifications yet
                </div>
              ) : notifications.map((n) => (
                <div key={n.id} style={{
                  padding: "12px 18px",
                  borderBottom: "1px solid #F8FAFC",
                  background: !n.isRead ? "rgba(79,70,229,0.02)" : "#fff",
                  cursor: "pointer", transition: "background 0.15s",
                  display: "flex", gap: 12, alignItems: "flex-start",
                }}
                  onClick={() => { if (n.link) router.push(n.link) }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#F8FAFF"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = !n.isRead ? "rgba(79,70,229,0.02)" : "#fff"; }}
                >
                  {!n.isRead && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4F46E5", marginTop: 6, flexShrink: 0 }} />}
                  {n.isRead && <div style={{ width: 6, height: 6, marginTop: 6, flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", marginBottom: 2 }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.5 }}>{n.body}</div>
                    <div style={{ fontSize: 11, color: "#CBD5E1", marginTop: 4 }}>{formatRelativeTime(n.createdAt)}</div>
                  </div>
                </div>
              ))}
              <div style={{ padding: "10px 18px" }}>
                <button onClick={() => setShowNotifs(false)} style={{ width: "100%", fontSize: 12, color: "#7C3AED", fontWeight: 600, background: "none", border: "none", cursor: "pointer", textAlign: "center", padding: "6px 0", fontFamily: "var(--font-sans)" }}>View all notifications</button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: "#E2E8F0" }} />

        {/* User avatar/name dropdown */}
        <div ref={userRef} style={{ position: "relative" }}>
          <button
            onClick={() => { setShowUser(!showUser); setShowNotifs(false); }}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 10px", borderRadius: 9,
              background: showUser ? "#EEF2FF" : "transparent",
              border: "1px solid transparent",
              cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#F1F5F9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = showUser ? "#EEF2FF" : "transparent"; }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: "50%",
              background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0,
            }}>
              {userInitials || '?'}
            </div>
            <div className="header-user-text" style={{ textAlign: "left" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", lineHeight: 1.2 }}>{userName || 'User'}</div>
              <div style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.2 }}>{agencyPlan?.plan === 'trial' ? 'Trial' : 'Admin'}</div>
            </div>
            <ChevronDown className="header-user-chevron" size={13} color="#94A3B8" />
          </button>

          {showUser && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0,
              width: 220, background: "#fff",
              border: "1px solid #E2E8F0", borderRadius: 12,
              boxShadow: "0 8px 32px rgba(79,70,229,0.10)",
              zIndex: 100, overflow: "hidden",
              padding: "6px",
            }}>
              {[
                { icon: User, label: "Profile", action: () => { setActiveSection("settings"); setShowUser(false); router.push("/dashboard"); } },
                { icon: Settings, label: "Settings", action: () => { setActiveSection("settings"); setShowUser(false); router.push("/dashboard"); } },
              ].map(({ icon: Icon, label, action }) => (
                <button
                  key={label}
                  onClick={action}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "9px 12px", borderRadius: 8,
                    background: "transparent", border: "none", cursor: "pointer",
                    fontSize: 13, fontWeight: 500, color: "#475569",
                    fontFamily: "var(--font-sans)", transition: "all 0.12s", textAlign: "left",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#F1F5F9"; e.currentTarget.style.color = "#4F46E5"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#475569"; }}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
              <div style={{ height: 1, background: "#F1F5F9", margin: "4px 0" }} />
              <button
                onClick={handleSignOut}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 8,
                  background: "transparent", border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 500, color: "#EF4444",
                  fontFamily: "var(--font-sans)", transition: "all 0.12s", textAlign: "left",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    </header>
    </>
  );
}
