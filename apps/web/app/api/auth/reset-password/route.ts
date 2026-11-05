import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Screen password reset has been RETIRED with password sign-in: accounts sign in
// with an email one-time code (/api/auth/otp/request → /api/auth/otp/verify).
// (Hire's password flow lives at /api/hire/auth/* and is unaffected.)
export async function POST() {
  return NextResponse.json(
    { error: 'Screen uses email login codes — there is no password to reset. Request a code to sign in.', useOtp: true },
    { status: 410 },
  )
}
