"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { X, Menu } from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────── */
/*  CONTACT MODAL                                                           */
/* ──────────────────────────────────────────────────────────────────────── */

function ContactModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    toast.success("Thank you, we will be in touch!");
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15,23,42,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 18,
          width: 480,
          maxWidth: "100%",
          boxShadow:
            "0 32px 80px rgba(79,70,229,0.18), 0 8px 24px rgba(0,0,0,0.08)",
          overflow: "hidden",
          border: "1px solid #E2E8F0",
        }}
      >
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid #F1F5F9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 18,
                fontWeight: 800,
                color: "#0F172A",
                letterSpacing: "-0.01em",
              }}
            >
              Book a Demo
            </div>
            <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 2 }}>
              We&apos;ll get back to you within 24 hours
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94A3B8",
              padding: 6,
              borderRadius: 7,
              display: "flex",
            }}
          >
            <X size={17} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#475569",
                  marginBottom: 6,
                }}
              >
                Full Name
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #E2E8F0",
                  fontSize: 14,
                  fontFamily: "var(--font-sans)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#475569",
                  marginBottom: 6,
                }}
              >
                Email Address
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@company.com"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #E2E8F0",
                  fontSize: 14,
                  fontFamily: "var(--font-sans)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#475569",
                  marginBottom: 6,
                }}
              >
                Company
              </label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Inc."
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #E2E8F0",
                  fontSize: 14,
                  fontFamily: "var(--font-sans)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#475569",
                  marginBottom: 6,
                }}
              >
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us about your use case…"
                rows={4}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #E2E8F0",
                  fontSize: 14,
                  fontFamily: "var(--font-sans)",
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}
            >
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: "#fff",
                  border: "1px solid #E2E8F0",
                  borderRadius: 9,
                  color: "#475569",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "9px 18px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  background: "#4F46E5",
                  color: "#fff",
                  border: "none",
                  borderRadius: 9,
                  padding: "9px 22px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(79,70,229,0.3)",
                }}
              >
                Send Message
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  PAGE                                                                    */
/* ──────────────────────────────────────────────────────────────────────── */

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function LandingPage() {
  const [showModal, setShowModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Scroll shadow on nav
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Intersection observer for section fade-ins
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => {
              const next = new Set(prev);
              next.add(entry.target.id);
              return next;
            });
          }
        });
      },
      { threshold: 0.1 },
    );
    observerRef.current = observer;
    document.querySelectorAll("section[id]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function sectionStyle(id: string): React.CSSProperties {
    const visible = visibleSections.has(id);
    return {
      opacity: visible ? 1 : 0,
      transform: visible ? "none" : "translateY(24px)",
      transition: "opacity 0.6s ease, transform 0.6s ease",
    };
  }

  return (
    <div
      style={{
        fontFamily: "var(--font-sans)",
        background: "#fff",
        color: "#0F172A",
        overflowX: "hidden",
      }}
    >
      {showModal && <ContactModal onClose={() => setShowModal(false)} />}

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "#fff",
          borderBottom: "1px solid #F1F5F9",
          boxShadow: scrolled ? "0 1px 20px rgba(0,0,0,0.08)" : "none",
          transition: "box-shadow 0.2s ease",
        }}
      >
        <div
          className="landing-header-inner"
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 32px",
            height: 68,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 700,
              color: "#0F172A",
              letterSpacing: "-0.02em",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            Levl<span style={{ color: "#7C3AED" }}>1</span>
          </Link>

          {/* Center links — hidden on mobile */}
          <nav
            className="landing-nav-links"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 32,
            }}
          >
            {[
              { label: "How it works", id: "how-it-works" },
              { label: "For Agencies", id: "agencies" },
              { label: "For Enterprise", id: "enterprise" },
              { label: "Pricing", id: "pricing" },
            ].map((l) => (
              <button
                key={l.id}
                onClick={() => scrollToId(l.id)}
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#475569",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  padding: 0,
                  transition: "color 0.15s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#4F46E5")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
              >
                {l.label}
              </button>
            ))}
          </nav>

          {/* CTAs — hidden on mobile */}
          <div className="landing-nav-ctas" style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <Link
              href="/login"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#475569",
                textDecoration: "none",
                padding: "9px 16px",
                border: "1px solid #E2E8F0",
                borderRadius: 9,
                background: "#fff",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              Sign in
            </Link>
            <button
              onClick={() => setShowModal(true)}
              style={{
                background: "#4F46E5",
                color: "#fff",
                border: "none",
                borderRadius: 9,
                padding: "10px 18px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                boxShadow: "0 4px 14px rgba(79,70,229,0.28)",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              Book a Demo
            </button>
          </div>

          {/* Hamburger — shown only on mobile */}
          <button
            className="landing-hamburger"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            style={{
              display: "none",
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#4F46E5",
              flexShrink: 0,
              padding: 0,
            }}
          >
            <Menu size={24} strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* ── MOBILE MENU OVERLAY ────────────────────────────────────────── */}
      {menuOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "#fff",
            display: "flex",
            flexDirection: "column",
            animation: "slideDown 0.22s cubic-bezier(0.4,0,0.2,1)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setMenuOpen(false);
          }}
        >
          {/* Mobile menu header */}
          <div
            style={{
              height: 68,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 20px",
              borderBottom: "1px solid #F1F5F9",
              flexShrink: 0,
            }}
          >
            <Link
              href="/"
              onClick={() => setMenuOpen(false)}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                fontWeight: 700,
                color: "#0F172A",
                letterSpacing: "-0.02em",
                textDecoration: "none",
              }}
            >
              Levl<span style={{ color: "#7C3AED" }}>1</span>
            </Link>
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              style={{
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#4F46E5",
                padding: 0,
              }}
            >
              <X size={24} strokeWidth={2} />
            </button>
          </div>

          {/* Nav links */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {[
              { label: "How it Works", id: "how-it-works" },
              { label: "For Agencies", id: "agencies" },
              { label: "For Enterprise", id: "enterprise" },
              { label: "Pricing", id: "pricing" },
            ].map((l) => (
              <button
                key={l.id}
                onClick={() => { setMenuOpen(false); scrollToId(l.id); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  height: 56,
                  padding: "0 20px",
                  fontSize: 18,
                  fontWeight: 500,
                  color: "#1E293B",
                  background: "none",
                  border: "none",
                  borderBottom: "1px solid #F1F5F9",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  textAlign: "left",
                  transition: "color 0.15s, background 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#4F46E5"; e.currentTarget.style.background = "#F8FAFF"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#1E293B"; e.currentTarget.style.background = "none"; }}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* CTA buttons at bottom */}
          <div
            style={{
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              borderTop: "1px solid #F1F5F9",
              flexShrink: 0,
            }}
          >
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 52,
                fontSize: 16,
                fontWeight: 600,
                color: "#4F46E5",
                textDecoration: "none",
                border: "1px solid #E2E8F0",
                borderRadius: 10,
                background: "#fff",
              }}
            >
              Sign In
            </Link>
            <button
              onClick={() => { setMenuOpen(false); setShowModal(true); }}
              style={{
                height: 52,
                fontSize: 16,
                fontWeight: 700,
                color: "#fff",
                background: "#4F46E5",
                border: "none",
                borderRadius: 10,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                boxShadow: "0 4px 14px rgba(79,70,229,0.28)",
              }}
            >
              Book a Demo
            </button>
          </div>
        </div>
      )}

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section
        id="hero"
        style={{
          minHeight: "100vh",
          background: "#fff",
          padding: "80px 32px",
          position: "relative",
          ...sectionStyle("hero"),
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 64,
            alignItems: "center",
          }}
          className="hero-grid"
        >
          {/* LEFT */}
          <div>
            <div
              style={{
                display: "inline-block",
                background: "#EEF2FF",
                color: "#4F46E5",
                fontSize: 12,
                fontWeight: 600,
                padding: "6px 14px",
                borderRadius: 100,
                marginBottom: 28,
                letterSpacing: "0.01em",
              }}
            >
              AI-Powered L1 Interviews for Tech & Product Roles
            </div>

            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 52,
                fontWeight: 800,
                color: "#0F172A",
                lineHeight: 1.15,
                letterSpacing: "-0.03em",
                margin: 0,
                marginBottom: 18,
              }}
            >
              Your best candidate
              <br />
              just accepted
              <br />
              another offer.
            </h1>

            <p
              style={{
                fontSize: 20,
                fontStyle: "italic",
                color: "#64748B",
                margin: 0,
                marginBottom: 24,
                lineHeight: 1.4,
              }}
            >
              While you were finding time for a 30-minute call.
            </p>

            <p
              style={{
                fontSize: 17,
                color: "#475569",
                lineHeight: 1.7,
                maxWidth: 500,
                margin: 0,
                marginBottom: 36,
              }}
            >
              Levl1 conducts structured technical and behavioral interviews
              autonomously — so your pipeline never stalls on panel availability
              again.
            </p>

            <div style={{ display: "flex", gap: 12, marginBottom: 48, flexWrap: "wrap" }}>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  background: "#4F46E5",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  height: 48,
                  padding: "0 20px",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  boxShadow: "0 6px 20px rgba(79,70,229,0.3)",
                  transition: "all 0.15s",
                }}
              >
                Book a Demo
              </button>
              <button
                onClick={() => scrollToId("how-it-works")}
                style={{
                  background: "#fff",
                  color: "#4F46E5",
                  border: "1px solid #4F46E5",
                  borderRadius: 12,
                  height: 48,
                  padding: "0 20px",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  transition: "all 0.15s",
                }}
              >
                See How It Works ↓
              </button>
            </div>

            {/* Stats */}
            <div
              style={{
                display: "flex",
                gap: 32,
                alignItems: "stretch",
                flexWrap: "wrap",
              }}
            >
              {[
                { v: "48 hrs", l: "Average time to evaluated shortlist" },
                { v: "60%", l: "Reduction in time-to-hire" },
                { v: "3x", l: "More candidates evaluated per week" },
              ].map((s, i) => (
                <div
                  key={s.v}
                  style={{
                    display: "flex",
                    alignItems: "stretch",
                    gap: 32,
                  }}
                >
                  <div style={{ maxWidth: 160 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 32,
                        fontWeight: 800,
                        color: "#4F46E5",
                        letterSpacing: "-0.02em",
                        lineHeight: 1,
                        marginBottom: 8,
                      }}
                    >
                      {s.v}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#64748B",
                        lineHeight: 1.45,
                      }}
                    >
                      {s.l}
                    </div>
                  </div>
                  {i < 2 && (
                    <div
                      style={{
                        width: 1,
                        background: "#E2E8F0",
                        alignSelf: "stretch",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT */}
          <div
            style={{
              position: "relative",
              minHeight: 540,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Indigo radial glow */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at 50% 50%, rgba(79,70,229,0.18) 0%, rgba(124,58,237,0.08) 40%, transparent 70%)",
                filter: "blur(20px)",
                zIndex: 0,
              }}
            />

            {/* Main dark card */}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                background: "#0F172A",
                borderRadius: 20,
                padding: 24,
                width: "100%",
                maxWidth: 500,
                boxShadow:
                  "0 24px 60px rgba(79,70,229,0.25), 0 8px 24px rgba(15,23,42,0.4)",
                border: "1px solid rgba(124,58,237,0.2)",
                animation: "float 4s ease-in-out infinite alternate",
                color: "#E2E8F0",
              }}
            >
              {/* Header row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: 14,
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "rgba(239,68,68,0.15)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      padding: "3px 8px",
                      borderRadius: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#EF4444",
                        animation: "pulseDot 1.4s ease-in-out infinite",
                        display: "inline-block",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#FCA5A5",
                        letterSpacing: "0.08em",
                      }}
                    >
                      LIVE
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: "#94A3B8" }}>
                    Alex · AI Interviewer
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontFamily: "var(--font-mono, monospace)",
                    color: "#94A3B8",
                  }}
                >
                  23:41
                </span>
              </div>

              {/* Candidate */}
              <div
                style={{
                  padding: "14px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#fff",
                    marginBottom: 2,
                  }}
                >
                  Priya Sharma · Senior Data Engineer
                </div>
                <div style={{ fontSize: 12, color: "#94A3B8" }}>
                  DataTech Solutions
                </div>
              </div>

              {/* Waveform */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  height: 56,
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((delay, i) => (
                  <span
                    key={i}
                    style={{
                      display: "inline-block",
                      width: 4,
                      borderRadius: 2,
                      background:
                        "linear-gradient(180deg, #7C3AED 0%, #4F46E5 100%)",
                      animation: `waveBar 1.2s ease-in-out ${delay}s infinite`,
                    }}
                  />
                ))}
              </div>

              {/* Question */}
              <div
                style={{
                  padding: "14px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#7C3AED",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Current Question
                </div>
                <div style={{ fontSize: 14, color: "#E2E8F0", lineHeight: 1.6 }}>
                  &ldquo;Describe the architecture of a system you designed.
                  Walk me through the key trade-offs you made.&rdquo;
                </div>
              </div>

              {/* Transcript */}
              <div style={{ paddingTop: 14 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#7C3AED",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Live Transcript
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#CBD5E1",
                    lineHeight: 1.6,
                    fontStyle: "italic",
                  }}
                >
                  &ldquo;Sure. So in my last role at Scale9x, we were dealing
                  with a real-time data pipeline that needed to handle…&rdquo;
                </div>
              </div>
            </div>

            {/* Overlapping score card */}
            <div
              style={{
                position: "absolute",
                left: -10,
                bottom: 10,
                zIndex: 2,
                background: "#fff",
                borderRadius: 14,
                padding: 16,
                width: 240,
                boxShadow: "0 16px 40px rgba(15,23,42,0.18)",
                border: "1px solid #E2E8F0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#10B981",
                  marginBottom: 8,
                }}
              >
                <span>✅</span>
                <span>Interview Complete</span>
              </div>
              <div style={{ fontSize: 13, color: "#0F172A", fontWeight: 600 }}>
                Priya Sharma · 23 min
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#64748B",
                  marginTop: 2,
                  marginBottom: 10,
                }}
              >
                Score: <span style={{ fontWeight: 700, color: "#0F172A" }}>87/100</span>
              </div>
              <div
                style={{
                  display: "inline-block",
                  background: "#DCFCE7",
                  color: "#15803D",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "4px 10px",
                  borderRadius: 100,
                  marginBottom: 8,
                }}
              >
                Strong Hire
              </div>
              <div style={{ fontSize: 12, color: "#64748B" }}>
                3 key strengths identified
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM ─────────────────────────────────────────────────────── */}
      <section
        id="problem"
        style={{
          background: "#F8FAFC",
          padding: "96px 32px",
          ...sectionStyle("problem"),
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span
              style={{
                display: "inline-block",
                background: "#EEF2FF",
                color: "#4F46E5",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.12em",
                padding: "6px 12px",
                borderRadius: 100,
                marginBottom: 16,
              }}
            >
              THE PROBLEM
            </span>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 44,
                fontWeight: 800,
                color: "#0F172A",
                letterSpacing: "-0.025em",
                lineHeight: 1.15,
                margin: 0,
                marginBottom: 12,
              }}
            >
              Great candidates don&apos;t wait.
            </h2>
            <p style={{ fontSize: 20, color: "#64748B", margin: 0 }}>
              But your hiring process does.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 24,
            }}
            className="problem-grid"
          >
            {[
              {
                icon: "📅",
                stat: "15–20%",
                title:
                  "Of a senior engineer's week goes to interviewing",
                body: "Your best people are your scarcest interviewers. Every hour they spend on L1 panels is an hour not spent building. And candidates still wait weeks for a slot.",
              },
              {
                icon: "👋",
                stat: "58%",
                title: "Of top candidates drop out after 2 weeks of silence",
                body: "The best candidates have options. When your process stalls at the screening stage, they don't wait — they accept the offer that moved faster.",
              },
              {
                icon: "⚖️",
                stat: "0.28",
                title: "Inter-rater reliability of unstructured interviews",
                body: "Without a structured evaluation framework, two interviewers assess the same candidate completely differently. You're not measuring talent — you're measuring who showed up that day.",
              },
            ].map((c) => (
              <div
                key={c.stat}
                style={{
                  background: "#fff",
                  border: "1px solid #E2E8F0",
                  borderRadius: 16,
                  padding: 32,
                  boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 16 }}>{c.icon}</div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 48,
                    fontWeight: 800,
                    color: "#4F46E5",
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                    marginBottom: 12,
                  }}
                >
                  {c.stat}
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#0F172A",
                    lineHeight: 1.35,
                    marginBottom: 12,
                  }}
                >
                  {c.title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: "#64748B",
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
                  {c.body}
                </p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 56 }}>
            <p
              style={{
                fontSize: 18,
                color: "#475569",
                fontStyle: "italic",
                margin: 0,
                marginBottom: 12,
                lineHeight: 1.5,
                maxWidth: 720,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              &ldquo;We lost three strong candidates last quarter to competing
              offers — all while waiting for panel availability.&rdquo;
            </p>
            <p style={{ fontSize: 13, color: "#94A3B8", margin: 0 }}>
              — Head of Engineering, Series B Fintech, Bengaluru
            </p>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        style={{
          background: "#fff",
          padding: "96px 32px",
          ...sectionStyle("how-it-works"),
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span
              style={{
                display: "inline-block",
                background: "#EEF2FF",
                color: "#4F46E5",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.12em",
                padding: "6px 12px",
                borderRadius: 100,
                marginBottom: 16,
              }}
            >
              HOW IT WORKS
            </span>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 44,
                fontWeight: 800,
                color: "#0F172A",
                letterSpacing: "-0.025em",
                lineHeight: 1.15,
                margin: 0,
              }}
            >
              From JD to evaluated shortlist in 48 hours
            </h2>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {[
              {
                n: "01",
                icon: "📄",
                title: "Create Position",
                body: "Generate or paste your JD. AI creates a tailored question bank for your role, tech stack, and seniority level.",
              },
              {
                n: "02",
                icon: "✅",
                title: "One-Time Approval",
                body: "Your tech lead reviews technical questions. HR reviews behavioral. Approve once — use for every candidate.",
              },
              {
                n: "03",
                icon: "🎙️",
                title: "AI Interviews",
                body: "Levl1 conducts structured voice interviews — technical, scenario, behavioral, and EQ. No panel needed.",
              },
              {
                n: "04",
                icon: "📊",
                title: "Ranked Reports",
                body: "Every candidate gets an evidence-based report with scores, strengths, concerns, and a clear recommendation.",
              },
            ].map((s, i, arr) => (
              <div
                key={s.n}
                style={{
                  display: "flex",
                  alignItems: "center",
                  flex: "1 1 220px",
                  minWidth: 220,
                }}
              >
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #E2E8F0",
                    borderRadius: 16,
                    padding: 28,
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    boxShadow: "0 1px 3px rgba(15,23,42,0.03)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#C7D2FE";
                    e.currentTarget.style.boxShadow =
                      "0 8px 24px rgba(79,70,229,0.08)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#E2E8F0";
                    e.currentTarget.style.boxShadow =
                      "0 1px 3px rgba(15,23,42,0.03)";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#4F46E5",
                      letterSpacing: "0.08em",
                      marginBottom: 12,
                    }}
                  >
                    {s.n}
                  </div>
                  <div style={{ fontSize: 28, marginBottom: 14 }}>{s.icon}</div>
                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 18,
                      fontWeight: 700,
                      color: "#0F172A",
                      lineHeight: 1.3,
                      margin: 0,
                      marginBottom: 8,
                    }}
                  >
                    {s.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 14,
                      color: "#64748B",
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {s.body}
                  </p>
                </div>
                {i < arr.length - 1 && (
                  <div
                    style={{
                      color: "#4F46E5",
                      fontSize: 24,
                      fontWeight: 700,
                      padding: "0 4px",
                      flexShrink: 0,
                    }}
                    className="how-arrow"
                  >
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AGENCIES vs ENTERPRISE ──────────────────────────────────────── */}
      <section
        id="agencies"
        style={{
          background: "#fff",
          padding: "96px 32px",
          ...sectionStyle("agencies"),
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
            }}
            className="two-panel-grid"
          >
            {/* LEFT - Agencies (indigo) */}
            <div
              style={{
                background: "#4F46E5",
                borderRadius: 20,
                padding: 48,
                color: "#fff",
                boxShadow: "0 20px 50px rgba(79,70,229,0.25)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#A5B4FC",
                  letterSpacing: "0.12em",
                  marginBottom: 16,
                  textTransform: "uppercase",
                }}
              >
                For Recruitment Agencies
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 36,
                  fontWeight: 800,
                  color: "#fff",
                  lineHeight: 1.15,
                  letterSpacing: "-0.025em",
                  margin: 0,
                  marginBottom: 16,
                }}
              >
                Charge more. Deliver more.
              </h3>
              <p
                style={{
                  fontSize: 16,
                  color: "#C7D2FE",
                  lineHeight: 1.65,
                  margin: 0,
                  marginBottom: 28,
                }}
              >
                Stop sending raw CVs. Send evaluated, ranked shortlists backed
                by AI interview reports. Your clients get better candidates
                faster — and you command a premium for it.
              </p>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  marginBottom: 32,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {[
                  "Multi-client position management",
                  "White-label reports with your branding",
                  "Client approval workflow",
                  "Push evaluated shortlists to clients",
                  "Per-interview or per-position pricing",
                  "No panel dependency — ever",
                ].map((feat) => (
                  <li
                    key={feat}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      fontSize: 14,
                      color: "#E0E7FF",
                      lineHeight: 1.5,
                    }}
                  >
                    <span
                      style={{
                        color: "#fff",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      ✓
                    </span>
                    {feat}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  background: "#fff",
                  color: "#4F46E5",
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 24px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Book a Demo
              </button>
            </div>

            {/* RIGHT - Enterprise (white outlined) */}
            <div
              id="enterprise"
              style={{
                background: "#fff",
                border: "2px solid #4F46E5",
                borderRadius: 20,
                padding: 48,
                boxShadow: "0 20px 50px rgba(15,23,42,0.08)",
                scrollMarginTop: 80,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#4F46E5",
                  letterSpacing: "0.12em",
                  marginBottom: 16,
                  textTransform: "uppercase",
                }}
              >
                For Enterprise Hiring Teams
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 36,
                  fontWeight: 800,
                  color: "#0F172A",
                  lineHeight: 1.15,
                  letterSpacing: "-0.025em",
                  margin: 0,
                  marginBottom: 16,
                }}
              >
                Scale hiring without scaling headcount.
              </h3>
              <p
                style={{
                  fontSize: 16,
                  color: "#64748B",
                  lineHeight: 1.65,
                  margin: 0,
                  marginBottom: 28,
                }}
              >
                Run hundreds of L1 interviews simultaneously without burning
                out your engineering team. Consistent evaluation. Zero
                scheduling overhead.
              </p>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  marginBottom: 32,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {[
                  "Internal HRMS and ATS integration",
                  "Department-level access controls",
                  "SSO / SAML authentication",
                  "SLA guarantees and dedicated CSM",
                  "Custom question banks per department",
                  "Full audit trail and compliance reporting",
                ].map((feat) => (
                  <li
                    key={feat}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      fontSize: 14,
                      color: "#334155",
                      lineHeight: 1.5,
                    }}
                  >
                    <span
                      style={{
                        color: "#4F46E5",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      ✓
                    </span>
                    {feat}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  background: "#4F46E5",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 24px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  boxShadow: "0 4px 14px rgba(79,70,229,0.28)",
                }}
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL ─────────────────────────────────────────────────── */}
      <section
        id="testimonial"
        style={{
          background: "#EEF2FF",
          padding: "80px 32px",
          textAlign: "center",
          ...sectionStyle("testimonial"),
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div
            style={{
              fontSize: "5rem",
              color: "#7C3AED",
              fontFamily: "Georgia, serif",
              lineHeight: 0.8,
              marginBottom: 8,
            }}
          >
            &ldquo;
          </div>
          <blockquote
            style={{
              fontSize: 24,
              color: "#0F172A",
              maxWidth: 800,
              margin: "0 auto",
              lineHeight: 1.6,
              fontStyle: "italic",
              fontWeight: 500,
              padding: 0,
            }}
          >
            We reduced our time-to-shortlist from 3 weeks to 4 days. The AI
            interview quality is genuinely impressive — our clients trust the
            reports more than traditional screening calls.
          </blockquote>

          <div
            style={{
              marginTop: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "#4F46E5",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              SK
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 700, color: "#0F172A", fontSize: 15 }}>
                Sneha Kapoor
              </div>
              <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
                Managing Director, TalentBridge India
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 40,
              display: "flex",
              justifyContent: "center",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            {[
              { v: "3 weeks → 4 days", l: "Time to shortlist" },
              { v: "40%", l: "Increase in placement fees" },
              { v: "3x", l: "Candidates evaluated per recruiter" },
            ].map((m) => (
              <div
                key={m.l}
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: "20px 28px",
                  textAlign: "center",
                  boxShadow: "0 4px 16px rgba(79,70,229,0.08)",
                  minWidth: 200,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    fontWeight: 800,
                    color: "#4F46E5",
                    letterSpacing: "-0.02em",
                    lineHeight: 1.2,
                  }}
                >
                  {m.v}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#64748B",
                    marginTop: 6,
                  }}
                >
                  {m.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────── */}
      <section
        id="pricing"
        style={{
          background: "#fff",
          padding: "96px 32px",
          ...sectionStyle("pricing"),
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span
              style={{
                display: "inline-block",
                background: "#EEF2FF",
                color: "#4F46E5",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.12em",
                padding: "6px 12px",
                borderRadius: 100,
                marginBottom: 16,
              }}
            >
              PRICING
            </span>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 44,
                fontWeight: 800,
                color: "#0F172A",
                letterSpacing: "-0.025em",
                lineHeight: 1.15,
                margin: 0,
                marginBottom: 12,
              }}
            >
              Built for agencies. Scaled for enterprise.
            </h2>
            <p style={{ fontSize: 18, color: "#64748B", margin: 0 }}>
              We price based on your volume and use case. No hidden fees.
            </p>
          </div>

          <div
            style={{
              maxWidth: 960,
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
            }}
            className="pricing-grid"
          >
            {/* Agency */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 20,
                padding: 36,
                position: "relative",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  background: "#EEF2FF",
                  color: "#4F46E5",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  padding: "5px 10px",
                  borderRadius: 100,
                  marginBottom: 16,
                }}
              >
                FOR AGENCIES
              </span>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 28,
                  fontWeight: 800,
                  color: "#0F172A",
                  letterSpacing: "-0.02em",
                  margin: 0,
                  marginBottom: 14,
                }}
              >
                Agency
              </h3>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#4F46E5",
                  marginBottom: 4,
                }}
              >
                Pricing on request
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#94A3B8",
                  marginBottom: 24,
                }}
              >
                Based on interviews per month
              </div>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  background: "#4F46E5",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 0",
                  width: "100%",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  boxShadow: "0 4px 14px rgba(79,70,229,0.22)",
                  marginBottom: 28,
                }}
              >
                Book a Demo
              </button>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {[
                  "Everything in How It Works",
                  "Multi-client management",
                  "White-label reports",
                  "Client approval workflows",
                  "Evaluated shortlist delivery",
                  "Email + chat support",
                  "Onboarding included",
                ].map((f) => (
                  <li
                    key={f}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      fontSize: 14,
                      color: "#334155",
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ color: "#4F46E5", fontWeight: 700 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Enterprise */}
            <div
              style={{
                background: "#fff",
                border: "1px solid #4F46E5",
                borderRadius: 20,
                padding: 36,
                position: "relative",
                boxShadow: "0 20px 50px rgba(79,70,229,0.15)",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 20,
                  right: 20,
                  background: "#7C3AED",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  padding: "5px 10px",
                  borderRadius: 100,
                }}
              >
                FOR SCALE
              </span>
              <span
                style={{
                  display: "inline-block",
                  background: "#EEF2FF",
                  color: "#4F46E5",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  padding: "5px 10px",
                  borderRadius: 100,
                  marginBottom: 16,
                }}
              >
                FOR ENTERPRISE
              </span>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 28,
                  fontWeight: 800,
                  color: "#0F172A",
                  letterSpacing: "-0.02em",
                  margin: 0,
                  marginBottom: 14,
                }}
              >
                Enterprise
              </h3>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#4F46E5",
                  marginBottom: 4,
                }}
              >
                Pricing on request
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#94A3B8",
                  marginBottom: 24,
                }}
              >
                Based on hiring volume and departments
              </div>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  background: "#4F46E5",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 0",
                  width: "100%",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  boxShadow: "0 4px 14px rgba(79,70,229,0.28)",
                  marginBottom: 28,
                }}
              >
                Contact Sales
              </button>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {[
                  "Everything in Agency plan",
                  "ATS and HRMS integration",
                  "SSO / SAML",
                  "Department-level controls",
                  "Dedicated Customer Success Manager",
                  "SLA guarantees",
                  "Custom contract and invoicing",
                  "Priority support",
                ].map((f) => (
                  <li
                    key={f}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      fontSize: 14,
                      color: "#334155",
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ color: "#4F46E5", fontWeight: 700 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p
            style={{
              textAlign: "center",
              marginTop: 32,
              fontSize: 13,
              color: "#94A3B8",
              maxWidth: 720,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            All plans include: unlimited positions, AI question generation,
            ElevenLabs voice, evaluation reports, and candidate rankings.
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────────── */}
      <section
        id="final-cta"
        style={{
          background: "#0F172A",
          padding: "96px 32px",
          textAlign: "center",
          ...sectionStyle("final-cta"),
        }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 48,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
              margin: 0,
              marginBottom: 20,
            }}
          >
            Stop losing great candidates to scheduling delays.
          </h2>
          <p
            style={{
              fontSize: 18,
              color: "#94A3B8",
              maxWidth: 560,
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            Join recruitment agencies and enterprise teams already using Levl1
            to evaluate faster, fairer, and at scale.
          </p>

          <div
            style={{
              marginTop: 40,
              display: "flex",
              justifyContent: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => setShowModal(true)}
              style={{
                background: "#4F46E5",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "16px 32px",
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                boxShadow: "0 8px 28px rgba(79,70,229,0.4)",
              }}
            >
              Book a Demo
            </button>
            <Link
              href="/login"
              style={{
                background: "transparent",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 12,
                padding: "16px 32px",
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Sign in
            </Link>
          </div>

          <p
            style={{
              marginTop: 24,
              fontSize: 13,
              color: "#475569",
            }}
          >
            No setup fee. Onboarding included. First 10 interviews free.
          </p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer
        style={{
          background: "#fff",
          padding: "64px 32px 32px",
          borderTop: "1px solid #F1F5F9",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr 1fr",
            gap: 48,
          }}
          className="footer-grid"
        >
          <div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                fontWeight: 700,
                color: "#0F172A",
                letterSpacing: "-0.02em",
                marginBottom: 12,
              }}
            >
              Levl<span style={{ color: "#7C3AED" }}>1</span>
            </div>
            <p
              style={{
                fontSize: 14,
                color: "#64748B",
                lineHeight: 1.6,
                maxWidth: 280,
                margin: 0,
                marginBottom: 12,
              }}
            >
              AI-powered L1 interviews for tech and product roles. Built for
              agencies and enterprise hiring teams.
            </p>
            <a
              href="#"
              style={{
                fontSize: 13,
                color: "#4F46E5",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              levl1.app
            </a>
          </div>

          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#94A3B8",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Product
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "How it Works", id: "how-it-works" },
                { label: "For Agencies", id: "agencies" },
                { label: "For Enterprise", id: "enterprise" },
                { label: "Pricing", id: "pricing" },
              ].map((l) => (
                <button
                  key={l.id}
                  onClick={() => scrollToId(l.id)}
                  style={{
                    fontSize: 14,
                    color: "#475569",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                    padding: 0,
                    textAlign: "left",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#4F46E5")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#475569")
                  }
                >
                  {l.label}
                </button>
              ))}
              <button
                onClick={() => setShowModal(true)}
                style={{
                  fontSize: 14,
                  color: "#475569",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  padding: 0,
                  textAlign: "left",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#4F46E5")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
              >
                Book a Demo
              </button>
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#94A3B8",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Company
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {["About", "Privacy Policy", "Terms of Service", "Contact"].map(
                (l) => (
                  <a
                    key={l}
                    href="#"
                    style={{
                      fontSize: 14,
                      color: "#475569",
                      textDecoration: "none",
                      transition: "color 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#4F46E5")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#475569")
                    }
                  >
                    {l}
                  </a>
                ),
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            maxWidth: 1200,
            margin: "40px auto 0",
            paddingTop: 24,
            borderTop: "1px solid #F1F5F9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <p style={{ fontSize: 13, color: "#94A3B8", margin: 0 }}>
            © 2026 Levl1. All rights reserved.
          </p>
          <p style={{ fontSize: 13, color: "#94A3B8", margin: 0 }}>
            Privacy · Terms
          </p>
        </div>
      </footer>

      {/* ── Keyframes ───────────────────────────────────────────────────── */}
      <style>{`
        @keyframes float {
          from { transform: translateY(0px); }
          to   { transform: translateY(-12px); }
        }
        @keyframes waveBar {
          0%, 100% { height: 8px;  opacity: 0.5; }
          50%      { height: 32px; opacity: 1;   }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1;   transform: scale(1);   }
          50%      { opacity: 0.4; transform: scale(0.7); }
        }
        @media (max-width: 900px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
          }
          .problem-grid {
            grid-template-columns: 1fr !important;
          }
          .two-panel-grid {
            grid-template-columns: 1fr !important;
          }
          .pricing-grid {
            grid-template-columns: 1fr !important;
          }
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
          .how-arrow {
            display: none !important;
          }
        }

        /* ── Slide-down animation for mobile menu ─────────────────── */
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }

        /* ── Mobile ≤ 768px ───────────────────────────────────────── */
        @media (max-width: 768px) {
          /* Nav: hide links + CTAs, show hamburger */
          .landing-nav-links { display: none !important; }
          .landing-nav-ctas  { display: none !important; }
          .landing-hamburger { display: flex !important; }

          /* Reduce header padding */
          .landing-header-inner { padding: 0 16px !important; }

          /* Hero */
          .hero-grid { gap: 32px !important; }
          .hero-grid > div:first-child h1 { font-size: 34px !important; }
          .hero-grid > div:last-child { display: none !important; } /* hide illustration */

          /* Sections */
          section { padding: 48px 16px !important; }

          /* Pricing cards: scroll horizontally */
          .pricing-grid { overflow-x: auto; flex-wrap: nowrap !important; }

          /* Footer */
          .footer-grid { gap: 24px !important; }

          /* General padding reduction */
          [style*="padding: 80px"] { padding: 48px 16px !important; }
          [style*="padding: 100px"] { padding: 48px 16px !important; }
        }
      `}</style>
    </div>
  );
}
