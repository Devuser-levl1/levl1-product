import { NextResponse } from 'next/server'

export async function GET() {
  // Server-side routes read non-NEXT_PUBLIC_ vars reliably.
  // Keep NEXT_PUBLIC_ as a secondary fallback for flexibility.
  return NextResponse.json({
    elevenLabsConfigured: !!(
      process.env.ELEVENLABS_API_KEY ||
      process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
    ),
  })
}
