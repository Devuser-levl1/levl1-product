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
    const {
      positionTitle, company, experienceLevel, roleType,
      primaryDomain, mustHaveTech, niceToHaveTech, domainContext,
      workMode, weights, interviewStyle, behavioralFramework,
      interviewDuration, redFlags, approvedJD,
    } = body;

    const isSenior    = ["8–12 years","12–18 years","18+ years"].includes(experienceLevel);
    const isHandsOn   = workMode === "Hands-on (writes code/does the work)";
    const isOversight = workMode === "Oversight (leads, does not execute)";

    // Scale question counts based on role profile
    let techCount = 4, scenCount = 3, behavCount = 3, eqCount = 2, wbCount = 2;
    if (isSenior && isOversight) { techCount = 2; scenCount = 4; behavCount = 4; eqCount = 3; wbCount = 1; }
    else if (isSenior)           { techCount = 3; scenCount = 3; behavCount = 4; eqCount = 2; wbCount = 2; }
    else if (isHandsOn)          { techCount = 5; scenCount = 3; behavCount = 2; eqCount = 1; wbCount = 2; }

    const excludedDomains = getExcludedDomains(primaryDomain ?? "", roleType ?? "");

    const systemPrompt = `You are a world-class technical interviewer with 25+ years of experience hiring across software engineering, IT, product management, and enterprise technology roles.

Your most important rule: NEVER generate questions outside the candidate's domain. An IT Risk & Compliance auditor should NEVER get system architecture or coding questions. A Business Intelligence manager should NEVER get DevOps questions. A Product Manager should NEVER get low-level engineering questions.

Before generating any question ask yourself: Would a real hiring manager for THIS specific role ask this? If not, discard it.

Rules:
- Questions must be 100% relevant to the role type, domain, and seniority level provided
- Technical questions must match the exact tech stack provided — no generic questions
- For IT Risk/Audit/Compliance roles: focus on frameworks (SOX, SOC2, HITRUST, ISO27001), audit methodology, control testing, stakeholder management, regulatory knowledge
- For BI/Data roles: focus on data modeling, pipeline design, BI tools, governance, stakeholder reporting
- For PM roles: focus on product strategy, prioritization, stakeholder alignment, metrics, roadmap decisions
- For Engineering roles: focus on system design, code quality, architecture decisions relevant to their stack
- Behavioral questions must reference realistic scenarios for the specific domain and seniority
- For senior roles (10+ years): focus on leadership, strategy, org design, cross-functional influence — NOT fundamentals
- For junior roles (0-3 years): focus on fundamentals, learning ability, problem solving approach
- Never ask a 15-year veteran to explain basic concepts
- Never ask an IT auditor about Kubernetes

OUTPUT: Return ONLY valid JSON — no markdown, no preamble, no explanation.
expectedKeyPoints must be objective and measurable — never vague.
followUp must target the most common gap in candidate answers.`;

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

Generate exactly this structure (${techCount} technical, ${scenCount} scenario, ${behavCount} behavioral, ${eqCount} EQ, ${wbCount} whiteboard questions):

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
  "whiteboardAssessment": [
    {
      "id": "w1",
      "question": "...",
      "expectedKeyPoints": ["...", "..."],
      "followUp": "...",
      "difficulty": "${isHandsOn ? "advanced" : "intermediate"}",
      "techTag": "${isHandsOn ? "Coding" : "Strategy"}",
      "estimatedMinutes": 6
    }
  ],
  "timeAllocation": {
    "technical": ${Math.round(interviewDuration * 0.35)},
    "scenario": ${Math.round(interviewDuration * 0.25)},
    "behavioral": ${Math.round(interviewDuration * 0.2)},
    "eq": ${Math.round(interviewDuration * 0.1)},
    "whiteboard": ${Math.round(interviewDuration * 0.1)}
  }
}

Output ONLY the JSON object. No other text.`;

    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 4000,
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

    const questions = JSON.parse(jsonText);
    return NextResponse.json({ questions });

  } catch (err: unknown) {
    console.error("generate-questions error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate questions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
