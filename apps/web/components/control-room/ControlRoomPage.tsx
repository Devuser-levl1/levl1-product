"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Radar, ShieldCheck, ShieldAlert, ShieldQuestion, User, Users, UserX, VideoOff, Mic, MicOff,
  Keyboard, Wifi, WifiOff, Flag, Bell, BellOff, X, PlayCircle, Clock, Loader2, ChevronRight,
} from "lucide-react";
import type { Health, HealthLevel, HumanPresence } from "@/lib/screen/control-room/health";

// ── Recruiter Control Room (Screen) ────────────────────────────────────────
// Exception-first: problem sessions sort to the top in large red/amber tiles
// and raise an alert; healthy sessions recede into a compact strip.
// Live updates = polling ONE aggregated endpoint (/api/control-room) every
// POLL_MS; paused while the tab is hidden.

const POLL_MS = 4000;
const DETAIL_POLL_MS = 3000;

const C = {
  brand: "#4F46E5", brandSoft: "#EEF2FF", ink: "#0F172A", body: "#475569", muted: "#94A3B8",
  line: "#E2E8F0", surface: "#FFFFFF", bg: "#F8FAFC",
  red: "#DC2626", redSoft: "#FEF2F2", redLine: "#FECACA",
  amber: "#D97706", amberSoft: "#FFFBEB", amberLine: "#FDE68A",
  green: "#059669", greenSoft: "#ECFDF5", greenLine: "#A7F3D0",
};

interface Tile {
  id: string; isDemo: boolean; candidate: string; position: string; company: string;
  startedAt: string | null; plannedMinutes: number; phase: string | null;
  questionIndex: number | null; questionCount: number | null; lastBeatAt: string | null;
  totalFlags: number; recentFlags: number; health: Health;
}
interface Ended {
  id: string; candidate: string; position: string; company: string; completedAt: string;
  terminationReason: string | null; hasRecording: boolean; integrityEvents: number;
}
interface RoomData {
  serverTime: string; tiles: Tile[]; demoTiles: Tile[]; recentlyEnded: Ended[];
  counts: { live: number; alert: number; watch: number; ok: number; humanPresent: number };
}

const PHASE_LABEL: Record<string, string> = {
  intro: "Intro", questioning: "Asking", speaking: "Interviewer speaking", listening: "Candidate's turn",
  processing: "Evaluating", closing: "Wrapping up", completed: "Completed", waiting: "Waiting",
};

function clock(fromIso: string | null, now: number) {
  if (!fromIso) return "—";
  const s = Math.max(0, Math.floor((now - new Date(fromIso).getTime()) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/* ════════════════════════════════════════════════════════════════════ */
export function ControlRoomPage() {
  const [data, setData] = useState<RoomData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(false);
  const [sound, setSound] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [lastFetch, setLastFetch] = useState<number | null>(null);
  const alertedRef = useRef<Set<string>>(new Set());
  const firstLoadRef = useRef(true);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const closeDrawer = useCallback(() => setOpenId(null), []);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/control-room${showDemo ? "?demo=1" : ""}`, { cache: "no-store" });
      if (!r.ok) throw new Error(r.status === 401 ? "Your session expired — sign in again." : "Couldn't load live sessions.");
      const d = (await r.json()) as RoomData;
      setData(d);
      setError(null);
      setLastFetch(Date.now());

      // Alert on NEW entries into the red state (not on every poll).
      const alerting = new Set(d.tiles.filter((t) => t.health.level === "alert").map((t) => t.id));
      const fresh = d.tiles.filter((t) => alerting.has(t.id) && !alertedRef.current.has(t.id));
      alertedRef.current = alerting;
      if (!firstLoadRef.current && fresh.length) {
        for (const t of fresh) {
          toast.error(`${t.candidate}: ${t.health.reasons[0]?.label ?? "needs attention"}`, { id: `cr_${t.id}`, duration: 6000 });
        }
        if (soundRef.current) chime();
      }
      firstLoadRef.current = false;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load live sessions.");
    }
  }, [showDemo]);

  useEffect(() => {
    void load();
    const iv = setInterval(() => { if (!document.hidden) void load(); }, POLL_MS);
    const onVis = () => { if (!document.hidden) void load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", onVis); };
  }, [load]);

  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv); }, []);

  // Tab title badge so an alert is visible from another tab.
  useEffect(() => {
    const base = "Control Room · Levl1";
    const n = data?.counts.alert ?? 0;
    document.title = n ? `(${n}) ${base}` : base;
    return () => { document.title = "Levl1"; };
  }, [data?.counts.alert]);

  const groups = useMemo(() => {
    const tiles = data?.tiles ?? [];
    return {
      alert: tiles.filter((t) => t.health.level === "alert"),
      watch: tiles.filter((t) => t.health.level === "watch"),
      ok: tiles.filter((t) => t.health.level === "ok"),
    };
  }, [data]);

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1480, margin: "0 auto", fontFamily: "var(--font-sans)" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: C.brandSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Radar size={18} color={C.brand} />
            </div>
            <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>Control Room</h1>
            <LivePulse ok={!error} />
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 13.5, color: C.body }}>
            Every live interview at a glance. Problems rise to the top — you only need to look where it&apos;s red.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: C.muted }}>
            {lastFetch ? `Updated ${Math.max(0, Math.round((now - lastFetch) / 1000))}s ago` : "Connecting…"}
          </span>
          <ToggleBtn on={sound} onClick={() => setSound((s) => !s)} title={sound ? "Mute alert sound" : "Unmute alert sound"}>
            {sound ? <Bell size={14} /> : <BellOff size={14} />}
          </ToggleBtn>
          <ToggleBtn on={showDemo} onClick={() => setShowDemo((s) => !s)} title="Show demo-gallery sessions separately">
            <span style={{ fontSize: 12, fontWeight: 600 }}>Demo sessions</span>
          </ToggleBtn>
        </div>
      </div>

      {/* ── Summary strip ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12, marginBottom: 26 }}>
        <Stat label="Live now" value={data?.counts.live} tone="brand" />
        <Stat label="Need attention" value={data?.counts.alert} tone={data?.counts.alert ? "red" : "muted"} />
        <Stat label="Watching" value={data?.counts.watch} tone={data?.counts.watch ? "amber" : "muted"} />
        <Stat label="Human verified" value={data?.counts.humanPresent} tone="green" suffix={data ? ` / ${data.counts.live}` : ""} />
      </div>

      {error && (
        <div style={{ background: C.redSoft, border: `1px solid ${C.redLine}`, color: C.red, borderRadius: 12, padding: "10px 14px", fontSize: 13, marginBottom: 18 }}>{error}</div>
      )}

      {!data && !error && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.muted, fontSize: 14, padding: 40, justifyContent: "center" }}>
          <Loader2 size={16} className="animate-spin" /> Loading live sessions…
        </div>
      )}

      {data && data.counts.live === 0 && (
        <EmptyState />
      )}

      {/* ── Needs attention (red) ── */}
      {groups.alert.length > 0 && (
        <Section title="Needs attention" count={groups.alert.length} tone="red">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
            {groups.alert.map((t) => <BigTile key={t.id} t={t} now={now} onOpen={setOpenId} />)}
          </div>
        </Section>
      )}

      {/* ── Watch (amber) ── */}
      {groups.watch.length > 0 && (
        <Section title="Keep an eye on" count={groups.watch.length} tone="amber">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
            {groups.watch.map((t) => <BigTile key={t.id} t={t} now={now} onOpen={setOpenId} compact />)}
          </div>
        </Section>
      )}

      {/* ── All clear (receded) ── */}
      {groups.ok.length > 0 && (
        <Section title="All clear" count={groups.ok.length} tone="green">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 8 }}>
            {groups.ok.map((t) => <MiniTile key={t.id} t={t} now={now} onOpen={setOpenId} />)}
          </div>
        </Section>
      )}

      {/* ── Demo sessions — separated, never counted ── */}
      {showDemo && (data?.demoTiles.length ?? 0) > 0 && (
        <Section title="Demo sessions (not counted)" count={data!.demoTiles.length} tone="muted">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 8, opacity: 0.75 }}>
            {data!.demoTiles.map((t) => <MiniTile key={t.id} t={t} now={now} onOpen={setOpenId} />)}
          </div>
        </Section>
      )}

      {/* ── Recently ended → playback ── */}
      {(data?.recentlyEnded.length ?? 0) > 0 && (
        <Section title="Recently ended · replay" count={data!.recentlyEnded.length} tone="muted">
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, overflow: "hidden" }}>
            {data!.recentlyEnded.map((r, i) => (
              <a key={r.id} href={`/playback/${r.id}`}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderTop: i ? `1px solid ${C.line}` : "none", textDecoration: "none", color: C.ink }}
                onMouseEnter={(e) => (e.currentTarget.style.background = C.bg)} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <PlayCircle size={18} color={r.hasRecording ? C.brand : C.muted} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.candidate}</div>
                  <div style={{ fontSize: 12, color: C.body, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.position} · {r.company}</div>
                </div>
                {r.integrityEvents > 0 && <Chip tone="amber"><Flag size={11} /> {r.integrityEvents}</Chip>}
                <span style={{ fontSize: 12, color: C.muted, minWidth: 90, textAlign: "right" }}>
                  {new Date(r.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: r.hasRecording ? C.brand : C.muted, minWidth: 96, textAlign: "right" }}>
                  {r.hasRecording ? "Replay session" : "Transcript only"}
                </span>
              </a>
            ))}
          </div>
        </Section>
      )}

      {openId && <DetailDrawer id={openId} onClose={closeDrawer} />}
    </div>
  );
}

/* ── Tiles ─────────────────────────────────────────────────────────────── */

function BigTile({ t, now, onOpen, compact }: { t: Tile; now: number; onOpen: (id: string) => void; compact?: boolean }) {
  const tone = toneFor(t.health.level);
  return (
    <button onClick={() => onOpen(t.id)}
      style={{
        textAlign: "left", cursor: "pointer", background: C.surface, borderRadius: 16, padding: compact ? 14 : 16,
        border: `1px solid ${tone.line}`, boxShadow: t.health.level === "alert" ? `0 0 0 3px ${tone.soft}, 0 8px 24px rgba(220,38,38,0.08)` : "0 1px 3px rgba(15,23,42,0.04)",
        display: "flex", flexDirection: "column", gap: 12, transition: "transform .12s, box-shadow .12s", fontFamily: "inherit",
        animation: t.health.level === "alert" ? "cr-attn 2.4s ease-in-out infinite" : undefined,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")} onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.candidate}</div>
          <div style={{ fontSize: 12.5, color: C.body, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.position} · {t.company}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, fontVariantNumeric: "tabular-nums" }}>{clock(t.startedAt, now)}</div>
          <div style={{ fontSize: 11, color: C.muted }}>of {t.plannedMinutes}:00</div>
        </div>
      </div>

      <PresenceBadge presence={t.health.presence} label={t.health.presenceLabel} />

      {t.health.reasons.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
          {t.health.reasons.slice(0, compact ? 2 : 3).map((r) => (
            <li key={r.code} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: r.level === "alert" ? C.red : C.amber, fontWeight: r.level === "alert" ? 600 : 500 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: r.level === "alert" ? C.red : C.amber, flexShrink: 0 }} />
              {r.label}
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
        <SignalIcons h={t.health} flags={t.totalFlags} />
        <span style={{ marginLeft: "auto", fontSize: 11.5, color: C.muted }}>
          {t.phase ? PHASE_LABEL[t.phase] ?? t.phase : "Not started"}
          {t.questionIndex !== null && t.questionCount ? ` · Q${t.questionIndex + 1}/${t.questionCount}` : ""}
        </span>
      </div>
    </button>
  );
}

function MiniTile({ t, now, onOpen }: { t: Tile; now: number; onOpen: (id: string) => void }) {
  const verified = t.health.presence === "present";
  return (
    <button onClick={() => onOpen(t.id)} title={t.health.presenceLabel}
      style={{ textAlign: "left", cursor: "pointer", background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, fontFamily: "inherit" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.brand)} onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.line)}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: verified ? C.green : C.muted, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.candidate}</div>
        <div style={{ fontSize: 11.5, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.position}</div>
      </div>
      <span style={{ fontSize: 12, color: C.body, fontVariantNumeric: "tabular-nums" }}>{clock(t.startedAt, now)}</span>
    </button>
  );
}

function PresenceBadge({ presence, label, large }: { presence: HumanPresence; label: string; large?: boolean }) {
  const map = {
    present: { Icon: ShieldCheck, fg: C.green, bg: C.greenSoft, line: C.greenLine, head: "Real human present" },
    unverified: { Icon: ShieldQuestion, fg: C.body, bg: C.bg, line: C.line, head: "Presence unverified" },
    anomaly: { Icon: ShieldAlert, fg: C.red, bg: C.redSoft, line: C.redLine, head: "Presence anomaly" },
  }[presence];
  const { Icon } = map;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: map.bg, border: `1px solid ${map.line}`, borderRadius: 12, padding: large ? "12px 14px" : "8px 10px" }}>
      <Icon size={large ? 22 : 18} color={map.fg} style={{ flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: large ? 14 : 12.5, fontWeight: 700, color: map.fg }}>{map.head}</div>
        <div style={{ fontSize: large ? 12.5 : 11.5, color: C.body, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      </div>
    </div>
  );
}

function SignalIcons({ h, flags }: { h: Health; flags: number }) {
  const face = {
    single: { I: User, c: C.green, t: "One face in frame" },
    none: { I: UserX, c: C.red, t: "No face in frame" },
    multiple: { I: Users, c: C.red, t: "More than one person" },
    camera_off: { I: VideoOff, c: C.amber, t: "Camera off" },
    unknown: { I: User, c: C.muted, t: "Face detection unavailable" },
  }[h.face];
  const audio = {
    speaking: { I: Mic, c: C.green, t: "Candidate speaking" },
    silent: { I: Mic, c: C.amber, t: "Candidate's turn — silent" },
    ai_turn: { I: Mic, c: C.muted, t: "Interviewer's turn" },
    no_audio: { I: MicOff, c: C.red, t: "No candidate audio" },
    text_mode: { I: Keyboard, c: C.amber, t: "Typing instead of speaking" },
    unknown: { I: Mic, c: C.muted, t: "Audio unknown" },
  }[h.audio];
  const conn = h.connection === "live" ? { I: Wifi, c: C.green, t: "Connected" }
    : h.connection === "lagging" ? { I: Wifi, c: C.amber, t: "Connection lagging" }
    : h.connection === "lost" ? { I: WifiOff, c: C.red, t: "Connection lost" }
    : { I: Wifi, c: C.muted, t: "Waiting for first signal" };
  return (
    <>
      {[face, audio, conn].map(({ I, c, t }) => (
        <span key={t} title={t} aria-label={t} style={{ width: 26, height: 26, borderRadius: 8, background: `${c}14`, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <I size={14} color={c} />
        </span>
      ))}
      <span title="High-confidence integrity flags this session" style={{ height: 26, padding: "0 8px", borderRadius: 8, background: flags ? C.amberSoft : C.bg, color: flags ? C.amber : C.muted, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600 }}>
        <Flag size={12} /> {flags}
      </span>
    </>
  );
}

/* ── Drill-in drawer ───────────────────────────────────────────────────── */

interface Detail {
  interview: {
    id: string; status: string; isDemo: boolean; startedAt: string | null; completedAt: string | null; plannedMinutes: number;
    candidate: { name: string; email: string }; position: { title: string; company: string }; hasRecording: boolean;
  };
  live: null | {
    lastBeatAt: string; phase: string | null; questionIndex: number | null; questionCount: number | null; questionText: string | null;
    camState: string | null; faceCount: number | null; sttMode: string | null; micOk: boolean; sttWarning: string | null;
    lastSpeechAt: string | null; tabHidden: boolean; transcriptTail: { speaker: "ai" | "candidate"; text: string; timestamp: string }[]; interim: string | null;
  };
  health: Health | null;
  events: { id: string; type: string; label: string; occurredAt: string; confidence: number; detail: string | null; high: boolean }[];
}

function DetailDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const txRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/control-room/${id}`, { cache: "no-store" });
        if (!r.ok) throw new Error("Couldn't load this session.");
        const j = (await r.json()) as Detail;
        if (alive) { setD(j); setErr(null); }
      } catch (e) { if (alive) setErr(e instanceof Error ? e.message : "Error"); }
    };
    void load();
    const iv = setInterval(() => { if (!document.hidden) void load(); }, DETAIL_POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { alive = false; clearInterval(iv); clearInterval(tick); window.removeEventListener("keydown", onKey); };
  }, [id, onClose]);

  const tailLen = d?.live?.transcriptTail.length ?? 0;
  useEffect(() => { txRef.current?.scrollTo({ top: txRef.current.scrollHeight, behavior: "smooth" }); }, [tailLen, d?.live?.interim]);

  const live = d?.live;
  const ended = d && d.interview.status !== "in_progress";

  return (
    <div role="dialog" aria-modal="true" aria-label="Live interview detail" style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.32)", backdropFilter: "blur(2px)" }} />
      <aside style={{ position: "relative", width: "min(560px, 100vw)", height: "100%", background: C.bg, boxShadow: "-12px 0 40px rgba(15,23,42,0.18)", display: "flex", flexDirection: "column", animation: "cr-slide .22s cubic-bezier(.2,.8,.2,1)" }}>
        {/* header */}
        <div style={{ padding: "18px 20px", background: C.surface, borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.ink, fontFamily: "var(--font-display)" }}>{d?.interview.candidate.name ?? "Loading…"}</div>
            {d && <div style={{ fontSize: 12.5, color: C.body }}>{d.interview.position.title} · {d.interview.position.company}</div>}
          </div>
          {d?.interview.startedAt && !ended && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: C.ink, fontVariantNumeric: "tabular-nums" }}>
              <Clock size={14} color={C.muted} /> {clock(d.interview.startedAt, now)}
            </div>
          )}
          <button onClick={onClose} aria-label="Close" style={{ border: "none", background: C.bg, width: 30, height: 30, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} color={C.body} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {err && <div style={{ color: C.red, fontSize: 13 }}>{err}</div>}
          {!d && !err && <div style={{ color: C.muted, fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}><Loader2 size={14} className="animate-spin" /> Loading…</div>}

          {ended && d && (
            <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, fontSize: 13, color: C.body }}>This interview has ended.</div>
              <a href={`/playback/${d.interview.id}`} style={primaryBtn}><PlayCircle size={15} /> Open playback</a>
            </div>
          )}

          {d?.health && <PresenceBadge presence={d.health.presence} label={d.health.presenceLabel} large />}

          {d?.health && d.health.reasons.length > 0 && (
            <Card title="What needs attention">
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {d.health.reasons.map((r) => (
                  <li key={r.code} style={{ fontSize: 13, color: r.level === "alert" ? C.red : C.amber, fontWeight: r.level === "alert" ? 600 : 500, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 4, background: r.level === "alert" ? C.red : C.amber }} /> {r.label}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {live && d?.health && (
            <Card title="Live signals">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
                <Signal label="Camera / face" value={live.camState === "denied" ? "Camera off" : live.faceCount === null ? "Detecting…" : live.faceCount === 1 ? "1 face" : live.faceCount === 0 ? "No face" : `${live.faceCount} faces`}
                  tone={d.health.face === "single" ? "green" : d.health.face === "unknown" ? "muted" : d.health.face === "camera_off" ? "amber" : "red"} />
                <Signal label="Candidate audio" value={d.health.audio === "speaking" ? "Speaking now" : d.health.audio === "silent" ? "Silent (their turn)" : d.health.audio === "ai_turn" ? "Interviewer's turn" : d.health.audio === "text_mode" ? "Typing" : d.health.audio === "no_audio" ? "No audio" : "—"}
                  tone={d.health.audio === "speaking" ? "green" : d.health.audio === "no_audio" ? "red" : d.health.audio === "silent" || d.health.audio === "text_mode" ? "amber" : "muted"} />
                <Signal label="Connection" value={`${d.health.connection === "live" ? "Live" : d.health.connection === "lagging" ? "Lagging" : d.health.connection === "lost" ? "Lost" : "Waiting"} · ${Math.round((now - new Date(live.lastBeatAt).getTime()) / 1000)}s ago`}
                  tone={d.health.connection === "live" ? "green" : d.health.connection === "lost" ? "red" : "amber"} />
                <Signal label="Transcription" value={live.sttMode === "scribe" ? "Scribe realtime" : live.sttMode === "webspeech" ? "Browser fallback" : live.sttMode === "text" ? "Text input" : "Unavailable"}
                  tone={live.sttMode === "scribe" || live.sttMode === "webspeech" ? "green" : live.sttMode === "text" ? "amber" : "red"} />
                <Signal label="Interview tab" value={live.tabHidden ? "In background" : "In focus"} tone={live.tabHidden ? "amber" : "green"} />
                <Signal label="Stage" value={`${live.phase ? PHASE_LABEL[live.phase] ?? live.phase : "—"}${live.questionIndex !== null && live.questionCount ? ` · Q${live.questionIndex + 1}/${live.questionCount}` : ""}`} tone="muted" />
              </div>
            </Card>
          )}

          {live?.questionText && !ended && (
            <Card title={`Current question${live.questionIndex !== null && live.questionCount ? ` · ${live.questionIndex + 1} of ${live.questionCount}` : ""}`}>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: C.ink }}>{live.questionText}</p>
            </Card>
          )}

          {live && (
            <Card title="Live transcript">
              <div ref={txRef} style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingRight: 4 }}>
                {live.transcriptTail.length === 0 && !live.interim && <div style={{ fontSize: 12.5, color: C.muted }}>Nothing said yet.</div>}
                {live.transcriptTail.map((e, i) => <TxLine key={i} speaker={e.speaker} text={e.text} at={e.timestamp} />)}
                {live.interim && <TxLine speaker="candidate" text={live.interim} interim />}
              </div>
            </Card>
          )}

          {d && (
            <Card title={`Integrity events (${d.events.length})`}>
              {d.events.length === 0 ? <div style={{ fontSize: 12.5, color: C.muted }}>No integrity events so far.</div> : (
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                  {d.events.map((e) => (
                    <li key={e.id} style={{ display: "flex", gap: 10, fontSize: 12.5 }}>
                      <span style={{ color: C.muted, fontVariantNumeric: "tabular-nums", minWidth: 58 }}>{new Date(e.occurredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                      <span style={{ color: e.high ? C.red : C.body, fontWeight: e.high ? 600 : 400 }}>{e.label}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p style={{ margin: "10px 0 0", fontSize: 11.5, color: C.muted }}>Signals route to human review — they never auto-fail a candidate.</p>
            </Card>
          )}
        </div>
      </aside>
    </div>
  );
}

function TxLine({ speaker, text, at, interim }: { speaker: "ai" | "candidate"; text: string; at?: string; interim?: boolean }) {
  const ai = speaker === "ai";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: ai ? "flex-start" : "flex-end" }}>
      <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 2 }}>
        {ai ? "Interviewer" : "Candidate"}{at ? ` · ${new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : interim ? " · speaking…" : ""}
      </div>
      <div style={{ maxWidth: "88%", fontSize: 13, lineHeight: 1.5, padding: "7px 11px", borderRadius: 12, background: ai ? C.surface : C.brandSoft, border: `1px solid ${ai ? C.line : "#C7D2FE"}`, color: C.ink, fontStyle: interim ? "italic" : "normal", opacity: interim ? 0.75 : 1 }}>
        {text}
      </div>
    </div>
  );
}

/* ── Small primitives ──────────────────────────────────────────────────── */

const primaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, background: C.brand, color: "#fff", borderRadius: 10,
  padding: "8px 14px", fontSize: 13, fontWeight: 600, textDecoration: "none",
};

function toneFor(l: HealthLevel) {
  return l === "alert" ? { line: C.redLine, soft: C.redSoft } : l === "watch" ? { line: C.amberLine, soft: C.amberSoft } : { line: C.line, soft: C.bg };
}

function Section({ title, count, tone, children }: { title: string; count: number; tone: "red" | "amber" | "green" | "muted"; children: React.ReactNode }) {
  const dot = tone === "red" ? C.red : tone === "amber" ? C.amber : tone === "green" ? C.green : C.muted;
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: C.ink, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: dot }} /> {title}
        <span style={{ color: C.muted, fontWeight: 600 }}>{count}</span>
      </h2>
      {children}
    </section>
  );
}

function Stat({ label, value, tone, suffix }: { label: string; value: number | undefined; tone: "brand" | "red" | "amber" | "green" | "muted"; suffix?: string }) {
  const fg = { brand: C.brand, red: C.red, amber: C.amber, green: C.green, muted: C.ink }[tone];
  const bg = tone === "red" ? C.redSoft : tone === "amber" ? C.amberSoft : C.surface;
  return (
    <div style={{ background: bg, border: `1px solid ${tone === "red" ? C.redLine : tone === "amber" ? C.amberLine : C.line}`, borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ fontSize: 12, color: C.body, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: fg, fontFamily: "var(--font-display)", letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
        {value ?? "–"}<span style={{ fontSize: 14, color: C.muted, fontWeight: 600 }}>{suffix}</span>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function Signal({ label, value, tone }: { label: string; value: string; tone: "green" | "amber" | "red" | "muted" }) {
  const c = { green: C.green, amber: C.amber, red: C.red, muted: C.body }[tone];
  return (
    <div style={{ background: C.bg, borderRadius: 10, padding: "9px 11px" }}>
      <div style={{ fontSize: 11, color: C.muted }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: c, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: 3, background: c }} /> {value}
      </div>
    </div>
  );
}

function Chip({ tone, children }: { tone: "amber"; children: React.ReactNode }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600, color: tone === "amber" ? C.amber : C.body, background: C.amberSoft, borderRadius: 999, padding: "2px 8px" }}>{children}</span>;
}

function ToggleBtn({ on, onClick, title, children }: { on: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title} aria-pressed={on}
      style={{ height: 32, padding: "0 10px", borderRadius: 9, border: `1px solid ${on ? "#C7D2FE" : C.line}`, background: on ? C.brandSoft : C.surface, color: on ? C.brand : C.body, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
      {children}
    </button>
  );
}

function LivePulse({ ok }: { ok: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: ok ? C.green : C.red, background: ok ? C.greenSoft : C.redSoft, borderRadius: 999, padding: "3px 9px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
      <span style={{ width: 7, height: 7, borderRadius: 4, background: ok ? C.green : C.red, animation: ok ? "cr-pulse 1.8s infinite" : undefined }} />
      {ok ? "Live" : "Offline"}
      <style>{`
        @keyframes cr-pulse { 0% { box-shadow: 0 0 0 0 rgba(5,150,105,.55) } 70% { box-shadow: 0 0 0 7px rgba(5,150,105,0) } 100% { box-shadow: 0 0 0 0 rgba(5,150,105,0) } }
        @keyframes cr-attn { 0%,100% { box-shadow: 0 0 0 3px #FEF2F2, 0 8px 24px rgba(220,38,38,.08) } 50% { box-shadow: 0 0 0 5px #FECACA, 0 8px 24px rgba(220,38,38,.14) } }
        @keyframes cr-slide { from { transform: translateX(24px); opacity: 0 } to { transform: none; opacity: 1 } }
      `}</style>
    </span>
  );
}

function EmptyState() {
  return (
    <div style={{ background: C.surface, border: `1px dashed ${C.line}`, borderRadius: 16, padding: "44px 24px", textAlign: "center", marginBottom: 28 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: C.brandSoft, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
        <Radar size={22} color={C.brand} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>No interviews running right now</div>
      <div style={{ fontSize: 13, color: C.body, marginTop: 4 }}>
        Live sessions appear here the moment a candidate starts. Problems surface at the top automatically.
      </div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: C.muted, marginTop: 12 }}>
        Recently ended sessions can be replayed below <ChevronRight size={13} />
      </div>
    </div>
  );
}

// Short two-tone chime via WebAudio (no asset). Best-effort.
function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 660].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = f; o.type = "sine";
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.16);
      g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + i * 0.16 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.16 + 0.15);
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + i * 0.16); o.stop(ctx.currentTime + i * 0.16 + 0.16);
    });
    setTimeout(() => ctx.close(), 600);
  } catch { /* ignore */ }
}
