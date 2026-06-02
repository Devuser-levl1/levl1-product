import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function clearSeedData() {
  console.log('Clearing seed data...')

  // Delete in reverse dependency order
  await prisma.feedback.deleteMany({})
  await prisma.supportTicket.deleteMany({})
  await prisma.scheduledEmail.deleteMany({})
  await prisma.report.deleteMany({})
  await prisma.interviewVerification.deleteMany({})
  await prisma.interviewToken.deleteMany({})
  await prisma.interview.deleteMany({})
  await prisma.candidate.deleteMany({})
  await prisma.questionSet.deleteMany({})
  await prisma.interviewSlot.deleteMany({})
  await prisma.positionReport.deleteMany({})
  await prisma.position.deleteMany({})
  await prisma.subscription.deleteMany({})
  await prisma.user.deleteMany({})
  await prisma.agency.deleteMany({})

  console.log('All seed data cleared.')
  await prisma.$disconnect()
}

clearSeedData().catch(e => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
