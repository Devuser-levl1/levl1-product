// ── Captured-data policy (Screen-scoped) ───────────────────────────────────
// ONE place for the retention periods and the notice version, so the
// candidate-facing notice can never drift from what the purge actually does.
// Safe to import from client components (no server-only imports).
//
//   SCREEN_MEDIA_RETENTION_DAYS       photo + audio recording   (default 90;
//                                     falls back to RECORDING_RETENTION_DAYS)
//   SCREEN_TRANSCRIPT_RETENTION_DAYS  transcript, per-question responses,
//                                     second-voice snippets      (default 365)
// Both are counted from the end of the interview. The evaluation report
// (scores + short quoted highlights) stays with the candidate record until
// the hiring organisation deletes the candidate.

const days = (v: string | undefined, d: number, min: number) => {
  const n = Math.floor(Number(v))
  return Number.isFinite(n) && n >= min ? n : d
}

export interface CapturePolicy {
  mediaRetentionDays: number
  transcriptRetentionDays: number
  noticeVersion: string
}

/** Server-side read of the policy (env). Pass the result to client components as props. */
export function readCapturePolicy(): CapturePolicy {
  const mediaRetentionDays = days(process.env.SCREEN_MEDIA_RETENTION_DAYS ?? process.env.RECORDING_RETENTION_DAYS, 90, 1)
  // A transcript must outlive the media it was made from never — keep ≥ media.
  const transcriptRetentionDays = Math.max(mediaRetentionDays, days(process.env.SCREEN_TRANSCRIPT_RETENTION_DAYS, 365, 1))
  return { mediaRetentionDays, transcriptRetentionDays, noticeVersion: CAPTURE_NOTICE_VERSION }
}

/** Bump when the notice wording/meaning changes — the version is logged with each consent. */
export const CAPTURE_NOTICE_VERSION = '2026-11-04.1'

export type ConsentKind = 'interview' | 'media' | 'withdrawn'
