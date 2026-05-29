export interface HelpStep {
  title: string
  body:  string
}

export interface HelpTopic {
  id:    string
  title: string
  steps: HelpStep[]
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    id:    'question-approval',
    title: 'How question approval works',
    steps: [
      { title: 'Step 1 — AI generates questions', body: 'When you create a position, Claude AI generates tailored interview questions based on your JD, tech stack, and experience level requirements.' },
      { title: 'Step 2 — Tech lead reviews', body: 'Your tech lead receives a link to review and approve or edit the technical questions. They can replace individual questions or add custom ones.' },
      { title: 'Step 3 — HR reviews', body: 'HR reviews and approves the behavioral and soft-skill questions. Both approvals are required before any interview can begin.' },
      { title: 'Step 4 — Position activated', body: 'Once both tech lead and HR approve, the position becomes Active. Candidates can now be sent scheduling invites.' },
      { title: 'Step 5 — Consistency guaranteed', body: 'All future candidates for this position use the exact same approved question set. This eliminates interviewer bias and ensures fair comparisons.' },
      { title: 'Why this matters', body: 'Approval-first ensures quality and consistency without requiring a panel every time. One approval round covers every candidate for that role.' },
    ],
  },
  {
    id:    'ai-interviews',
    title: 'How AI interviews work',
    steps: [
      { title: 'Voice-based interview', body: 'The AI interviewer conducts a structured 30-minute voice interview. The candidate speaks naturally through their microphone — no typing required.' },
      { title: 'Fixed question structure', body: '6 technical, 3 scenario, 3 behavioral, and 2 EQ questions — calibrated to the role and experience level from your approved question set.' },
      { title: 'Dynamic follow-up questions', body: 'If a candidate gives a vague or partial answer, the AI automatically generates a contextual follow-up question to probe deeper.' },
      { title: 'Real-time evaluation', body: 'Every response is scored against expected key points in real time. You can monitor the transcript and running score from the Interviews tab.' },
      { title: 'Automatic report', body: 'Within minutes of the interview ending, a full evaluation report is generated — scores, strengths, concerns, and a hiring recommendation.' },
    ],
  },
  {
    id:    'scoring',
    title: 'How candidate scoring works',
    steps: [
      { title: 'Evidence-only scoring', body: "Each response is scored strictly against the expected key points. Claude only credits points the candidate explicitly stated — no inferences or assumptions." },
      { title: 'Section scores', body: 'Scores are calculated per section (Technical, Scenario, Behavioral, EQ) and combined into an overall score out of 100.' },
      { title: 'Recommendation thresholds', body: 'Strong Yes: 85+ | Yes: 70–84 | Maybe: 55–69 | No: below 55. These thresholds reflect top-15%, hireable, borderline, and below-bar candidates.' },
      { title: 'Dynamic questions excluded', body: 'AI-generated follow-up questions do not count toward the preset score. They are shown separately in the report for context.' },
    ],
  },
  {
    id:    'reading-report',
    title: 'How to read the report',
    steps: [
      { title: 'Professional Summary', body: "An AI-written narrative paragraph grounded entirely in what the candidate said during the interview. Read this first for a quick overview." },
      { title: 'Section Scores', body: 'Score breakdown by interview type. Technical and Scenario scores reflect domain expertise. Behavioral and EQ scores reflect leadership and self-awareness.' },
      { title: 'Question Breakdown', body: 'Expand any question to see exactly which key points the candidate covered and which they missed. This is the evidence behind every score.' },
      { title: 'HR Note', body: "Plain-English summary written for non-technical readers. Includes a clear recommendation and any time-sensitive context (e.g., competing offers)." },
      { title: 'L2 Recommendation', body: 'What to probe in a second-round interview. Focused on the specific gaps this candidate showed — so your panel time is well spent.' },
    ],
  },
  {
    id:    'question-regrooming',
    title: 'What is question re-grooming?',
    steps: [
      { title: 'Pattern detection', body: 'After multiple interviews, the system flags questions where candidates consistently score below 4/10. This suggests the question may be too advanced, ambiguous, or reflect a market knowledge gap.' },
      { title: 'Flag review', body: "Flagged questions appear in the Position Report's Question Health section. A tech lead reviews each flag and decides whether to update or replace the question." },
      { title: 'Forward-only impact', body: 'Updated questions apply only to future interviews. Past interviews are never retroactively changed — historical scores remain consistent.' },
      { title: 'Why it matters', body: 'Over time, your question bank improves based on real market data. Questions that consistently trip up strong candidates are refined — not just the candidates replaced.' },
    ],
  },
]

export function getHelpTopic(id: string): HelpTopic | undefined {
  return HELP_TOPICS.find((t) => t.id === id)
}
