import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const {
      candidateName,
      candidateEmail,
      positionTitle,
      company,
      duration,
      agencyName = "Levl1 Agency",
    } = await req.json();

    if (!candidateEmail) {
      return NextResponse.json({ error: "Candidate email is required" }, { status: 400 });
    }

    // Generate a mock scheduling link
    const slug = candidateName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const schedulingLink = `https://cal.com/levl1/${slug}-${Date.now().toString(36)}`;

    const emailPreview = `Subject: Interview Invitation — ${positionTitle} at ${company}

Hi ${candidateName},

You have been shortlisted for the ${positionTitle} role at ${company}.

Your interview will be conducted by an AI interviewer and will take approximately ${duration} minutes. The interview covers technical questions, scenario-based questions, and a brief behavioral assessment.

Please select a convenient time slot using the link below:
${schedulingLink}

What to expect:
- The interview is voice-based — ensure you're in a quiet environment
- Have your laptop/desktop ready (you may be asked to use a code editor)
- The AI interviewer will introduce itself and guide you through

If you have any questions, reply to this email.

Best regards,
${agencyName}
Levl1 Platform`;

    // In production, you would send a real email here (e.g., via Resend)
    console.log(`[send-invite] Simulated email to ${candidateEmail}:\n`, emailPreview);

    return NextResponse.json({
      success: true,
      emailPreview,
      schedulingLink,
      sentAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error("send-invite error:", err);
    const message = err instanceof Error ? err.message : "Failed to send invite";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
