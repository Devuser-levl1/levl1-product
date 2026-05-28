import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    elevenLabsConfigured: !!(
      process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY ||
      process.env.ELEVENLABS_API_KEY
    ),
  })
}
