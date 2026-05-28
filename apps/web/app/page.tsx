"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart2,
  Users,
  Video,
  Shield,
  Zap,
  Star,
  ChevronRight,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

const FEATURES = [
  {
    icon: Zap,
    title: "AI Voice Screening",
    desc: "Conduct structured, role-specific interviews 24/7 — no human scheduling required. Candidates interview on their own time.",
    color: "#7C3AED",
  },
  {
    icon: BarChart2,
    title: "Automated Scoring",
    desc: "Every answer is evaluated in real-time. AI generates a structured score with a detailed recommendation for each candidate.",
    color: "#8B5CF6",
  },
  {
    icon: Users,
    title: "Pipeline Management",
    desc: "Manage every candidate across every open role from a single Kanban view. Filter, sort, and move candidates instantly.",
    color: "#10B981",
  },
  {
    icon: Video,
    title: "Live Monitoring",
    desc: "Watch AI interviews in real-time. See agent status, candidate join events, and live transcripts as they happen.",
    color: "#F59E0B",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    desc: "SOC 2 Type II compliant. Data encrypted in transit and at rest. Role-based access control for every team member.",
    color: "#EF4444",
  },
  {
    icon: Zap,
    title: "Instant Rankings",
    desc: "After each position closes, get a ranked shortlist with scores, recommendations, and side-by-side comparisons.",
    color: "#4F46E5",
  },
];

const STATS = [
  { value: "500+", label: "Agencies worldwide" },
  { value: "50k+", label: "Interviews per month" },
  { value: "78%", label: "Faster time-to-screen" },
  { value: "4.9★", label: "Average rating" },
];

const NAV_LINKS = [
  { label: "Features", sectionId: "features" },
  { label: "Pricing",  sectionId: "pricing"  },
  { label: "About",    sectionId: "about"     },
  { label: "Blog",     sectionId: "blog"      },
];

function scrollToSection(sectionId: string) {
  const el = document.getElementById(sectionId);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    toast("Section coming soon");
  }
}

function ContactModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(15,10,46,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "#fff", borderRadius: 18, width: 480, maxWidth: "calc(100vw - 32px)",
          boxShadow: "0 32px 80px rgba(79,70,229,0.18), 0 8px 24px rgba(0,0,0,0.08)",
          overflow: "hidden", border: "1px solid #E2E8F0",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "#4F46E5", letterSpacing: "-0.01em" }}>Book a Demo</div>
            <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 2 }}>We&apos;ll get back to you within 24 hours</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 6, borderRadius: 7, display: "flex" }}>
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px" }}>
          {submitted ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Star size={24} color="#10B981" />
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "#4F46E5", marginBottom: 8 }}>Thank you!</div>
              <div style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6 }}>Thank you, we will be in touch.</div>
              <button
                onClick={onClose}
                style={{ marginTop: 24, background: "#7C3AED", color: "#fff", border: "none", borderRadius: 9, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Full Name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, fontFamily: "var(--font-sans)", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Email Address</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@company.com"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, fontFamily: "var(--font-sans)", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us about your use case…"
                  rows={4}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, fontFamily: "var(--font-sans)", outline: "none", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={onClose} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, color: "#475569", fontSize: 13, fontWeight: 600, padding: "9px 18px", cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" style={{ background: "#7C3AED", color: "#fff", border: "none", borderRadius: 9, padding: "9px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(124,58,237,0.3)" }}>
                  Send Message
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [showDemoModal, setShowDemoModal] = useState(false);

  return (
    <div style={{ fontFamily: "var(--font-sans)", background: "#fff", color: "var(--brand)" }}>
      {showDemoModal && <ContactModal onClose={() => setShowDemoModal(false)} />}

      {/* ── Nav ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid #E2E8F0",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 32px",
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(124,58,237,0.25)",
              }}
            >
              <Zap size={15} color="white" strokeWidth={2.5} fill="white" />
            </div>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 17,
                fontWeight: 700,
                color: "#4F46E5",
                letterSpacing: "-0.02em",
              }}
            >
              Levl1
            </span>
          </div>

          {/* Links */}
          <nav style={{ display: "flex", alignItems: "center", gap: 32 }}>
            {NAV_LINKS.map((l) => (
              <button
                key={l.label}
                onClick={() => scrollToSection(l.sectionId)}
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#475569",
                  textDecoration: "none",
                  transition: "color 0.15s",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  padding: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#4F46E5")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
              >
                {l.label}
              </button>
            ))}
          </nav>

          {/* CTAs */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link
              href="/login"
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "#475569",
                textDecoration: "none",
                padding: "8px 16px",
              }}
            >
              Sign in
            </Link>
            <Link
              href="/login"
              style={{
                background: "#7C3AED",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "9px 20px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.2s",
                boxShadow: "0 2px 8px rgba(124,58,237,0.25)",
              }}
            >
              Get Started
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section
        style={{
          background:
            "linear-gradient(165deg, #F8FAFF 0%, #FAFAFA 50%, #F0F9FF 100%)",
          borderBottom: "1px solid #E2E8F0",
          padding: "100px 32px 80px",
        }}
      >
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            textAlign: "center",
            animation: "fadeUp 0.6s ease both",
          }}
        >
          {/* Eyebrow */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(124,58,237,0.08)",
              border: "1px solid rgba(124,58,237,0.2)",
              borderRadius: 100,
              padding: "5px 14px",
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#7C3AED",
                boxShadow: "0 0 8px rgba(124,58,237,0.6)",
              }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#6D28D9",
                letterSpacing: "0.04em",
              }}
            >
              AI-POWERED L1 INTERVIEWS
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 62,
              fontWeight: 800,
              color: "#4F46E5",
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              marginBottom: 20,
            }}
          >
            AI interviews that{" "}
            <span
              style={{
                background:
                  "linear-gradient(135deg, #7C3AED 0%, #C4B5FD 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              never miss great talent.
            </span>
          </h1>

          {/* Sub */}
          <p
            style={{
              fontSize: 20,
              color: "#475569",
              lineHeight: 1.65,
              maxWidth: 680,
              margin: "0 auto 40px",
              fontWeight: 400,
            }}
          >
            Levl1 conducts structured L1 interviews so your best candidates
            don&apos;t get lost to scheduling delays and panel availability.
          </p>

          {/* CTAs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              marginBottom: 64,
            }}
          >
            <Link
              href="/login"
              style={{
                background: "#7C3AED",
                color: "#fff",
                borderRadius: 10,
                padding: "14px 28px",
                fontSize: 15,
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 6px 24px rgba(124,58,237,0.35)",
                transition: "all 0.2s",
                letterSpacing: "-0.01em",
              }}
            >
              Get Started Free
              <ArrowRight size={16} />
            </Link>
            <button
              onClick={() => scrollToSection("features")}
              style={{
                background: "#fff",
                color: "#4F46E5",
                border: "1px solid #E2E8F0",
                borderRadius: 10,
                padding: "14px 28px",
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 1px 3px rgba(79,70,229,0.06)",
                transition: "all 0.2s",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}
            >
              See How It Works
            </button>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 1,
              background: "#E2E8F0",
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid #E2E8F0",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {STATS.map((s, i) => (
              <div
                key={s.label}
                style={{
                  background: "#fff",
                  padding: "24px 20px",
                  textAlign: "center",
                  borderRight:
                    i < STATS.length - 1 ? "1px solid #E2E8F0" : "none",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 30,
                    fontWeight: 800,
                    color: "#4F46E5",
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#94A3B8",
                    marginTop: 6,
                    fontWeight: 500,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section
        id="features"
        style={{
          padding: "96px 32px",
          background: "#FAFAFA",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {/* Section header */}
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#7C3AED",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              What we do
            </p>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 42,
                fontWeight: 800,
                color: "#4F46E5",
                letterSpacing: "-0.025em",
                lineHeight: 1.15,
                marginBottom: 16,
              }}
            >
              Everything your team needs
            </h2>
            <p style={{ fontSize: 17, color: "#475569", maxWidth: 500, margin: "0 auto", lineHeight: 1.6 }}>
              One platform to screen, score, and shortlist — without the
              scheduling chaos.
            </p>
          </div>

          {/* Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 20,
            }}
          >
            {FEATURES.map((f) => (
              <div
                key={f.title}
                style={{
                  background: "#fff",
                  border: "1px solid #E2E8F0",
                  borderRadius: 16,
                  padding: "28px",
                  boxShadow: "0 1px 3px rgba(79,70,229,0.05)",
                  transition: "all 0.2s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#CBD5E1";
                  e.currentTarget.style.boxShadow =
                    "0 8px 24px rgba(79,70,229,0.08)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#E2E8F0";
                  e.currentTarget.style.boxShadow =
                    "0 1px 3px rgba(79,70,229,0.05)";
                  e.currentTarget.style.transform = "none";
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: `${f.color}14`,
                    border: `1px solid ${f.color}22`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 18,
                  }}
                >
                  <f.icon size={22} color={f.color} strokeWidth={1.75} />
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 17,
                    fontWeight: 700,
                    color: "#4F46E5",
                    marginBottom: 8,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: "#475569",
                    lineHeight: 1.65,
                  }}
                >
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing placeholder ── */}
      <section id="pricing" style={{ height: 1 }} />
      <section id="about" style={{ height: 1 }} />
      <section id="blog" style={{ height: 1 }} />

      {/* ── Testimonial ── */}
      <section
        style={{
          padding: "96px 32px",
          background: "#fff",
          borderTop: "1px solid #E2E8F0",
          borderBottom: "1px solid #E2E8F0",
        }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 4,
              marginBottom: 28,
            }}
          >
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={20} color="#F59E0B" fill="#F59E0B" />
            ))}
          </div>

          <blockquote
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 26,
              fontWeight: 600,
              color: "#4F46E5",
              lineHeight: 1.45,
              letterSpacing: "-0.02em",
              marginBottom: 32,
            }}
          >
            &ldquo;Levl1 cut our time-to-screen by 78%. We now
            evaluate 10&times; more candidates with the same team — and the quality
            of our shortlists has never been better.&rdquo;
          </blockquote>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              PS
            </div>
            <div style={{ textAlign: "left" }}>
              <div
                style={{
                  fontWeight: 600,
                  color: "#4F46E5",
                  fontSize: 15,
                }}
              >
                Priya Sharma
              </div>
              <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 2 }}>
                Head of Talent, FinEdge Technologies
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section
        style={{
          padding: "96px 32px",
          background: "linear-gradient(135deg, #4F46E5 0%, #312E81 100%)",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 42,
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
              marginBottom: 16,
            }}
          >
            Start running L1 interviews today
          </h2>
          <p
            style={{
              fontSize: 17,
              color: "rgba(255,255,255,0.65)",
              lineHeight: 1.6,
              marginBottom: 40,
            }}
          >
            Let Levl1 handle your first-round screens — so your team focuses
            on the candidates who actually matter.
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <Link
              href="/login"
              style={{
                background: "#7C3AED",
                color: "#fff",
                borderRadius: 10,
                padding: "14px 28px",
                fontSize: 15,
                fontWeight: 700,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 6px 24px rgba(124,58,237,0.4)",
                letterSpacing: "-0.01em",
              }}
            >
              Start for Free
              <ArrowRight size={16} />
            </Link>
            <button
              onClick={() => setShowDemoModal(true)}
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.85)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 10,
                padding: "14px 28px",
                fontSize: 15,
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}
            >
              Book a Demo
            </button>
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 20 }}>
            No credit card required &nbsp;·&nbsp; 14-day free trial
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          background: "#0F0A2E",
          padding: "48px 32px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr 1fr 1fr",
            gap: 48,
          }}
        >
          {/* Brand */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background:
                    "linear-gradient(135deg, #7C3AED 0%, #C4B5FD 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Zap size={13} color="white" strokeWidth={2.5} fill="white" />
              </div>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                Levl1
              </span>
            </div>
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.4)",
                lineHeight: 1.65,
                maxWidth: 240,
              }}
            >
              AI-powered L1 interviews for tech and product roles.
            </p>
          </div>

          {/* Link groups */}
          {[
            {
              title: "Product",
              links: ["Features", "Pricing", "Changelog", "Roadmap"],
            },
            {
              title: "Company",
              links: ["About", "Blog", "Careers", "Press"],
            },
            {
              title: "Legal",
              links: ["Privacy", "Terms", "Security", "Cookies"],
            },
          ].map((g) => (
            <div key={g.title}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.35)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 16,
                }}
              >
                {g.title}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {g.links.map((l) => (
                  <a
                    key={l}
                    href="#"
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,0.50)",
                      textDecoration: "none",
                      transition: "color 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "rgba(255,255,255,0.9)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "rgba(255,255,255,0.50)")
                    }
                  >
                    {l}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            maxWidth: 1200,
            margin: "40px auto 0",
            paddingTop: 24,
            borderTop: "1px solid rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            &copy; 2026 Levl1. Built for recruitment agencies and enterprises.
          </p>
          <div style={{ display: "flex", gap: 6 }}>
            {["SOC 2", "GDPR", "ISO 27001"].map((badge) => (
              <span
                key={badge}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.4)",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 4,
                  padding: "3px 8px",
                  letterSpacing: "0.04em",
                }}
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
