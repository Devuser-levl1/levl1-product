import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    elevenLabsConfigured: !!process.env.ELEVENLABS_API_KEY,
  })
}
