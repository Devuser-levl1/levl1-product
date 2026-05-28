import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId } = await req.json()

    // NEXT_PUBLIC_ prefix makes this available client-side too,
    // but server-side reads it the same way — key is never sent to the browser.
    const apiKey =
      process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY ||
      process.env.ELEVENLABS_API_KEY

    if (!apiKey) {
      // Signal the client to use browser TTS fallback
      return NextResponse.json({ fallback: true }, { status: 200 })
    }

    // Prefer voiceId from the request body, then env vars, then a safe default
    const vid =
      voiceId ||
      process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID ||
      process.env.ELEVENLABS_VOICE_ID ||
      '21m00Tcm4TlvDq8ikWAM' // ElevenLabs "Rachel" — always available

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
          model_id: 'eleven_monolingual_v1',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('ElevenLabs error:', response.status, errorText)
      return NextResponse.json({ fallback: true }, { status: 200 })
    }

    const audioBuffer = await response.arrayBuffer()
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(audioBuffer.byteLength),
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('generate-speech error:', err)
    return NextResponse.json({ fallback: true }, { status: 200 })
  }
}
