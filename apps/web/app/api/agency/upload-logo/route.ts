import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const MAX_BYTES = 512 * 1024 // 512KB — keep base64 payloads reasonable

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const form = await req.formData()
    const file = form.get('logo')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No logo file provided' }, { status: 400 })
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Logo must be under 512KB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const logoUrl = `data:${file.type};base64,${buffer.toString('base64')}`

    await prisma.agency.update({
      where: { id: session.agencyId },
      data: { logoUrl },
    })

    return NextResponse.json({ logoUrl })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to upload logo'
    console.error('[upload-logo] error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
