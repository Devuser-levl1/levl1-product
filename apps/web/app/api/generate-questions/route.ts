import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
    const isManager   = ["Team Lead","People Manager","Director","VP","Engineering Manager"].includes(roleType);
    const isHandsOn   = workMode === "Hands-on (writes code/does the work)";
    const isOversight = workMode === "Oversight (leads, does not execute)";

    // Scale question counts
    let techCount = 4, scenCount = 3, behavCount = 3, eqCount = 2, wbCount = 2;
    if (isSenior && isOversight) { techCount = 2; scenCount = 4; behavCount = 4; eqCount = 3; wbCount = 1; }
    else if (isSenior) { techCount = 3; scenCount = 3; behavCount = 4; eqCount = 2; wbCount = 2; }
    else if (isHandsOn) { techCount = 5; scenCount = 3; behavCount = 2; eqCount = 1; wbCount = 2; }

    const systemPrompt = `You are a senior technical interviewer with 20+ years of experience designing interview frameworks for elite technology companies.

CRITICAL RULES:
1. Output ONLY valid JSON — no markdown, no preamble, no explanation
2. expectedKeyPoints must be objective and measurable — never vague
3. followUp must target the most common gap in candidate answers
4. Scale depth based on seniority and work mode
5. For ${isSenior ? "senior" : "junior"} ${isManager ? "management" : "IC"} roles with ${workMode} mode: ${isSenior && isOversight ? "focus on org design, cross-functional influence, strategic thinking, team building — minimal code questions" : isHandsOn ? "include system design, code architecture, technical trade-offs" : "balance technical with leadership and influence"}`;

    const userPrompt = `Generate interview questions for this role:

Position: ${positionTitle} at ${company}
Experience: ${experienceLevel} | Role Type: ${roleType} | Work Mode: ${workMode}
Domain: ${primaryDomain} | Industry: ${domainContext}
Tech Stack: ${mustHaveTech?.join(", ")} | Nice-to-have: ${niceToHaveTech?.join(", ")}
Interview Duration: ${interviewDuration} mins
Soft Skill Weights: Technical ${weights?.technical}/100, Leadership ${weights?.leadership}/100, Communication ${weights?.communication}/100, Problem Solving ${weights?.problemSolving}/100
Interview Style: ${interviewStyle} | Behavioral Framework: ${behavioralFramework}
${redFlags ? `Red flags / gaps to probe: ${redFlags}` : ""}

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
      "techTag": "System Design",
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
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const questions = JSON.parse(jsonText);

    return NextResponse.json({ questions });
  } catch (err: unknown) {
    console.error("generate-questions error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate questions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
