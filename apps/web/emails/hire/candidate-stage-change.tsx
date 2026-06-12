export interface CandidateStageChangeProps {
  candidateName: string
  fromStage: string
  toStage: string
}
export function candidateStageChangeEmail({ candidateName, fromStage, toStage }: CandidateStageChangeProps): string {
  return `<!DOCTYPE html><html><body style="font-family:Inter,system-ui,sans-serif;color:#0F172A">
  <p><strong>${candidateName}</strong> moved from <em>${fromStage}</em> to <em>${toStage}</em>.</p>
  </body></html>`
}
