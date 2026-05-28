"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, Eye, EyeOff, ArrowRight, X, Star } from "lucide-react";
import toast from "react-hot-toast";

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
        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: 18, width: 480, maxWidth: "calc(100vw - 32px)", boxShadow: "0 32px 80px rgba(79,70,229,0.18)", overflow: "hidden", border: "1px solid #E2E8F0" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "#4F46E5" }}>Request Access</div>
            <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 2 }}>We&apos;ll get back to you within 24 hours</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 6, borderRadius: 7, display: "flex" }}>
            <X size={17} />
          </button>
        </div>
        <div style={{ padding: "24px" }}>
          {submitted ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Star size={24} color="#10B981" />
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "#4F46E5", marginBottom: 8 }}>Thank you!</div>
              <div style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6 }}>Thank you, we will be in touch.</div>
              <button onClick={onClose} style={{ marginTop: 24, background: "#7C3AED", color: "#fff", border: "none", borderRadius: 9, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Close</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Full Name</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, fontFamily: "var(--font-sans)", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Email Address</label>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, fontFamily: "var(--font-sans)", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Message</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us about your use case…" rows={4} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, fontFamily: "var(--font-sans)", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" onClick={onClose} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 9, color: "#475569", fontSize: 13, fontWeight: 600, padding: "9px 18px", cursor: "pointer" }}>Cancel</button>
                <button type="submit" style={{ background: "#7C3AED", color: "#fff", border: "none", borderRadius: 9, padding: "9px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Send Message</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showRequestModal, setShowRequestModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);
    // Simulate network delay then redirect
    await new Promise((r) => setTimeout(r, 900));
    router.push("/dashboard");
  };

  const handleGoogle = () => {
    setLoading(true);
    setTimeout(() => router.push("/dashboard"), 700);
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        minHeight: "100vh",
        fontFamily: "var(--font-sans)",
      }}
    >
      {showRequestModal && <ContactModal onClose={() => setShowRequestModal(false)} />}
      {/* ── LEFT: Form panel ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "48px 60px",
          background: "#fff",
        }}
      >
        <div style={{ maxWidth: 400, width: "100%" }}>
          {/* Logo */}
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              marginBottom: 48,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background:
                  "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(124,58,237,0.25)",
              }}
            >
              <Zap size={16} color="white" strokeWidth={2.5} fill="white" />
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
          </Link>

          {/* Heading */}
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 30,
              fontWeight: 800,
              color: "#4F46E5",
              letterSpacing: "-0.025em",
              lineHeight: 1.2,
              marginBottom: 8,
            }}
          >
            Welcome back
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#94A3B8",
              marginBottom: 36,
              lineHeight: 1.5,
            }}
          >
            Sign in to your recruiter dashboard.
          </p>

          {/* Google SSO */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "12px 20px",
              borderRadius: 9,
              border: "1px solid #E2E8F0",
              background: "#fff",
              fontSize: 14,
              fontWeight: 600,
              color: "#4F46E5",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "var(--font-sans)",
              transition: "all 0.15s",
              boxShadow: "0 1px 3px rgba(79,70,229,0.06)",
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading)
                e.currentTarget.style.borderColor = "#CBD5E1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#E2E8F0";
            }}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              margin: "24px 0",
            }}
          >
            <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
            <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500 }}>
              or sign in with email
            </span>
            <div style={{ flex: 1, height: 1, background: "#E2E8F0" }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Email */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#4F46E5",
                  marginBottom: 6,
                }}
              >
                Email address
              </label>
              <input
                className="input"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                style={{ height: 44 }}
              />
            </div>

            {/* Password */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <label
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#4F46E5",
                  }}
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => toast("Password reset coming soon")}
                  style={{
                    fontSize: 12,
                    color: "#7C3AED",
                    textDecoration: "none",
                    fontWeight: 500,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                    padding: 0,
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  type={showPw ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ height: 44, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94A3B8",
                    display: "flex",
                    padding: 0,
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p
                style={{
                  fontSize: 13,
                  color: "#DC2626",
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.15)",
                  borderRadius: 8,
                  padding: "10px 14px",
                }}
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? "#94A3B8" : "#4F46E5",
                color: "#fff",
                border: "none",
                borderRadius: 9,
                padding: "13px 20px",
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "var(--font-sans)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 0.2s",
                letterSpacing: "-0.01em",
                marginTop: 4,
                boxShadow: loading
                  ? "none"
                  : "0 4px 14px rgba(79,70,229,0.2)",
              }}
            >
              {loading ? (
                "Signing in…"
              ) : (
                <>
                  Sign In
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer link */}
          <p
            style={{
              textAlign: "center",
              fontSize: 13,
              color: "#94A3B8",
              marginTop: 28,
            }}
          >
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => setShowRequestModal(true)}
              style={{
                color: "#7C3AED",
                textDecoration: "none",
                fontWeight: 600,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
                padding: 0,
              }}
            >
              Request access
            </button>
          </p>
        </div>
      </div>

      {/* ── RIGHT: Photo panel ── */}
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          background: "#4F46E5",
        }}
      >
        {/* Photo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=1200&q=80"
          alt="Professional recruiter"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center top",
          }}
        />

        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(79,70,229,0.25) 0%, rgba(79,70,229,0.15) 40%, rgba(79,70,229,0.75) 80%, rgba(79,70,229,0.95) 100%)",
          }}
        />

        {/* Testimonial card */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 36,
            right: 36,
            background: "rgba(255,255,255,0.10)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 16,
            padding: "24px 28px",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 3,
              marginBottom: 14,
            }}
          >
            {[...Array(5)].map((_, i) => (
              <svg key={i} width="14" height="14" viewBox="0 0 14 14">
                <path
                  d="M7 0l1.764 5.427H14L9.618 8.773 11.382 14 7 10.654 2.618 14l1.764-5.227L0 5.427h5.236L7 0z"
                  fill="#F59E0B"
                />
              </svg>
            ))}
          </div>

          <p
            style={{
              fontSize: 15,
              color: "rgba(255,255,255,0.92)",
              lineHeight: 1.6,
              fontWeight: 400,
              marginBottom: 18,
              fontStyle: "italic",
            }}
          >
            &ldquo;We onboarded Levl1 in a single afternoon. Within
            a week, we&apos;d screened more candidates than the previous
            month.&rdquo;
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #7C3AED, #C4B5FD)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              AM
            </div>
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                Ananya Mehta
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>
                Talent Director, SecureAxis Technologies
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
