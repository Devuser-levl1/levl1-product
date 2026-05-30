/**
 * Push / local notification helpers for Levl1.
 *
 * Usage:
 *   const granted = await requestNotificationPermission()
 *   if (granted) sendLocalNotification('Interview complete', 'Score: 91')
 */

/* ── Permission ─────────────────────────────────────────────── */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied')  return false

  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

/* ── Local (in-browser) notifications ───────────────────────── */
export function sendLocalNotification(
  title: string,
  body:  string,
  options: Partial<{
    icon:    string
    tag:     string
    url:     string
    badge:   string
  }> = {},
) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const n = new Notification(title, {
    body,
    icon:  options.icon  ?? '/icons/icon-192.png',
    badge: options.badge ?? '/icons/icon-192.png',
    tag:   options.tag   ?? 'levl1',
  })

  if (options.url) {
    n.onclick = () => {
      window.focus()
      window.location.href = options.url!
      n.close()
    }
  }
}

/* ── SW push payload helper ─────────────────────────────────── */
export interface PushPayload {
  title:    string
  body:     string
  url?:     string
  tag?:     string
  actions?: { action: string; title: string }[]
}

/* ── Event-driven notification triggers ─────────────────────── */

/**
 * Call when an interview finishes.
 * Shows a local notification if the user has granted permission.
 */
export function notifyInterviewComplete(candidateName: string, score: number) {
  sendLocalNotification(
    'Interview Complete',
    `${candidateName} scored ${score}/100 — view the report now.`,
    { tag: 'interview-complete', url: '/dashboard' },
  )
}

/**
 * Call when a candidate accepts an invite and schedules an interview.
 */
export function notifyInterviewScheduled(candidateName: string, positionTitle: string) {
  sendLocalNotification(
    'Interview Scheduled',
    `${candidateName} has accepted the invite for ${positionTitle}.`,
    { tag: 'interview-scheduled', url: '/candidates' },
  )
}

/**
 * Call when a position's approval status changes.
 */
export function notifyApprovalUpdate(positionTitle: string, approverRole: string) {
  sendLocalNotification(
    'Position Approved',
    `${approverRole} approved the questions for "${positionTitle}".`,
    { tag: 'approval-update', url: '/positions' },
  )
}
