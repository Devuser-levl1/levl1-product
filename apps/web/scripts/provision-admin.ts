/**
 * scripts/provision-admin.ts — provision a tenant user (ADMIN/RECRUITER/…) with
 * a set password, WITHOUT the free-trial signup flow. Creates or updates a
 * HireUser in an EXISTING tenant and marks it active (usable password hash) so
 * "Sign in" works immediately — no trial, no invite email.
 *
 * ─────────────────────────────── SAFETY ─────────────────────────────────────
 * • Gated: refuses to run unless ALLOW_ADMIN_PROVISION=true. Not an HTTP route —
 *   cannot be called publicly.
 * • Never creates a tenant. The target tenant must already exist; resolved from
 *   PROVISION_TENANT_ID, or from an existing user (PROVISION_TENANT_ADMIN_EMAIL,
 *   or the target user's own current tenant). Aborts otherwise.
 * • Only ever writes the ONE target HireUser row in the ONE resolved tenant.
 *   Never reads/modifies/deletes any other tenant's data.
 * • Password is hashed with bcrypt(rounds=10) — identical to the app
 *   (lib/hire/auth.hashPassword) — so the existing login verifies it.
 *
 * Modes:
 *   PROVISION_DEMO=true   → provision BOTH demo accounts in the demo tenant:
 *                           demoadmin@levl1.io (ADMIN) + demomember@levl1.io (RECRUITER),
 *                           both with PROVISION_PASSWORD. Tenant resolved from
 *                           demoadmin's existing record and asserted demo-only.
 *   (single-user mode)    → PROVISION_EMAIL + PROVISION_PASSWORD [+ PROVISION_ROLE,
 *                           PROVISION_NAME, PROVISION_TENANT_ID | PROVISION_TENANT_ADMIN_EMAIL]
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const DEMO_DOMAIN = '@levl1.io'
const VALID_ROLES = new Set(['ADMIN', 'MANAGER', 'RECRUITER', 'VIEWER'])

function die(msg: string): never {
  console.error(`\n❌ ABORT: ${msg}\n`)
  process.exit(1)
}

async function hash(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10) // identical to lib/hire/auth.hashPassword
}

/** Create or update ONE HireUser in the given tenant. Scoped to (tenantId, email). */
async function provisionUser(tenantId: string, email: string, role: string, name: string, passwordHash: string) {
  const existing = await prisma.hireUser.findFirst({ where: { tenantId, email } })
  if (existing) {
    const u = await prisma.hireUser.update({ where: { id: existing.id }, data: { role: role as 'ADMIN' | 'MANAGER' | 'RECRUITER' | 'VIEWER', passwordHash, ...(name ? { name } : {}) } })
    return { action: 'updated', id: u.id, email: u.email, role: u.role }
  }
  const u = await prisma.hireUser.create({ data: { tenantId, email, role: role as 'ADMIN' | 'MANAGER' | 'RECRUITER' | 'VIEWER', name: name || email.split('@')[0], passwordHash } })
  return { action: 'created', id: u.id, email: u.email, role: u.role }
}

/** Resolve a tenant that contains ONLY @levl1.io demo users (safety). */
async function assertDemoTenant(tenantId: string): Promise<string> {
  const t = await prisma.hireTenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true } })
  if (!t) die(`Tenant ${tenantId} not found.`)
  const users = await prisma.hireUser.findMany({ where: { tenantId }, select: { email: true } })
  const nonDemo = users.filter((u) => !u.email.endsWith(DEMO_DOMAIN))
  if (nonDemo.length > 0) die(`Tenant ${tenantId} ("${t.name}") has non-demo users (${nonDemo.map((u) => u.email).join(', ')}). Refusing (not a demo tenant).`)
  return t.name
}

async function main() {
  if (process.env.ALLOW_ADMIN_PROVISION !== 'true') {
    die('Refusing to run without ALLOW_ADMIN_PROVISION=true. This is an internal, gated provisioning tool.')
  }
  const password = process.env.PROVISION_PASSWORD
  if (!password || password.length < 8) die('PROVISION_PASSWORD is required and must be at least 8 characters.')

  console.log('\n────────────────────────────────────────────────────────')
  console.log(' Levl1 Hire — admin provisioning (no trial)')
  console.log('────────────────────────────────────────────────────────')

  const passwordHash = await hash(password)

  // ── DEMO MODE: provision both demo accounts in the demo tenant ─────────────
  if (process.env.PROVISION_DEMO === 'true') {
    const admin = await prisma.hireUser.findFirst({ where: { email: 'demoadmin@levl1.io' } })
    if (!admin) die('demoadmin@levl1.io not found — run the demo seeder bootstrap first (npm run seed:demo:bootstrap).')
    const tenantId = admin.tenantId
    const tenantName = await assertDemoTenant(tenantId) // safety: demo-only tenant

    console.log(`\n🔒 Target tenant (demo, @levl1.io only): ${tenantId} ("${tenantName}")`)
    const r1 = await provisionUser(tenantId, 'demoadmin@levl1.io', 'ADMIN', 'Demo Admin', passwordHash)
    const r2 = await provisionUser(tenantId, 'demomember@levl1.io', 'RECRUITER', 'Demo Recruiter', passwordHash)
    console.log(`   ✓ ${r1.action} ${r1.email} → ${r1.role} (active)`)
    console.log(`   ✓ ${r2.action} ${r2.email} → ${r2.role} (active)`)
    console.log(`\n✅ Both demo accounts are ACTIVE with the provided password. Sign in at /hire/login.`)
    console.log(`   No other tenant was touched.\n`)
    await prisma.$disconnect()
    return
  }

  // ── SINGLE-USER MODE ───────────────────────────────────────────────────────
  const email = (process.env.PROVISION_EMAIL ?? '').trim().toLowerCase()
  if (!email) die('PROVISION_EMAIL is required (or set PROVISION_DEMO=true).')
  const role = (process.env.PROVISION_ROLE ?? 'ADMIN').toUpperCase()
  if (!VALID_ROLES.has(role)) die(`PROVISION_ROLE must be one of ${Array.from(VALID_ROLES).join(', ')}.`)
  const name = process.env.PROVISION_NAME ?? ''

  // Resolve the EXISTING tenant (never create one).
  let tenantId: string | null = null
  if (process.env.PROVISION_TENANT_ID) {
    tenantId = process.env.PROVISION_TENANT_ID
    const t = await prisma.hireTenant.findUnique({ where: { id: tenantId }, select: { id: true } })
    if (!t) die(`PROVISION_TENANT_ID ${tenantId} not found.`)
  } else if (process.env.PROVISION_TENANT_ADMIN_EMAIL) {
    const ref = await prisma.hireUser.findFirst({ where: { email: process.env.PROVISION_TENANT_ADMIN_EMAIL.toLowerCase() }, select: { tenantId: true } })
    if (!ref) die(`PROVISION_TENANT_ADMIN_EMAIL ${process.env.PROVISION_TENANT_ADMIN_EMAIL} not found.`)
    tenantId = ref.tenantId
  } else {
    const self = await prisma.hireUser.findFirst({ where: { email }, select: { tenantId: true } })
    if (!self) die(`No tenant given and ${email} does not exist yet. Provide PROVISION_TENANT_ID or PROVISION_TENANT_ADMIN_EMAIL.`)
    tenantId = self.tenantId
  }

  const tenant = await prisma.hireTenant.findUnique({ where: { id: tenantId }, select: { name: true } })
  console.log(`\n🔒 Target tenant: ${tenantId} ("${tenant?.name}")`)
  const r = await provisionUser(tenantId, email, role, name, passwordHash)
  console.log(`   ✓ ${r.action} ${r.email} → ${r.role} (active)`)
  console.log(`\n✅ ${email} is ACTIVE with the provided password. Sign in at /hire/login. No other tenant was touched.\n`)
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('\n❌ Provision failed:', e instanceof Error ? e.message : e)
  await prisma.$disconnect()
  process.exit(1)
})
