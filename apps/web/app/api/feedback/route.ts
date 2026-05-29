import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { rating, comment, page, userId } = await req.json()
    if (!rating || !page) {
      return NextResponse.json({ error: 'rating and page are required' }, { status: 400 })
    }
    const feedback = await prisma.feedback.create({
      data: { rating: Number(rating), comment: comment || null, page, userId: userId || null },
    })
    return NextResponse.json({ id: feedback.id }, { status: 201 })
  } catch (err) {
    console.error('feedback POST error:', err)
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
  }
}
