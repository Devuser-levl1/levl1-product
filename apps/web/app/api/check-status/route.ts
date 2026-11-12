import { NextResponse } from 'next/server'

export async function GET() {
  // The ElevenLabs key lives ONLY in ELEVENLABS_API_KEY (server-side). A
  // NEXT_PUBLIC_ copy of the secret must never exist.
  return NextResponse.json({ elevenLabsConfigured: !!process.env.ELEVENLABS_API_KEY })
}
