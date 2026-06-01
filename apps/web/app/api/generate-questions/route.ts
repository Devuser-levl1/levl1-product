import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/* ── Derive which topic areas to explicitly exclude based on domain ── */
function getExcludedDomains(domain: string, roleType: string): string {
  const d = (domain + " " + roleType).toLowerCase();
  if (/risk|audit|compliance|grc|sox|soc|iso|hitrust|regulatory/.test(d)) {
    return "system architecture, application coding, software development, DevOps, CI/CD, Kubernetes, Docker, frontend engineering, backend engineering, mobile development";
  }
  if (/product manager|product management|pm\b|product owner/.test(d)) {
    return "low-level coding, infrastructure management, DevOps, networking, database administration, system administration";
  }
  if (/business intelligence|bi\b|analytics|reporting|data analyst/.test(d)) {
    return "application development, mobile development, security architecture, DevOps, frontend engineering, microservices";
  }
  if (/marketing|sales|crm|demand gen/.test(d)) {
    return "coding, system design, infrastructure, DevOps, database administration, network engineering";
  }
  if (/it support|helpdesk|service desk|desktop support/.test(d)) {
    return "software architecture, machine learning, data science, product strategy, business intelligence";
  }
  return "topics that are unrelated to the candidate's stated domain, tech stack, and role type";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[generate-questions] Called with body keys:', Object.keys(body))
    console.log('[generate-questions] ANTHROPIC_API_KEY present:', !!process.env.ANTHROPIC_API_KEY)

    const {
      positionTitle, company, experienceLevel, roleType,
      primaryDomain, mustHaveTech, niceToHaveTech, domainContext,
      workMode, weights, interviewStyle, behavioralFramework,
      interviewDuration, redFlags, approvedJD,
    } = body;

    const isSenior    = ["8–12 years","12–18 years","18+ years"].includes(experienceLevel);
    const isHandsOn   = workMode === "Hands-on (writes code/does the work)";
    const isOversight = workMode === "Oversight (leads, does not execute)";

    // Fixed 30-minute structure — 6 technical, 3 scenario, 3 behavioral, 2 EQ, 0 whiteboard (live only)
    const techCount = 6, scenCount = 3, behavCount = 3, eqCount = 2, wbCount = 0;

    const excludedDomains = getExcludedDomains(primaryDomain ?? "", roleType ?? "");

    const systemPrompt = `You are a world-class technical interviewer with 25+ years of experience hiring across software engineering, IT, product management, and enterprise technology roles.

INTERVIEW STRUCTURE — 30 MINUTES TOTAL:
- Technical questions (core skills + project execution): 6 questions (~12 mins)
- Scenario questions (workplace situations): 3 questions (~6 mins)
- Behavioral questions (STAR framework): 3 questions (~6 mins)
- EQ and soft skills questions: 2 questions (~4 mins)
- Total pre-set questions: 14

TECHNICAL QUESTIONS must cover:
- Core technical concepts specific to the EXACT tech stack provided
- Project execution: how they built, deployed, maintained real systems
- Problem solving: debugging, optimization, architecture decisions
- Senior roles (8+ years): architecture decisions, trade-offs, strategy — NO fundamentals
- Junior roles (0-5 years): fundamentals, learning approach, code quality
- DOMAIN GUARD: Never ask a BI manager about Kubernetes. Never ask an IT auditor about coding.

SCENARIO QUESTIONS must be:
- Realistic workplace situations for their specific role and domain
- Open-ended with no single right answer
- Test: judgment, prioritization, stakeholder management, crisis handling
- Example for IT Risk: "The external auditor flags a critical SOX deficiency on day 3 of fieldwork. Your CISO is traveling and the control owner is on leave. Walk me through the next 24 hours."

BEHAVIORAL QUESTIONS must follow STAR framework:
- Past behavior as predictor of future behavior
- Senior roles: leadership, influence, org-level decisions
- Cover: conflict resolution, failure and recovery, cross-functional collaboration, delivering under pressure

EQ AND SOFT SKILL QUESTIONS — critical differentiators:
- Self-awareness: "How do you typically respond when you receive critical feedback from someone junior to you?"
- Resilience: "Tell me about a time you made a significant mistake at work — what happened and what did you do?"
- Influence without authority: "Tell me about a time you had to get buy-in from someone who had no obligation to help you"
- Emotional regulation: "Describe a time when a project you cared about was cancelled — how did you process that?"
- Adaptability: "How do you manage your energy and focus when working on something that has lost momentum?"

DOMAIN GUARD — STRICTLY ENFORCE:
- IT Risk/Audit/Compliance → NO system architecture, NO coding, NO DevOps, NO Kubernetes
- Business Intelligence/Analytics → NO application development, NO mobile dev, NO security architecture
- Product Management → NO low-level engineering, NO infrastructure, NO DevOps
- Each question must pass: "Would a real hiring manager for THIS EXACT role ask this?"

QUALITY STANDARDS:
- Every question: 3-5 specific, measurable expectedKeyPoints
- followUp: address the most common gap in candidate answers
- estimatedMinutes: technical 2-4 mins, behavioral/scenario 3-5 mins, EQ 2-3 mins
- difficulty: calibrated to experience level
- 12+ year roles: NO fundamentals — only leadership, strategy, architecture
- 0-3 year roles: NO org design — only fundamentals and problem solving

OUTPUT: ONLY valid JSON, no markdown, no explanation.`;

    const userPrompt = `Generate interview questions for this role:

Position: ${positionTitle} at ${company}
Experience: ${experienceLevel} | Role Type: ${roleType} | Work Mode: ${workMode}
Role domain: ${primaryDomain}
Industry context: ${domainContext}
Tech Stack (MUST be covered): ${mustHaveTech?.join(", ")}
Nice-to-have tech: ${niceToHaveTech?.join(", ")}
Interview Duration: ${interviewDuration} mins
Soft Skill Weights: Technical ${weights?.technical}/100, Leadership ${weights?.leadership}/100, Communication ${weights?.communication}/100, Problem Solving ${weights?.problemSolving}/100
Interview Style: ${interviewStyle} | Behavioral Framework: ${behavioralFramework}
${redFlags ? `Red flags / gaps to probe: ${redFlags}` : ""}

IMPORTANT: Only generate questions directly relevant to the ${primaryDomain} domain.
DO NOT generate questions about: ${excludedDomains}

Seniority guidance: ${isSenior && isOversight
  ? "This is a senior leadership role. Focus entirely on strategy, org design, cross-functional influence, executive stakeholder management, and leading teams — NO fundamental technical questions."
  : isSenior
  ? "Senior IC role. Focus on architectural decisions, trade-off reasoning, mentoring others, and owning complex systems — skip basic concept questions."
  : isHandsOn
  ? "Hands-on role. Include specific technical depth questions relevant to the stated tech stack — practical implementation, debugging, performance."
  : "Balance domain knowledge with leadership and communication for this mid-level role."}

Approved JD (for context):
${approvedJD ? approvedJD.substring(0, 2000) : "Not provided"}

Generate exactly this structure (${techCount} technical, ${scenCount} scenario, ${behavCount} behavioral, ${eqCount} EQ, ${wbCount} whiteboard questions). The whiteboardAssessment array MUST be empty — whiteboard is conducted live during the interview, not pre-set.

{
  "technicalQuestions": [
    {
      "id": "t1",
      "question": "...",
      "expectedKeyPoints": ["...", "..."],
      "followUp": "...",
      "difficulty": "intermediate",
      "techTag": "${mustHaveTech?.[0] ?? primaryDomain}",
      "estimatedMinutes": 4
    }
  ],
  "scenarioQuestions": [
    {
      "id": "s1",
      "question": "...",
      "expectedKeyPoints": ["...", "..."],
      "followUp": "...",
      "difficulty": "advanced",
      "techTag": "${primaryDomain}",
      "estimatedMinutes": 5
    }
  ],
  "behavioralQuestions": [
    {
      "id": "b1",
      "question": "...",
      "expectedKeyPoints": ["...", "..."],
      "followUp": "...",
      "difficulty": "intermediate",
      "techTag": "Leadership",
      "estimatedMinutes": 4
    }
  ],
  "eqQuestions": [
    {
      "id": "eq1",
      "question": "...",
      "expectedKeyPoints": ["...", "..."],
      "followUp": "...",
      "difficulty": "intermediate",
      "techTag": "EQ",
      "estimatedMinutes": 3
    }
  ],
  "whiteboardAssessment": [],
  "timeAllocation": {
    "technical": 12,
    "scenario": 6,
    "behavioral": 6,
    "eq": 4,
    "whiteboard": 0
  }
}

Output ONLY the JSON object. No other text.`;

    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 8000,   // 14-question JSON ~3k tokens; thinking blocks need extra headroom
      thinking: { type: "adaptive" },
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();

    // Strip any accidental markdown code fences
    const jsonText = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let questions
    try {
      questions = JSON.parse(jsonText)
    } catch (parseError: unknown) {
      const msg = parseError instanceof Error ? parseError.message : String(parseError)
      console.error('[generate-questions] JSON parse failed:', msg)
      console.error('[generate-questions] Raw output (first 500 chars):', rawText.slice(0, 500))
      return NextResponse.json(
        { error: 'Question generation failed — invalid response format' },
        { status: 500 }
      )
    }

    return NextResponse.json({ questions });

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    console.error('[generate-questions] Error:', err.message)
    console.error('[generate-questions] Stack:', err.stack)
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
