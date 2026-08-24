/**
 * scripts/seed-demo.ts — realistic end-to-end demo dataset for the two EXISTING
 * demo users demoadmin@levl1.io (Admin) and demomember@levl1.io (Recruiter).
 *
 * ──────────────────────────── DATA SAFETY (read this) ────────────────────────
 * • The demo tenant is resolved SOLELY by looking up demoadmin@levl1.io and
 *   using THAT HireUser's tenantId. We never guess or hardcode a tenant.
 * • If demoadmin is not found the script ABORTS — unless SEED_DEMO_BOOTSTRAP=true,
 *   which creates a BRAND-NEW, isolated demo tenant + the two demo users. A fresh
 *   tenant can never be an existing/real client tenant.
 * • EVERY delete and EVERY insert is scoped to DEMO_TENANT_ID (directly via
 *   `tenantId`, or via a tenant-scoped relation for child tables). There is NO
 *   unscoped deleteMany({}) anywhere.
 * • Before any write we assert the resolved tenant contains ONLY @levl1.io demo
 *   users — so we can never seed/wipe a real client tenant that merely happens to
 *   have a demoadmin. Requires SEED_DEMO=true to run.
 * • Idempotent: re-running wipes ONLY the demo tenant's demo content and reseeds
 *   to a pristine state. The two demo USER accounts are preserved.
 *
 * Every operation below is scoped to the single constant DEMO_TENANT_ID.
 */
import 'dotenv/config'
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

const DEMO_ADMIN_EMAIL = 'demoadmin@levl1.io'
const DEMO_MEMBER_EMAIL = 'demomember@levl1.io'
const DEMO_DOMAIN = '@levl1.io'

const DAY = 86_400_000
const now = Date.now()
const ago = (days: number) => new Date(now - days * DAY)

// Deterministic RNG so re-seeds produce a stable, believable shape.
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(20260817)
const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
const pickN = <T>(arr: T[], n: number): T[] => [...arr].sort(() => rnd() - 0.5).slice(0, n)
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min

function die(msg: string): never {
  console.error(`\n❌ ABORT: ${msg}\n`)
  process.exit(1)
}

// ── Fake-data pools (believable, not real individuals) ──────────────────────
const FIRST = ['Aarav', 'Diya', 'Rohan', 'Ananya', 'Vikram', 'Priya', 'Karan', 'Sneha', 'Arjun', 'Meera', 'Ishaan', 'Nisha', 'Aditya', 'Kavya', 'Rahul', 'Tara', 'Dev', 'Riya', 'Sameer', 'Pooja', 'Nikhil', 'Aisha', 'Varun', 'Lakshmi', 'Yash', 'Ira', 'Manish', 'Divya', 'Siddharth', 'Neha']
const LAST = ['Sharma', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Gupta', 'Mehta', 'Rao', 'Kapoor', 'Joshi', 'Malhotra', 'Verma', 'Bose', 'Chopra', 'Kumar', 'Menon', 'Desai', 'Bhat', 'Pillai', 'Sethi']
const COMPANIES = ['TCS', 'Infosys', 'Flipkart', 'Razorpay', 'Zomato', 'Swiggy', 'PhonePe', 'Freshworks', 'Zoho', 'Postman', 'CRED', 'Meesho', 'Groww', 'Nykaa', 'Dream11', 'BrowserStack', 'Chargebee', 'Innovaccer']
const SKILL_POOL = ['Java', 'Spring Boot', 'Kafka', 'Kubernetes', 'AWS', 'PostgreSQL', 'React', 'TypeScript', 'Node.js', 'Python', 'Django', 'Go', 'GraphQL', 'Redis', 'Docker', 'Microservices', 'System Design', 'CI/CD', 'Terraform', 'gRPC', '.NET', 'C#', 'Azure', 'MongoDB', 'REST APIs']
const SOURCES = ['LinkedIn', 'Naukri', 'Referral', 'Direct', 'Sourced']
const REJECT_REASONS = ['Compensation expectations above band', 'Not enough backend depth for this role', 'Withdrew — accepted another offer', 'Location mismatch, needs onsite', 'Failed the technical screen', 'Notice period too long']

const rand10 = () => `${int(6, 9)}${int(0, 9)}${int(0, 9)}${int(1000000, 9999999)}`
const email = (f: string, l: string) => `${f}.${l}`.toLowerCase() + `${int(1, 99)}@example.com`

interface JobSpec { title: string; dept: string; skills: string[]; loc: string; salaryMin: number; salaryMax: number }
const JOB_SPECS: JobSpec[] = [
  { title: 'Senior Backend Engineer', dept: 'Engineering', skills: ['Java', 'Spring Boot', 'Kafka', 'PostgreSQL', 'AWS'], loc: 'Bengaluru', salaryMin: 2800000, salaryMax: 4200000 },
  { title: 'Frontend Engineer (React)', dept: 'Engineering', skills: ['React', 'TypeScript', 'GraphQL', 'Node.js'], loc: 'Remote', salaryMin: 1800000, salaryMax: 3000000 },
  { title: 'DevOps / SRE', dept: 'Infrastructure', skills: ['Kubernetes', 'Terraform', 'AWS', 'CI/CD', 'Docker'], loc: 'Hyderabad', salaryMin: 2400000, salaryMax: 3800000 },
  { title: 'Data Engineer', dept: 'Data', skills: ['Python', 'Kafka', 'PostgreSQL', 'AWS'], loc: 'Pune', salaryMin: 2200000, salaryMax: 3600000 },
  { title: '.NET Backend Engineer', dept: 'Engineering', skills: ['.NET', 'C#', 'Azure', 'PostgreSQL'], loc: 'Bengaluru', salaryMin: 2000000, salaryMax: 3400000 },
  { title: 'Golang Microservices Engineer', dept: 'Engineering', skills: ['Go', 'gRPC', 'Kubernetes', 'Redis'], loc: 'Remote', salaryMin: 2600000, salaryMax: 4000000 },
  { title: 'Full-Stack Engineer', dept: 'Engineering', skills: ['Node.js', 'React', 'TypeScript', 'MongoDB'], loc: 'Gurgaon', salaryMin: 2000000, salaryMax: 3200000 },
  { title: 'Platform Engineer', dept: 'Infrastructure', skills: ['Kubernetes', 'Go', 'Terraform', 'AWS'], loc: 'Bengaluru', salaryMin: 3000000, salaryMax: 4500000 },
  { title: 'Python/Django Engineer', dept: 'Engineering', skills: ['Python', 'Django', 'PostgreSQL', 'Redis'], loc: 'Chennai', salaryMin: 1800000, salaryMax: 2800000 },
  { title: 'Engineering Manager — Backend', dept: 'Engineering', skills: ['System Design', 'Java', 'Microservices'], loc: 'Bengaluru', salaryMin: 4000000, salaryMax: 6000000 },
]

const DEAL_STAGES = ['Discovery', 'Proposal', 'Negotiation', 'Verbal Commit', 'Closed Won', 'Closed Lost'] as const
const STAGE_PROBABILITY: Record<string, number> = { Discovery: 10, Proposal: 30, Negotiation: 60, 'Verbal Commit': 80, 'Closed Won': 100, 'Closed Lost': 0 }
const PIPELINE = ['Sourced', 'Screening', 'Interview', 'Technical Round', 'Offer', 'Hired'] as const

function resumeText(name: string, title: string, company: string, years: number, skills: string[]): string {
  return [
    `${name}`,
    `${title} — ${years} years experience`,
    `Currently at ${company}.`,
    ``,
    `SUMMARY`,
    `${title} with ${years}+ years building production systems. Strong in ${skills.slice(0, 3).join(', ')}.`,
    ``,
    `SKILLS`,
    skills.join(', '),
    ``,
    `EXPERIENCE`,
    `${company} — ${title} (${2025 - Math.min(years, 6)}–present)`,
    `  • Led delivery of services using ${skills[0]} and ${skills[1] ?? skills[0]}.`,
    `  • Improved reliability and reduced latency across core APIs.`,
    ``,
    `EDUCATION`,
    `B.Tech, Computer Science`,
  ].join('\n')
}

async function main() {
  // ── GUARD 0: explicit opt-in ──────────────────────────────────────────────
  if (process.env.SEED_DEMO !== 'true') {
    die('Refusing to run without SEED_DEMO=true. This script writes/wipes demo-tenant data.')
  }
  const BOOTSTRAP = process.env.SEED_DEMO_BOOTSTRAP === 'true'
  const RESET_ONLY = process.env.SEED_DEMO_RESET_ONLY === 'true'

  console.log('\n────────────────────────────────────────────────────────')
  console.log(' Levl1 Hire — demo data seeder')
  console.log('────────────────────────────────────────────────────────')

  // ── STEP 1: resolve the demo tenant from demoadmin@levl1.io ONLY ───────────
  let admin = await prisma.hireUser.findFirst({ where: { email: DEMO_ADMIN_EMAIL } })

  if (!admin) {
    if (!BOOTSTRAP) {
      die(`${DEMO_ADMIN_EMAIL} not found. Refusing to create/guess a tenant.\n` +
        `   → Re-run with SEED_DEMO_BOOTSTRAP=true to create a fresh, isolated demo tenant + the two demo users,\n` +
        `     or create the demo accounts yourself and run again.`)
    }
    // Bootstrap: create a NEW isolated tenant (can never be an existing/real one).
    console.log(`\n⚙  ${DEMO_ADMIN_EMAIL} not found → bootstrapping a fresh, isolated demo tenant…`)
    const tenant = await prisma.hireTenant.create({
      data: {
        name: 'Levl1 Demo — Apex Talent Partners',
        type: 'AGENCY',
        trialActive: true,
        trialEndsAt: new Date(now + 21 * DAY),
        trialDomain: 'levl1-demo.internal', // unique, never a real business domain
        users: {
          create: [
            { name: 'Demo Admin', email: DEMO_ADMIN_EMAIL, role: 'ADMIN', passwordHash: '$demo$set-via-reset' },
            { name: 'Demo Recruiter', email: DEMO_MEMBER_EMAIL, role: 'RECRUITER', passwordHash: '$demo$set-via-reset' },
          ],
        },
      },
    })
    console.log(`   ✓ created demo tenant ${tenant.id} with ${DEMO_ADMIN_EMAIL} (ADMIN) + ${DEMO_MEMBER_EMAIL} (RECRUITER)`)
    admin = await prisma.hireUser.findFirst({ where: { email: DEMO_ADMIN_EMAIL } })
  }
  if (!admin) die('Could not resolve demoadmin after bootstrap.')

  // THE demo tenant — every single operation below is scoped to this id.
  const DEMO_TENANT_ID = admin.tenantId

  // Ensure demomember exists IN THE SAME demo tenant (create only within it).
  let member = await prisma.hireUser.findFirst({ where: { email: DEMO_MEMBER_EMAIL, tenantId: DEMO_TENANT_ID } })
  if (!member) {
    member = await prisma.hireUser.create({ data: { tenantId: DEMO_TENANT_ID, name: 'Demo Recruiter', email: DEMO_MEMBER_EMAIL, role: 'RECRUITER', passwordHash: '$demo$set-via-reset' } })
    console.log(`   ✓ created ${DEMO_MEMBER_EMAIL} (RECRUITER) in demo tenant`)
  }

  // ── STEP 2: SAFETY ASSERTIONS (before any write) ───────────────────────────
  const tenant = await prisma.hireTenant.findUnique({ where: { id: DEMO_TENANT_ID }, select: { id: true, name: true } })
  if (!tenant) die('Demo tenant row not found.')
  if (admin.tenantId !== DEMO_TENANT_ID) die('demoadmin tenant mismatch.')
  if (member.tenantId !== DEMO_TENANT_ID) die('demomember is not in the demo tenant.')

  // The clincher: the tenant must contain ONLY @levl1.io demo users. If any real
  // (non-demo) user is present, this is NOT a demo tenant → abort untouched.
  const allUsers = await prisma.hireUser.findMany({ where: { tenantId: DEMO_TENANT_ID }, select: { email: true, role: true } })
  const nonDemo = allUsers.filter((u) => !u.email.endsWith(DEMO_DOMAIN))
  if (nonDemo.length > 0) {
    die(`Resolved tenant ${DEMO_TENANT_ID} ("${tenant.name}") contains non-demo users ` +
      `(${nonDemo.map((u) => u.email).join(', ')}). This does not look like a demo tenant. Refusing to touch it.`)
  }

  console.log(`\n🔒 DEMO_TENANT_ID = ${DEMO_TENANT_ID}  ("${tenant.name}")`)
  console.log(`   Admin:  ${admin.email} (${admin.role}, id ${admin.id})`)
  console.log(`   Member: ${member.email} (${member.role}, id ${member.id})`)
  console.log(`   Users in tenant: ${allUsers.length} — all @levl1.io ✓`)
  console.log(`   Every insert/delete below is scoped to this tenantId ONLY.\n`)

  // ── Put the demo tenant on a paid plan (OFF trial) so no trial banner/limit
  //    shows during demos. Scoped to DEMO_TENANT_ID only. ──────────────────────
  await prisma.hireTenant.update({
    where: { id: DEMO_TENANT_ID },
    data: { plan: 'GROWTH', trialActive: false, subscriptionStatus: 'active', currentPeriodEnd: new Date(now + 365 * DAY), trialEndsAt: null, usageCandidatesThisMonth: 0, usageResetAt: new Date() },
  })
  console.log('💳 Demo tenant set to GROWTH plan (active subscription, OFF trial).')

  // ── STEP 3: WIPE (scoped) — children first, respecting FKs ─────────────────
  // NOTE: every where-clause is scoped to DEMO_TENANT_ID (directly or via a
  // tenant-scoped relation). There is intentionally NO unscoped deleteMany.
  console.log('🧹 Wiping existing demo-tenant content (scoped to DEMO_TENANT_ID)…')
  const wipe = {
    invoiceReminders: (await prisma.hireInvoiceReminder.deleteMany({ where: { tenantId: DEMO_TENANT_ID } })).count,
    invoices: (await prisma.hireInvoice.deleteMany({ where: { tenantId: DEMO_TENANT_ID } })).count,
    contactActivities: (await prisma.hireContactActivity.deleteMany({ where: { contact: { client: { tenantId: DEMO_TENANT_ID } } } })).count,
    contacts: (await prisma.hireContact.deleteMany({ where: { client: { tenantId: DEMO_TENANT_ID } } })).count,
    candidateActivities: (await prisma.hireCandidateActivity.deleteMany({ where: { candidate: { tenantId: DEMO_TENANT_ID } } })).count,
    interviews: (await prisma.hireInterview.deleteMany({ where: { candidate: { tenantId: DEMO_TENANT_ID } } })).count,
    matches: (await prisma.hireMatch.deleteMany({ where: { tenantId: DEMO_TENANT_ID } })).count,
    agentProposals: (await prisma.hireAgentProposal.deleteMany({ where: { tenantId: DEMO_TENANT_ID } })).count,
    auditLogs: (await prisma.hireAuditLog.deleteMany({ where: { tenantId: DEMO_TENANT_ID } })).count,
    candidates: (await prisma.hireCandidate.deleteMany({ where: { tenantId: DEMO_TENANT_ID } })).count,
    deals: (await prisma.hireDeal.deleteMany({ where: { tenantId: DEMO_TENANT_ID } })).count,
    jobs: (await prisma.hireJob.deleteMany({ where: { tenantId: DEMO_TENANT_ID } })).count,
    clients: (await prisma.hireClient.deleteMany({ where: { tenantId: DEMO_TENANT_ID } })).count, // clears recruiter m2m
  }
  console.log('   removed:', JSON.stringify(wipe))

  if (RESET_ONLY) {
    console.log('\n✅ WIPE ONLY — demo tenant emptied of demo content (users preserved). Run `npm run seed:demo` to restore pristine data.')
    await prisma.$disconnect()
    return
  }

  // ── STEP 4: SEED (all scoped to DEMO_TENANT_ID) ────────────────────────────
  console.log('🌱 Seeding demo dataset…')

  // Clients — demomember is assigned to a subset (drives role-gated visibility).
  const CLIENT_DEFS = [
    { name: 'Vertex Fintech', industry: 'Fintech', website: 'vertexfintech.example', member: true },
    { name: 'Helix Health', industry: 'Healthcare', website: 'helixhealth.example', member: true },
    { name: 'Northwind Trading', industry: 'Logistics', website: 'northwind.example', member: false },
    { name: 'Orbit Media', industry: 'Media', website: 'orbitmedia.example', member: false },
    { name: 'Cobalt Robotics', industry: 'Manufacturing', website: 'cobaltrobotics.example', member: false },
  ]
  const clients: { id: string; name: string; member: boolean }[] = []
  for (const c of CLIENT_DEFS) {
    const client = await prisma.hireClient.create({
      data: {
        tenantId: DEMO_TENANT_ID, name: c.name, industry: c.industry, website: c.website,
        createdAt: ago(int(40, 90)),
        ...(c.member ? { recruiters: { connect: { id: member.id } } } : {}), // assign demomember
        contacts: {
          create: [
            { name: `${pick(FIRST)} ${pick(LAST)}`, email: `hr@${c.website}`, role: 'Head of Talent', phone: rand10(), lastContactedAt: ago(int(2, 20)) },
            ...(rnd() > 0.5 ? [{ name: `${pick(FIRST)} ${pick(LAST)}`, email: `vp@${c.website}`, role: 'VP Engineering', phone: rand10() }] : []),
          ],
        },
      },
      include: { contacts: true },
    })
    clients.push({ id: client.id, name: c.name, member: c.member })
    // A couple of contact activities for CRM texture.
    for (const contact of client.contacts.slice(0, 1)) {
      await prisma.hireContactActivity.create({ data: { contactId: contact.id, type: pick(['call', 'email', 'meeting']), note: 'Kickoff on Q3 hiring plan.', userId: c.member ? member.id : admin.id, createdAt: ago(int(3, 25)) } })
    }
  }
  const memberClients = clients.filter((c) => c.member)
  const adminClients = clients.filter((c) => !c.member)

  // Jobs — spread across clients + both owners; varied ages/status incl. filled+stalled.
  const jobs: { id: string; title: string; clientId: string; assigneeId: string; skills: string[]; stages: string[]; status: string; forMember: boolean }[] = []
  for (let i = 0; i < JOB_SPECS.length; i++) {
    const spec = JOB_SPECS[i]
    // First ~4 jobs live on member's clients + owned by member (member visibility).
    const forMember = i < 4
    const client = forMember ? pick(memberClients) : pick(adminClients)
    const owner = forMember ? member : admin
    // Status/age variety: one CLOSED (filled), one PAUSED+old (stalled), rest ACTIVE.
    const status = i === JOB_SPECS.length - 1 ? 'CLOSED' : i === 2 ? 'PAUSED' : 'ACTIVE'
    const createdDaysAgo = i === 2 ? int(70, 95) : i < 3 ? int(45, 70) : int(3, 40) // job #2 is the stalled/ageing one
    const must = spec.skills.slice(0, 3)
    const nice = spec.skills.slice(3)
    const job = await prisma.hireJob.create({
      data: {
        tenantId: DEMO_TENANT_ID, clientId: client.id, assigneeId: owner.id,
        title: spec.title, department: spec.dept, location: spec.loc,
        description: `We're hiring a ${spec.title}. Core stack: ${spec.skills.join(', ')}. Own delivery end-to-end and raise the engineering bar.`,
        salaryMin: spec.salaryMin, salaryMax: spec.salaryMax,
        stages: PIPELINE as unknown as Prisma.InputJsonValue,
        status: status as 'ACTIVE' | 'PAUSED' | 'CLOSED',
        mustHaveSkills: must, niceToHaveSkills: nice,
        screeningCriteria: [`${int(4, 8)}+ years in ${must[0]}`, 'Strong system-design fundamentals', 'Good written communication'],
        interviewFocus: ['System design', must[0], 'Ownership'],
        // Weighted rubric (what AI scoring optimizes for).
        rubric: [
          ...must.map((skill) => ({ skill, weight: 5, required: true, category: 'Technical' })),
          ...nice.map((skill) => ({ skill, weight: 2, required: false, category: 'Tools' })),
          { skill: 'Communication', weight: 3, required: false, category: 'Soft' },
        ] as unknown as Prisma.InputJsonValue,
        aiGenerated: true,
        createdAt: ago(createdDaysAgo),
      },
    })
    jobs.push({ id: job.id, title: spec.title, clientId: client.id, assigneeId: owner.id, skills: spec.skills, stages: [...PIPELINE], status, forMember })
  }

  // Deals — across stages, with real deal math, linked to jobs on the same client.
  const dealClientJobs = (clientId: string) => jobs.filter((j) => j.clientId === clientId)
  let dealCount = 0
  for (let i = 0; i < 6; i++) {
    const stage = DEAL_STAGES[i]
    const client = clients[i % clients.length]
    const linkedJobs = dealClientJobs(client.id).slice(0, 2)
    const positions = int(1, 4)
    const billRate = int(45, 120) // $/hr
    const hoursPerWeek = 40
    const durationValue = pick([3, 6, 9, 12])
    const weeks = durationValue * (52 / 12) // months → weeks
    const value = Math.round(positions * billRate * hoursPerWeek * weeks)
    const isClosed = stage === 'Closed Won' || stage === 'Closed Lost'
    await prisma.hireDeal.create({
      data: {
        tenantId: DEMO_TENANT_ID, clientId: client.id,
        title: `${client.name} — ${positions} role${positions > 1 ? 's' : ''}`,
        value, stage, probability: STAGE_PROBABILITY[stage] ?? 10,
        positions, billRate, hoursPerWeek, durationValue, durationUnit: 'months', margin: int(18, 32),
        closedAt: isClosed ? ago(int(2, 20)) : null,
        notes: `${stage} — ${positions} × $${billRate}/hr × ${hoursPerWeek}h × ${durationValue}mo.`,
        createdAt: ago(int(10, 60)),
        ...(linkedJobs.length ? { jobs: { connect: linkedJobs.map((j) => ({ id: j.id })) } } : {}),
      },
    })
    dealCount++
  }

  // Invoices — across ageing buckets + one overdue with a logged reminder.
  const invClient = clients[0]
  const invConfigs = [
    { label: 'current', sent: ago(10), due: new Date(now + 20 * DAY), amount: 480000, status: 'pending', paid: 0, reminder: false },
    { label: '0-30 overdue', sent: ago(40), due: ago(15), amount: 650000, status: 'pending', paid: 0, reminder: true },
    { label: '31-60 overdue', sent: ago(70), due: ago(45), amount: 320000, status: 'partial', paid: 120000, reminder: true },
    { label: 'paid', sent: ago(35), due: ago(5), amount: 540000, status: 'paid', paid: 540000, reminder: false },
  ]
  let invCount = 0, reminderCount = 0
  for (const cfg of invConfigs) {
    const inv = await prisma.hireInvoice.create({
      data: {
        tenantId: DEMO_TENANT_ID, clientId: invClient.id,
        number: `INV-2026-${String(1000 + invCount)}`,
        amount: cfg.amount, amountPaid: cfg.paid, currency: 'INR',
        sentDate: cfg.sent, dueDate: cfg.due, dueCycleDays: 30, status: cfg.status,
        paidAt: cfg.status === 'paid' ? ago(3) : null,
        reminderIntervalDays: 7, remindersOn: cfg.status !== 'paid',
        lastReminderAt: cfg.reminder ? ago(int(2, 8)) : null,
        createdAt: cfg.sent,
      },
    })
    invCount++
    if (cfg.reminder) {
      const overdue = Math.max(1, Math.floor((now - cfg.due.getTime()) / DAY))
      await prisma.hireInvoiceReminder.create({ data: { invoiceId: inv.id, tenantId: DEMO_TENANT_ID, sentTo: `hr@${invClient.name.toLowerCase().replace(/\s+/g, '')}.example`, daysOverdue: overdue, channel: 'email', sentAt: ago(int(2, 6)) } })
      reminderCount++
    }
  }

  // Candidates + matches + backdated activities. ~90 across all jobs + talent pool.
  const placementStages = new Set(['Hired', 'Offer'])
  let candCount = 0, matchCount = 0, activityCount = 0, interviewCount = 0
  const TARGET = 92

  for (let n = 0; n < TARGET; n++) {
    // ~15% go to the talent pool (no job); the rest attach to a job.
    const toPool = rnd() < 0.15
    const job = toPool ? null : pick(jobs)
    const ownerId = job ? job.assigneeId : (rnd() < 0.4 ? member.id : admin.id)
    const first = pick(FIRST), last = pick(LAST)
    const name = `${first} ${last}`
    const years = int(2, 12)
    const company = pick(COMPANIES)
    const jobSkills = job ? job.skills : pickN(SKILL_POOL, 5)
    // Candidate skills: some overlap with job (matched) + some extra.
    const matched = pickN(jobSkills, int(1, jobSkills.length))
    const extra = pickN(SKILL_POOL.filter((s) => !jobSkills.includes(s)), int(2, 4))
    const skills = [...matched, ...extra]
    const missing = jobSkills.filter((s) => !matched.includes(s))
    const title = job ? job.title.replace(/^Senior |^Engineering Manager — /, '') : pick(['Backend Engineer', 'Full-Stack Engineer', 'SRE'])

    // Stage + status shape. Rejected swimlane gets reasons.
    let stage: string, rejectedReason: string | null = null, rejectedAt: Date | null = null, rejectedBy: string | null = null
    let aiScore: number
    if (toPool) {
      stage = 'Sourced'
      aiScore = int(45, 90)
    } else {
      const roll = rnd()
      if (roll < 0.18) { // rejected
        stage = 'Rejected'; rejectedReason = pick(REJECT_REASONS); rejectedAt = ago(int(1, 30)); rejectedBy = ownerId === member.id ? 'Demo Recruiter' : 'Demo Admin'
        aiScore = int(35, 68)
      } else {
        stage = pick(['Sourced', 'Sourced', 'Screening', 'Screening', 'Interview', 'Technical Round', 'Offer', 'Hired'])
        aiScore = stage === 'Hired' || stage === 'Offer' ? int(80, 96) : int(55, 90)
      }
    }
    const verdict = aiScore >= 85 ? 'strong' : aiScore >= 70 ? 'good' : aiScore >= 55 ? 'partial' : 'weak'
    const rec = aiScore >= 85 ? 'strong_yes' : aiScore >= 70 ? 'yes' : aiScore >= 55 ? 'maybe' : 'no'
    const createdDaysAgo = int(1, 58)

    const cand = await prisma.hireCandidate.create({
      data: {
        tenantId: DEMO_TENANT_ID, jobId: job?.id ?? null, assigneeId: ownerId,
        name, email: email(first, last), phone: rand10(),
        currentTitle: title, currentCompany: company, totalYears: years,
        linkedinUrl: `linkedin.com/in/${first}-${last}`.toLowerCase(),
        resumeText: resumeText(name, title, company, years, skills),
        skills: skills as unknown as Prisma.InputJsonValue,
        topSkills: matched.slice(0, 4) as unknown as Prisma.InputJsonValue,
        currentStage: stage, source: pick(SOURCES),
        aiScore, aiRecommendation: rec,
        aiSummary: `${years}y ${title}. Strong on ${matched.slice(0, 2).join(' & ') || 'core stack'}${missing.length ? `; gaps in ${missing.slice(0, 2).join(', ')}` : ''}.`,
        rejectedReason, rejectedAt, rejectedBy,
        createdAt: ago(createdDaysAgo), updatedAt: ago(Math.max(0, createdDaysAgo - int(0, 3))),
      },
    })
    candCount++

    // AI match row (only when attached to a job).
    if (job) {
      await prisma.hireMatch.create({
        data: {
          tenantId: DEMO_TENANT_ID, jobId: job.id, candidateId: cand.id,
          score: aiScore, verdict,
          reasons: [`Matches ${matched.slice(0, 2).join(', ') || 'core skills'}`, ...(missing.length ? [`Missing ${missing.slice(0, 2).join(', ')}`] : [])] as unknown as Prisma.InputJsonValue,
          matchedSkills: matched, missingSkills: missing,
          createdAt: ago(Math.max(0, createdDaysAgo - 1)),
        },
      })
      matchCount++
    }

    // Backdated activity trail → powers funnel / velocity / leaderboard.
    // "Added via <source>" note (creation activity the leaderboard counts).
    await prisma.hireCandidateActivity.create({ data: { candidateId: cand.id, type: 'note', note: `Candidate added via ${cand.source}`, userId: ownerId, createdAt: ago(createdDaysAgo) } })
    activityCount++
    // Stage moves — walk from Sourced to the current stage, backdated.
    const idx = PIPELINE.indexOf(stage as (typeof PIPELINE)[number])
    if (!toPool && idx > 0 && stage !== 'Rejected') {
      let t = createdDaysAgo
      for (let s = 1; s <= idx; s++) {
        t = Math.max(0, t - int(2, 6))
        await prisma.hireCandidateActivity.create({ data: { candidateId: cand.id, type: 'stage_change', fromStage: PIPELINE[s - 1], toStage: PIPELINE[s], userId: ownerId, note: `Moved to ${PIPELINE[s]}`, createdAt: ago(t) } })
        activityCount++
      }
    }
    if (stage === 'Rejected') {
      await prisma.hireCandidateActivity.create({ data: { candidateId: cand.id, type: 'reject', toStage: 'Rejected', note: rejectedReason ?? undefined, userId: ownerId, createdAt: rejectedAt ?? ago(int(1, 20)) } })
      activityCount++
    }
    // Some interviews scheduled for advanced candidates.
    if (['Interview', 'Technical Round', 'Offer'].includes(stage) && rnd() < 0.6) {
      await prisma.hireInterview.create({ data: { candidateId: cand.id, scheduledAt: new Date(now + int(1, 6) * DAY), durationMins: 45, interviewers: [ownerId === member.id ? 'Demo Recruiter' : 'Demo Admin'] as unknown as Prisma.InputJsonValue, type: 'Technical', status: 'SCHEDULED' } })
      interviewCount++
      await prisma.hireCandidateActivity.create({ data: { candidateId: cand.id, type: 'interview_scheduled', note: 'Technical interview scheduled', userId: ownerId, createdAt: ago(Math.max(0, createdDaysAgo - int(1, 4))) } })
      activityCount++
    }
    // A few outbound emails for texture.
    if (rnd() < 0.25) {
      await prisma.hireCandidateActivity.create({ data: { candidateId: cand.id, type: 'email_sent', note: 'Sent intro / scheduling email', userId: ownerId, createdAt: ago(Math.max(0, createdDaysAgo - int(0, 5))) } })
      activityCount++
    }
  }

  // ── STEP 5: REPORT ─────────────────────────────────────────────────────────
  const counts = {
    tenantId: DEMO_TENANT_ID,
    clients: clients.length,
    memberAssignedClients: memberClients.length,
    contacts: await prisma.hireContact.count({ where: { client: { tenantId: DEMO_TENANT_ID } } }),
    deals: dealCount,
    invoices: invCount,
    invoiceReminders: reminderCount,
    jobs: jobs.length,
    jobsOwnedByMember: jobs.filter((j) => j.assigneeId === member.id).length,
    candidates: candCount,
    candidatesOwnedByMember: await prisma.hireCandidate.count({ where: { tenantId: DEMO_TENANT_ID, assigneeId: member.id } }),
    rejected: await prisma.hireCandidate.count({ where: { tenantId: DEMO_TENANT_ID, currentStage: 'Rejected' } }),
    talentPool: await prisma.hireCandidate.count({ where: { tenantId: DEMO_TENANT_ID, jobId: null } }),
    matches: matchCount,
    interviews: interviewCount,
    activities: activityCount,
  }

  console.log('\n✅ Seed complete. Counts (all under DEMO_TENANT_ID):')
  console.table(counts)

  // Final safety confirmation: nothing outside the demo tenant exists in our writes.
  const otherTenants = await prisma.hireTenant.count({ where: { id: { not: DEMO_TENANT_ID } } })
  console.log(`\n🔒 Confirmed: all writes scoped to DEMO_TENANT_ID=${DEMO_TENANT_ID}.`)
  console.log(`   ${otherTenants} other tenant(s) exist in the DB and were NOT read, modified, or deleted by this script.`)
  console.log(`\n   Demo logins:  ${DEMO_ADMIN_EMAIL} (Admin — sees everything)`)
  console.log(`                 ${DEMO_MEMBER_EMAIL} (Recruiter — sees only assigned clients: ${memberClients.map((c) => c.name).join(', ')})`)
  console.log('')

  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('\n❌ Seed failed:', e instanceof Error ? e.message : e)
  await prisma.$disconnect()
  process.exit(1)
})
