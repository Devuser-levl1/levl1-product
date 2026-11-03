"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, ChevronDown, Settings, LogOut, User } from "lucide-react";
import { useAppStore } from "@/store/appStore";
import toast from "react-hot-toast";
import TrialBanner from "@/components/ui/TrialBanner";
import UpgradeWallModal from "@/components/ui/UpgradeWallModal";
import { lv } from "@/lib/screen/ui/tokens";

export default function Header() {
  const router = useRouter();
  const { setActiveSection, agencyPlan, setAgencyPlan } = useAppStore();

  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser] = useState(false);
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
      className="app-header"
      style={{
        background: lv.surface,
        borderBottom: `1px solid ${lv.border}`,
        padding: "0 32px",
        position: "sticky",
        top: 0,
        zIndex: 40,
        boxShadow: lv.shadowSm,
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
            borderRadius: 10,
            border: `1px solid ${lv.border}`,
            background: lv.surfaceSunken,
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--lv-border-strong)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--lv-border)"; }}
        >
          <Search size={14} color={lv.textMuted} />
          <span style={{ fontSize: 13, color: lv.textMuted }}>Search candidates, positions…</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: lv.textMuted, fontFamily: lv.fontMono, background: lv.surfaceMuted, border: `1px solid ${lv.border}`, borderRadius: 4, padding: "1px 6px" }}>⌘K</span>
        </button>
      </div>

      {/* Right side controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>

        {/* Notifications bell */}
        <div ref={notifsRef} style={{ position: "relative" }}>
          <button
            onClick={handleOpenNotifs}
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
            aria-expanded={showNotifs}
            aria-haspopup="true"
            style={{
              width: 40, height: 40, borderRadius: 10,
              background: showNotifs ? "var(--lv-brand-soft)" : "transparent",
              border: "1px solid transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", position: "relative", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--lv-surface-muted)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = showNotifs ? "var(--lv-brand-soft)" : "transparent"; }}
          >
            <Bell size={18} color={showNotifs ? lv.brand : lv.textMuted} aria-hidden="true" />
            {unreadCount > 0 && (
              <span aria-hidden="true" style={{
                position: "absolute", top: 8, right: 8,
                width: 8, height: 8, borderRadius: "50%",
                background: lv.danger,
                border: `1.5px solid ${lv.surface}`,
              }} />
            )}
          </button>

          {showNotifs && (
            <div className="header-notif-panel" style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0,
              width: 340, background: lv.surface,
              border: `1px solid ${lv.border}`, borderRadius: 14,
              boxShadow: lv.shadowLg,
              zIndex: 100, overflow: "hidden",
            }}>
              <div style={{ padding: "14px 18px 10px", borderBottom: `1px solid ${lv.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: lv.fontDisplay, fontSize: 14, fontWeight: 700, color: lv.text }}>Notifications</span>
                <button onClick={handleMarkAllRead} className="lv-btn lv-btn--tertiary lv-btn--sm" style={{ height: 28 }}>Mark all read</button>
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: "24px 18px", textAlign: "center", fontSize: 13, color: lv.textMuted }}>
                  You&apos;re all caught up — no notifications yet.
                </div>
              ) : notifications.map((n) => (
                <div key={n.id} style={{
                  padding: "12px 18px",
                  borderBottom: `1px solid ${lv.border}`,
                  background: !n.isRead ? "var(--lv-brand-soft)" : "var(--lv-surface)",
                  cursor: "pointer", transition: "background 0.15s",
                  display: "flex", gap: 12, alignItems: "flex-start",
                }}
                  onClick={() => { if (n.link) router.push(n.link) }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--lv-surface-muted)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = !n.isRead ? "var(--lv-brand-soft)" : "var(--lv-surface)"; }}
                >
                  {!n.isRead && <div aria-label="Unread" style={{ width: 6, height: 6, borderRadius: "50%", background: lv.brand, marginTop: 6, flexShrink: 0 }} />}
                  {n.isRead && <div style={{ width: 6, height: 6, marginTop: 6, flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: lv.text, marginBottom: 2 }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: lv.textBody, lineHeight: 1.5 }}>{n.body}</div>
                    <div style={{ fontSize: 12, color: lv.textMuted, marginTop: 4 }}>{formatRelativeTime(n.createdAt)}</div>
                  </div>
                </div>
              ))}
              <div style={{ padding: "10px 18px" }}>
                <button onClick={() => setShowNotifs(false)} className="lv-btn lv-btn--tertiary lv-btn--sm lv-btn--full">View all notifications</button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div aria-hidden="true" style={{ width: 1, height: 20, background: lv.border }} />

        {/* User avatar/name dropdown */}
        <div ref={userRef} style={{ position: "relative" }}>
          <button
            onClick={() => { setShowUser(!showUser); setShowNotifs(false); }}
            aria-label="Account menu"
            aria-expanded={showUser}
            aria-haspopup="menu"
            style={{
              display: "flex", alignItems: "center", gap: 8, minHeight: 44,
              padding: "6px 10px", borderRadius: 10,
              background: showUser ? "var(--lv-brand-soft)" : "transparent",
              border: "1px solid transparent",
              cursor: "pointer", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--lv-surface-muted)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = showUser ? "var(--lv-brand-soft)" : "transparent"; }}
          >
            <div aria-hidden="true" style={{
              width: 30, height: 30, borderRadius: "50%",
              background: lv.gradientBrand,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0,
            }}>
              {userInitials || '?'}
            </div>
            <div className="header-user-text" style={{ textAlign: "left" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: lv.text, lineHeight: 1.2 }}>{userName || 'User'}</div>
              <div style={{ fontSize: 12, color: lv.textMuted, lineHeight: 1.2 }}>{agencyPlan?.plan === 'trial' ? 'Trial' : 'Admin'}</div>
            </div>
            <ChevronDown className="header-user-chevron" size={13} color={lv.textMuted} aria-hidden="true" />
          </button>

          {showUser && (
            <div role="menu" style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0,
              width: 220, background: lv.surface,
              border: `1px solid ${lv.border}`, borderRadius: 12,
              boxShadow: lv.shadowLg,
              zIndex: 100, overflow: "hidden",
              padding: "6px",
            }}>
              {[
                { icon: User, label: "Profile", action: () => { setActiveSection("settings"); setShowUser(false); router.push("/dashboard"); } },
                { icon: Settings, label: "Settings", action: () => { setActiveSection("settings"); setShowUser(false); router.push("/dashboard"); } },
              ].map(({ icon: Icon, label, action }) => (
                <button
                  key={label}
                  role="menuitem"
                  onClick={action}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10, minHeight: 40,
                    padding: "9px 12px", borderRadius: 8,
                    background: "transparent", border: "none", cursor: "pointer",
                    fontSize: 13, fontWeight: 500, color: lv.textBody,
                    fontFamily: "var(--font-sans)", transition: "all 0.12s", textAlign: "left",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--lv-surface-muted)"; e.currentTarget.style.color = "var(--lv-text)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--lv-text-body)"; }}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
              <div role="separator" style={{ height: 1, background: lv.border, margin: "4px 0" }} />
              <button
                role="menuitem"
                onClick={handleSignOut}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10, minHeight: 40,
                  padding: "9px 12px", borderRadius: 8,
                  background: "transparent", border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 500, color: lv.danger,
                  fontFamily: "var(--font-sans)", transition: "all 0.12s", textAlign: "left",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--lv-danger-soft)"; }}
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
