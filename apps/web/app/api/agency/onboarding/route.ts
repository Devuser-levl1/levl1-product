import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const body = await req.json()
    const { step, ...data } = body

    // Build update payload based on step
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = { onboardingStep: step }

    if (step === 1) {
      if (data.agencyName)    updateData.name           = data.agencyName
      if (data.website)       updateData.website        = data.website
      if (data.foundedYear)   updateData.foundedYear    = data.foundedYear
      if (data.teamSize)      updateData.teamSize       = data.teamSize
      if (data.primaryService)updateData.primaryService = data.primaryService
      if (data.city)          updateData.city           = data.city
    }

    if (step === 2) {
      if (data.gstNumber)          updateData.gstNumber          = data.gstNumber
      if (data.panNumber)          updateData.panNumber          = data.panNumber
      if (data.legalName)          updateData.legalName          = data.legalName
      if (data.registeredAddress)  updateData.registeredAddress  = data.registeredAddress
      if (data.city)               updateData.city               = data.city
      if (data.state)              updateData.state              = data.state
      if (data.pinCode)            updateData.pinCode            = data.pinCode
    }

    if (step === 4 && data.onboardingComplete) {
      updateData.onboardingComplete = true
    }

    await prisma.agency.update({
      where: { id: session.agencyId },
      data:  updateData,
    })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save'
    console.error('[agency/onboarding] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
