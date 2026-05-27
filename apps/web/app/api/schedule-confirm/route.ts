import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { candidateId, candidateName, positionTitle, scheduledAt, duration } = await req.json();

    if (!candidateId || !scheduledAt) {
      return NextResponse.json({ error: "candidateId and scheduledAt are required" }, { status: 400 });
    }

    const dt = new Date(scheduledAt);
    const dateStr = dt.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const timeStr = dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

    const confirmationEmail = `Subject: Interview Confirmed — ${dateStr} at ${timeStr}

Hi ${candidateName},

Your interview for ${positionTitle} is confirmed.

Date: ${dateStr}
Time: ${timeStr} IST
Duration: ${duration} minutes
Format: AI Voice Interview

A calendar invite has been sent to your email.

Tips for your interview:
- Join from a quiet, well-lit space
- Test your microphone beforehand
- Be ready 2 minutes before your scheduled time

Best of luck!
Levl1 Platform`;

    console.log(`[schedule-confirm] Interview confirmed for candidate ${candidateId}:`, { scheduledAt, duration });

    return NextResponse.json({
      success: true,
      confirmationEmail,
      calendarInvite: {
        title: `Interview — ${positionTitle}`,
        start: scheduledAt,
        duration,
      },
    });
  } catch (err: unknown) {
    console.error("schedule-confirm error:", err);
    const message = err instanceof Error ? err.message : "Failed to confirm schedule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
