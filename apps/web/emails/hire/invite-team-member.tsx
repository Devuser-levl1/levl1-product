export interface InviteTeamMemberProps {
  inviterName: string
  tenantName: string
  inviteUrl: string
}
export function inviteTeamMemberEmail({ inviterName, tenantName, inviteUrl }: InviteTeamMemberProps): string {
  return `<!DOCTYPE html><html><body style="font-family:Inter,system-ui,sans-serif;color:#0F172A">
  <p>${inviterName} has invited you to join <strong>${tenantName}</strong> on Levl1 Hire.</p>
  <p><a href="${inviteUrl}" style="background:#4F46E5;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Accept invite</a></p>
  </body></html>`
}
