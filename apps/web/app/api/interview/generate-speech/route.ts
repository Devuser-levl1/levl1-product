import { NextRequest, NextResponse } from 'next/server'
import { getVoiceId } from '@/lib/voiceOptions'

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId, voiceAccent } = await req.json()

    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      console.error('[generate-speech] ELEVENLABS_API_KEY is not set')
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured on server' },
        { status: 500 }
      )
    }

    // Priority: explicit voiceId in request → voiceAccent key → env var → Rachel fallback
    const vid =
      voiceId ||
      (voiceAccent ? getVoiceId(voiceAccent) : null) ||
      process.env.ELEVENLABS_VOICE_ID ||
      '21m00Tcm4TlvDq8ikWAM' // Rachel — always available

    console.log('[generate-speech] text length:', text?.length ?? 0, 'voice:', vid)

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

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[generate-speech] ElevenLabs error:', response.status, errorText)
      return NextResponse.json(
        { error: `ElevenLabs returned ${response.status}`, detail: errorText },
        { status: response.status }
      )
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
    console.error('[generate-speech] Unexpected error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
