// ── Monitoring copy (Fixpack 6 #5) — Screen-scoped ─────────────────────────
// One source for the plain-English explanations shown in tooltips on the
// Monitor buttons and the Control Room summary. Wording matches what the
// system actually does (see lib/screen/control-room/health.ts).

export const MONITORING_HELP = {
  monitor:
    'Opens a live view of this interview in a new tab: the conversation as it happens, the current question, and signals like camera, audio and connection. The candidate can’t see or hear you.',
  liveNow: 'Interviews in progress right now.',
  needAttention:
    'Interviews with a clear problem to look at now, such as the candidate dropping off, no face on camera, a second person in frame, or the microphone not working. Nothing is decided automatically.',
  keepAnEyeOn:
    'Interviews with a minor signal worth watching, such as a lagging connection, the camera off, a long silence, or the candidate switching to typing. These often resolve on their own.',
  humanPresent:
    'Interviews where the camera shows exactly one face and the candidate has spoken recently, a good sign a real person is taking it. This is an automatic check, not a manual review.',
} as const
