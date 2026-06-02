const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function clearSeedData() {
  console.log('Clearing seed data...')

  const tables = [
    'feedback',
    'supportTicket',
    'scheduledEmail',
    'report',
    'interviewVerification',
    'interviewToken',
    'interview',
    'candidate',
    'questionSet',
    'interviewSlot',
    'positionReport',
    'position',
    'subscription',
    'user',
    'agency',
  ]

  for (const table of tables) {
    try {
      await prisma[table].deleteMany({})
      console.log(`✓ Cleared ${table}`)
    } catch (e) {
      console.log(`⚠ Skipped ${table} — ${e.message}`)
    }
  }

  console.log('Done.')
  await prisma.$disconnect()
}

clearSeedData().catch(e => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
