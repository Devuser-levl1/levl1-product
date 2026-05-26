import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      positionTitle, company, department, roleType, experienceLevel,
      teamSize, hasBudgetOwnership, hasHiringResponsibility, interviewDuration,
      primaryDomain, mustHaveTech, niceToHaveTech, domainContext, companyStage,
      workMode, isNewRole, redFlags,
      weights, interviewStyle, behavioralFramework,
    } = body;

    const isManager = ["Team Lead","People Manager","Director","VP","Engineering Manager"].includes(roleType);
    const isSenior  = ["8–12 years","12–18 years","18+ years"].includes(experienceLevel);

    const systemPrompt = `You are a senior technical recruiter and talent strategist with 20+ years of experience writing job descriptions for top-tier tech companies. Write clear, compelling, professional job descriptions that attract exactly the right candidates.

Guidelines:
- Vary tone and depth significantly based on seniority (a 2yr IC JD vs a 15yr VP JD should read completely differently)
- Vary leadership content based on role type
- For hands-on roles: emphasize technical depth, code ownership, architecture decisions
- For oversight/management roles: emphasize team building, strategy, cross-functional influence, org design
- Use markdown headers (## Section Name)
- Be specific — avoid generic buzzwords
- Output ONLY the JD text, no preamble`;

    const userPrompt = `Write a professional job description for the following role:

**Position:** ${positionTitle}
**Company:** ${company}
**Department:** ${department}
**Role Type:** ${roleType}
**Experience Required:** ${experienceLevel}
${isManager ? `**Team Size:** ${teamSize}` : ""}
**Budget Ownership:** ${hasBudgetOwnership ? "Yes" : "No"}
**Hiring Responsibility:** ${hasHiringResponsibility ? "Yes" : "No"}
**Interview Duration:** ${interviewDuration} minutes

**Technical Context:**
- Primary Domain: ${primaryDomain}
- Must-Have Technologies: ${mustHaveTech?.join(", ") || "Not specified"}
- Nice-to-Have Technologies: ${niceToHaveTech?.join(", ") || "Not specified"}
- Industry Context: ${domainContext}
- Company Stage: ${companyStage}
- Work Mode: ${workMode}
- Role Type: ${isNewRole ? "New headcount" : "Backfill"}
${redFlags ? `- Key probing areas: ${redFlags}` : ""}

**Soft Skill Priorities:**
- Technical Depth: ${weights?.technical ?? 70}/100
- Leadership: ${weights?.leadership ?? 50}/100
- Communication: ${weights?.communication ?? 60}/100
- Problem Solving: ${weights?.problemSolving ?? 65}/100
- Culture Fit: ${weights?.cultureFit ?? 55}/100

**Interview Style:** ${interviewStyle}
**Behavioral Framework:** ${behavioralFramework}

Include these sections:
## About the Role
## What You'll Do (Key Responsibilities)
## Technical Requirements
${isManager ? "## Leadership & Management Requirements" : ""}
## Nice to Have
## What Success Looks Like (First 90 Days)
${isSenior ? "## Why Join Us" : ""}

Make it compelling, specific, and appropriately senior for a ${experienceLevel} ${roleType} in the ${domainContext} space.`;

    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 2000,
      thinking: { type: "adaptive" },
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const jdText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    const wordCount = jdText.split(/\s+/).filter(Boolean).length;

    return NextResponse.json({ jd: jdText, wordCount, inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens });
  } catch (err: unknown) {
    console.error("generate-jd error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate JD";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
