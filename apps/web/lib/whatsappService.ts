/**
 * WhatsApp messaging via Twilio.
 *
 * The Twilio client is created lazily so that importing this module never
 * throws when credentials are absent (e.g. local dev / preview). Every send
 * is best-effort and swallows errors — a WhatsApp failure must never block
 * the email invite or the scheduling flow.
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_WHATSAPP_NUMBER  (e.g. "whatsapp:+14155238886" — Twilio sandbox)
 */
import twilio from 'twilio'

type TwilioClient = ReturnType<typeof twilio>

let cachedClient: TwilioClient | null = null

function getClient(): TwilioClient | null {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!sid || !token) {
    console.warn('[whatsapp] Twilio credentials not configured — skipping WhatsApp send')
    return null
  }
  if (!cachedClient) cachedClient = twilio(sid, token)
  return cachedClient
}

const FROM = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'

/** Normalise an Indian phone number to Twilio's `whatsapp:+<E164>` format. */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  const withCountry = cleaned.startsWith('91') ? cleaned : `91${cleaned}`
  return `whatsapp:+${withCountry}`
}

async function send(to: string, body: string, kind: string) {
  const client = getClient()
  if (!client) return
  try {
    await client.messages.create({ from: FROM, to: formatPhone(to), body })
    console.log(`[whatsapp] ${kind} sent to:`, to)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`[whatsapp] ${kind} failed:`, msg)
    // Swallow — non-blocking by design.
  }
}

export async function sendWhatsAppInvite({
  candidateName,
  candidatePhone,
  positionTitle,
  company,
  agencyName,
  availableSlots,
  schedulingUrl,
}: {
  candidateName: string
  candidatePhone: string
  positionTitle: string
  company: string
  agencyName: string
  availableSlots: { label: string; value: string }[]
  schedulingUrl: string
}) {
  if (!candidatePhone) {
    console.warn('[whatsapp] No phone number for candidate, skipping WhatsApp invite')
    return
  }

  const slotsList = availableSlots
    .slice(0, 5)
    .map((slot, i) => `${i + 1}. ${slot.label}`)
    .join('\n')

  const message = `Hi ${candidateName}! 👋

You've been invited to interview for *${positionTitle}* at *${company}* by ${agencyName}.

Please choose your preferred interview slot by replying with the number:

${slotsList}

Or pick a different time here: ${schedulingUrl}

The interview is 30 minutes via AI voice. You'll receive a join link once confirmed.`

  await send(candidatePhone, message, 'Invite')
}

export async function sendWhatsAppConfirmation({
  candidateName,
  candidatePhone,
  positionTitle,
  scheduledAt,
  interviewUrl,
}: {
  candidateName: string
  candidatePhone: string
  positionTitle: string
  scheduledAt: Date
  interviewUrl: string
}) {
  if (!candidatePhone) return

  const dateStr = scheduledAt.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata',
  })
  const timeStr = scheduledAt.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
  })

  const message = `✅ *Interview Confirmed!*

Hi ${candidateName}, your interview for *${positionTitle}* is confirmed.

📅 *Date:* ${dateStr}
🕐 *Time:* ${timeStr} IST
⏱ *Duration:* 30 minutes

Join here when it's time:
${interviewUrl}

Good luck! 🎯`

  await send(candidatePhone, message, 'Confirmation')
}

export async function sendWhatsAppReminder({
  candidateName,
  candidatePhone,
  positionTitle,
  scheduledAt,
  interviewUrl,
  label,
}: {
  candidateName: string
  candidatePhone: string
  positionTitle: string
  scheduledAt: Date
  interviewUrl: string
  label: string // '24 hours' or '15 minutes'
}) {
  if (!candidatePhone) return

  const timeStr = scheduledAt.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
  })

  const emoji = label.includes('15') ? '⏰' : '📅'

  const message = `${emoji} *Interview Reminder*

Hi ${candidateName}! Your interview for *${positionTitle}* is in *${label}* at ${timeStr} IST.

Join here:
${interviewUrl}

Find a quiet place and make sure your mic is working. Good luck! 🎯`

  await send(candidatePhone, message, 'Reminder')
}
