import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Password login has been RETIRED in favour of email + one-time code.
// Kept as a clear, explicit endpoint so any stale client gets a helpful message
// instead of a broken password prompt. Use /api/auth/otp/request then
// /api/auth/otp/verify.
export async function POST() {
  return NextResponse.json(
    { error: 'Password sign-in has been replaced by email login codes. Request a code to continue.', useOtp: true },
    { status: 410 },
  )
}
