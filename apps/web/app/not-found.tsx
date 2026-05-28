"use client";

import Link from "next/link";
import { Zap, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(165deg, #F8FAFF 0%, #FAFAFA 50%, #F0F9FF 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-sans)",
        padding: "32px",
        textAlign: "center",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
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
            fontSize: 18,
            fontWeight: 700,
            color: "#4F46E5",
            letterSpacing: "-0.02em",
          }}
        >
          Levl1
        </span>
      </div>

      {/* 404 number */}
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 120,
          fontWeight: 800,
          color: "#E2E8F0",
          lineHeight: 1,
          letterSpacing: "-0.04em",
          marginBottom: 8,
          background: "linear-gradient(135deg, #E2E8F0 0%, #CBD5E1 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        404
      </div>

      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 28,
          fontWeight: 800,
          color: "#4F46E5",
          letterSpacing: "-0.025em",
          marginBottom: 12,
          lineHeight: 1.2,
        }}
      >
        Page not found
      </h1>

      <p
        style={{
          fontSize: 16,
          color: "#94A3B8",
          lineHeight: 1.6,
          maxWidth: 380,
          marginBottom: 40,
        }}
      >
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      <Link
        href="/dashboard"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: "#4F46E5",
          color: "#fff",
          borderRadius: 10,
          padding: "13px 24px",
          fontSize: 15,
          fontWeight: 700,
          textDecoration: "none",
          boxShadow: "0 4px 16px rgba(79,70,229,0.25)",
          letterSpacing: "-0.01em",
          transition: "all 0.2s",
        }}
      >
        <ArrowLeft size={16} />
        Go to Dashboard
      </Link>
    </div>
  );
}
