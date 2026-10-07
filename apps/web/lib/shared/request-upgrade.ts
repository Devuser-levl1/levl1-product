// Self-serve checkout is switched off (Cashfree removed). Upgrades are handled
// by the team and invoiced directly, so "Upgrade" opens an email to us with the
// product and plan pre-filled.
// TODO(abhijit): replace with the enterprise billing flow once it's decided.
export const UPGRADE_EMAIL = 'hello@levl1.io'

export function requestUpgrade(product: 'Screen' | 'HirePilot', planName: string) {
  const subject = encodeURIComponent(`Upgrade request: ${product} — ${planName}`)
  const body = encodeURIComponent(`Hi Levl1 team,\n\nWe'd like to move to the ${planName} plan.\n\nThanks`)
  window.location.href = `mailto:${UPGRADE_EMAIL}?subject=${subject}&body=${body}`
}
