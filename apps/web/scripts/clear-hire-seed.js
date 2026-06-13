/* Wipe ALL Levl1 Hire demo data before a pilot. Does NOT touch Interviews data. */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('[clear-hire-seed] deleting Hire data…')
  // Children first to respect FKs.
  await prisma.hireCampaignRecipient.deleteMany({})
  await prisma.hireCampaign.deleteMany({})
  await prisma.hireContactActivity.deleteMany({})
  await prisma.hireContact.deleteMany({})
  await prisma.hireDeal.deleteMany({})
  await prisma.hireInterview.deleteMany({})
  await prisma.hireInterviewLink.deleteMany({})
  await prisma.hireCandidateActivity.deleteMany({})
  await prisma.hireCandidate.deleteMany({})
  await prisma.hireJobPositionMap.deleteMany({})
  await prisma.hireJob.deleteMany({})
  await prisma.hireClient.deleteMany({})
  await prisma.hireBillingEvent.deleteMany({})
  await prisma.hireUser.deleteMany({})
  await prisma.hireTenant.deleteMany({})
  console.log('[clear-hire-seed] done.')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
