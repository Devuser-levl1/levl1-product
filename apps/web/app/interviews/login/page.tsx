"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, Eye, EyeOff, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Login failed. Please check your credentials.');
        setLoading(false);
        return;
      }
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div
      className="login-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        minHeight: "100vh",
        fontFamily: "var(--font-sans)",
      }}
    >
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
                <a
                  href="/forgot-password"
                  style={{ fontSize: 12, color: "#7C3AED", fontWeight: 500, textDecoration: "none" }}
                >
                  Forgot password?
                </a>
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
            <Link
              href="/signup"
              style={{
                color: "#7C3AED",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Start free trial
            </Link>
          </p>

          {/* Cross-product link */}
          <p
            style={{
              textAlign: "center",
              fontSize: 12.5,
              color: "#94A3B8",
              marginTop: 14,
            }}
          >
            Looking for Levl1 Hire?{" "}
            <Link
              href="/hire/login"
              style={{ color: "#7C3AED", textDecoration: "none", fontWeight: 600 }}
            >
              Sign in here →
            </Link>
          </p>
        </div>
      </div>

      {/* ── RIGHT: Photo panel (hidden on mobile) ── */}
      <div
        className="login-right-panel"
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

      <style>{`
        @media (max-width: 768px) {
          .login-grid {
            grid-template-columns: 1fr !important;
          }
          .login-right-panel {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
