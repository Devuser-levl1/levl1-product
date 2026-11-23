import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/emailService'

// ── Shared demo plumbing (Screen-scoped, server-only) ──────────────────────
// Used by BOTH public demos — Screen (/api/demo/start) and Solve
// (/api/solve/demo/start) — so they share one isolated demo agency, one lead
// notification, and ONE rate-limit budget (protects voice/LLM/Judge0 cost).

const LEADS_EMAIL = process.env.DEMO_LEADS_EMAIL ?? 'sales@levl1.io'
export const DEMO_AGENCY_NAME = '__Levl1 Demo__'

export async function getDemoAgencyId(): Promise<string> {
  const existing = await prisma.agency.findFirst({ where: { name: DEMO_AGENCY_NAME }, select: { id: true } })
  if (existing) return existing.id
  const created = await prisma.agency.create({ data: { name: DEMO_AGENCY_NAME } })
  return created.id
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

/** Notify sales of a new demo lead (fire-and-forget; never blocks the demo). */
export async function notifySales(lead: { name: string; email: string; roleTitle: string; marketingConsent: boolean; product?: string }) {
  await sendEmail({
    to: LEADS_EMAIL,
    replyTo: lead.email,
    subject: `New demo lead: ${lead.name} — ${lead.roleTitle}${lead.product ? ` (${lead.product})` : ''}`,
    html: `<div style="font-family:Inter,system-ui,sans-serif;font-size:14px;color:#0F172A;line-height:1.7">
      <div style="font-size:16px;font-weight:800;color:#4F46E5;margin-bottom:10px">New Levl1 demo lead</div>
      <table style="border-collapse:collapse">
        <tr><td style="color:#64748B;padding:2px 14px 2px 0">Name</td><td><strong>${esc(lead.name)}</strong></td></tr>
        <tr><td style="color:#64748B;padding:2px 14px 2px 0">Work email</td><td><a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a></td></tr>
        ${lead.product ? `<tr><td style="color:#64748B;padding:2px 14px 2px 0">Product</td><td>${esc(lead.product)}</td></tr>` : ''}
        <tr><td style="color:#64748B;padding:2px 14px 2px 0">Tried role</td><td>${esc(lead.roleTitle)}</td></tr>
        <tr><td style="color:#64748B;padding:2px 14px 2px 0">Marketing consent</td><td>${lead.marketingConsent ? 'Opted in' : 'Not opted in'}</td></tr>
        <tr><td style="color:#64748B;padding:2px 14px 2px 0">When</td><td>${new Date().toUTCString()}</td></tr>
      </table>
      <p style="color:#94A3B8;font-size:12px;margin-top:16px">Reply to this email to reach the prospect directly.</p>
    </div>`,
  })
}

// Rate limiting (G5) — protects against abuse + runaway voice/LLM/Judge0 cost.
// Two layers, both env-tunable, shared by every public demo:
//   DEMO_RATE_LIMIT_PER_IP  — demo starts per IP per 24h (default 3)
//   DEMO_GLOBAL_DAILY_CAP   — global circuit-breaker per 24h (default 200)
// Counts only SUCCESSFUL starts so failed attempts don't burn a prospect's quota.
const DAY_MS = 24 * 60 * 60 * 1000
const PER_IP_LIMIT = Math.max(1, Number(process.env.DEMO_RATE_LIMIT_PER_IP ?? 3))
const GLOBAL_DAILY_CAP = Math.max(1, Number(process.env.DEMO_GLOBAL_DAILY_CAP ?? 200))
const ipHits = new Map<string, number[]>()
let globalHits: number[] = []

export function checkDemoRate(ip: string): { ok: true } | { ok: false; reason: 'ip' | 'global'; message: string } {
  const now = Date.now()
  globalHits = globalHits.filter((t) => now - t < DAY_MS)
  if (globalHits.length >= GLOBAL_DAILY_CAP) return { ok: false, reason: 'global', message: 'Our live demo is at capacity right now — book a quick call and we\'ll walk you through it.' }
  const recent = (ipHits.get(ip) ?? []).filter((t) => now - t < DAY_MS)
  if (recent.length >= PER_IP_LIMIT) return { ok: false, reason: 'ip', message: 'You\'ve reached the demo limit for now — book a call and we\'ll give you full access.' }
  return { ok: true }
}

export function recordDemoStart(ip: string) {
  const now = Date.now()
  const recent = (ipHits.get(ip) ?? []).filter((t) => now - t < DAY_MS)
  recent.push(now); ipHits.set(ip, recent)
  globalHits.push(now)
}

export const requestIp = (req: Request) => req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
