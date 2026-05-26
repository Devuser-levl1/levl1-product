import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    const apiKey = process.env.ELEVENLABS_API_KEY
    const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM' // Rachel

    if (!apiKey) {
      // Signal the client to use browser TTS fallback
      return NextResponse.json({ fallback: true }, { status: 200 })
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: text || '',
          model_id: 'eleven_monolingual_v1',
          voice_settings: { stability: 0.55, similarity_boost: 0.75 },
        }),
      }
    )

    if (!response.ok) {
      console.error('ElevenLabs error:', response.status, await response.text())
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
