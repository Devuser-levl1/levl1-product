import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId } = await req.json()

    // ── DEBUG ─────────────────────────────────────────────────────────
    console.log('[generate-speech] called, text length:', text?.length ?? 0)
    console.log('[generate-speech] ELEVENLABS_API_KEY present:', !!process.env.ELEVENLABS_API_KEY)
    console.log('[generate-speech] ELEVENLABS_VOICE_ID:', process.env.ELEVENLABS_VOICE_ID)
    // ─────────────────────────────────────────────────────────────────

    // Server-side API routes must use non-NEXT_PUBLIC_ env vars —
    // NEXT_PUBLIC_ vars are only guaranteed to be inlined in the browser bundle.
    const apiKey = process.env.ELEVENLABS_API_KEY

    if (!apiKey) {
      console.error('[generate-speech] ELEVENLABS_API_KEY is not set in environment')
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured on server' },
        { status: 500 }
      )
    }

    // Prefer voiceId from the request body, then server env var, then a safe default
    const vid =
      voiceId ||
      process.env.ELEVENLABS_VOICE_ID ||
      '21m00Tcm4TlvDq8ikWAM' // ElevenLabs "Rachel" — always available

    console.log('[generate-speech] Using voice ID:', vid)

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${vid}`,
      {
        method: 'POST',
        headers: {
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: text || '',
          model_id: 'eleven_turbo_v2_5',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    )

    console.log('[generate-speech] ElevenLabs response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[generate-speech] ElevenLabs API error:', response.status, errorText)
      return NextResponse.json(
        { error: `ElevenLabs returned ${response.status}`, detail: errorText },
        { status: response.status }
      )
    }

    const audioBuffer = await response.arrayBuffer()
    console.log('[generate-speech] Returning audio buffer, byteLength:', audioBuffer.byteLength)

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.byteLength),
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[generate-speech] Unexpected error:', err)
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    )
  }
}
