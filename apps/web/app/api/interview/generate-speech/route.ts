import { NextRequest, NextResponse } from 'next/server'
import { getVoiceId } from '@/lib/voiceOptions'
import { DEFAULT_INTERVIEWER_VOICE_ID } from '@/lib/screen/interviewer'
import { isVoiceKey } from '@/lib/screen/interviewer-voice'
import { speakableTech } from '@/lib/screen/tech-terms'

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

    // Priority: account/position voice key (resolved by the caller from the
    // interview) → explicit voiceId → env ELEVENLABS_VOICE_ID (the fallback
    // default) → baked Ananya voice. Unknown keys are ignored, not guessed.
    const vid =
      (isVoiceKey(voiceAccent) ? getVoiceId(voiceAccent) : null) ||
      (typeof voiceId === 'string' && /^[A-Za-z0-9]{10,40}$/.test(voiceId) ? voiceId : null) ||
      process.env.ELEVENLABS_VOICE_ID ||
      DEFAULT_INTERVIEWER_VOICE_ID

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
          // Fixpack 8 #5 — say tech terms correctly (C# → "C sharp", .NET → "dot net").
          text: speakableTech(typeof text === 'string' ? text : ''),
          model_id: 'eleven_turbo_v2_5',
          language_code: 'en', // Fix 4: force English, prevents gibberish
          voice_settings: {
            stability:        0.65, // higher = more consistent, less random
            similarity_boost: 0.85,
            style:            0.0,  // no style exaggeration
            use_speaker_boost: true,
          },
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
