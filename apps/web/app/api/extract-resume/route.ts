import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockExtract(fileName: string) {
  return {
    name: fileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
    email: null,
    phone: null,
    linkedIn: null,
    currentTitle: null,
    currentCompany: null,
    totalYearsExperience: null,
    topSkills: [],
    educationSummary: null,
    extractionConfidence: "low" as const,
    missingFields: ["email", "phone", "currentTitle", "currentCompany"],
  };
}

/** Strip markdown code fences and any stray text before/after the JSON object */
function sanitizeJson(raw: string): string {
  return raw
    .replace(/```json|```/g, "")
    .trim()
    // Grab just the first {...} block in case the model adds commentary
    .replace(/^[^{]*(\{[\s\S]*\})[^}]*$/, "$1")
    .trim();
}

function extractText(message: Anthropic.Message): string {
  return message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("")
    .trim();
}

/** Fallback: ask Claude to extract just name + email from the resume */
async function fallbackExtract(resumeText: string, fileName: string) {
  const msg = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 200,
    system: "Extract only the candidate name and email from the resume text. Return ONLY valid JSON: {\"name\": \"...\", \"email\": \"...\"}. If not found return null for that field.",
    messages: [{ role: "user", content: `Resume:\n${resumeText.substring(0, 2000)}` }],
  });

  try {
    const partial = JSON.parse(sanitizeJson(extractText(msg)));
    return {
      name: partial.name ?? fileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
      email: partial.email ?? null,
      phone: null,
      linkedIn: null,
      currentTitle: null,
      currentCompany: null,
      totalYearsExperience: null,
      topSkills: [],
      educationSummary: null,
      extractionConfidence: "low" as const,
      missingFields: ["phone", "currentTitle", "currentCompany", "topSkills", "educationSummary"],
    };
  } catch {
    return mockExtract(fileName);
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { resumeText, fileName } = await req.json();

    if (!resumeText || resumeText.trim().length < 20) {
      return NextResponse.json({ error: "Resume text is too short or empty" }, { status: 400 });
    }

    // Graceful degradation — no key configured
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn("[extract-resume] No ANTHROPIC_API_KEY — returning mock data");
      return NextResponse.json({ candidate: mockExtract(fileName ?? "resume") });
    }

    const systemPrompt =
      "You are a resume parser. Extract information with high accuracy. " +
      "Never guess or infer — only extract what is explicitly stated. " +
      "If a field is not found, return null. " +
      "Return ONLY valid JSON, no markdown, no explanation, no preamble.";

    const userPrompt =
      `Parse this resume and return JSON with these exact fields: ` +
      `name, email, phone, linkedIn, currentTitle, currentCompany, ` +
      `totalYearsExperience (number only), topSkills (array of strings, max 8), ` +
      `educationSummary (one line), ` +
      `extractionConfidence (high if all key fields found, medium if some missing, low if most missing), ` +
      `missingFields (array of field names that returned null).\n\n` +
      `Resume text:\n${resumeText.substring(0, 6000)}`;

    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 1024,
      temperature: 0.0,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText  = extractText(message);
    const cleaned  = sanitizeJson(rawText);

    let candidate: Record<string, unknown>;
    try {
      candidate = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("[extract-resume] JSON.parse failed, running fallback extraction:", parseErr);
      console.error("[extract-resume] Raw response was:", rawText.substring(0, 500));
      const fallback = await fallbackExtract(resumeText, fileName ?? "resume");
      return NextResponse.json({ candidate: fallback, fallback: true });
    }

    // Normalise totalYearsExperience — sometimes the model returns a string like "10 years"
    if (typeof candidate.totalYearsExperience === "string") {
      const match = (candidate.totalYearsExperience as string).match(/\d+/);
      candidate.totalYearsExperience = match ? parseInt(match[0], 10) : null;
    }

    // Ensure arrays
    if (!Array.isArray(candidate.topSkills))    candidate.topSkills    = [];
    if (!Array.isArray(candidate.missingFields)) candidate.missingFields = [];

    // Derive missingFields if model returned an empty array but fields are null
    const KEY_FIELDS = ["name","email","phone","currentTitle","currentCompany","topSkills"];
    if ((candidate.missingFields as string[]).length === 0) {
      candidate.missingFields = KEY_FIELDS.filter(
        (f) => candidate[f] === null || candidate[f] === undefined ||
               (Array.isArray(candidate[f]) && (candidate[f] as unknown[]).length === 0)
      );
    }

    return NextResponse.json({ candidate });

  } catch (err: unknown) {
    console.error("[extract-resume] Unhandled error:", err);
    const message = err instanceof Error ? err.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
