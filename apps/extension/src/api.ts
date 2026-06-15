import { Settings, Job } from './types'

// Thin client for the Levl1 public API (Build 0). All calls are authenticated
// with the tenant API key via the Authorization: Bearer header. Responses use
// the { data, error } envelope.

export class AuthError extends Error {}
export class ApiError extends Error {}

async function call<T>(settings: Settings, path: string, init?: RequestInit): Promise<T> {
  if (!settings.apiKey) throw new AuthError('No API key configured')
  let res: Response
  try {
    res = await fetch(`${settings.baseUrl}/api/v1${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
        ...(init?.headers ?? {}),
      },
    })
  } catch {
    throw new ApiError('Network error — check the base URL and your connection.')
  }
  let body: { data?: T; error?: string } = {}
  try { body = await res.json() } catch { /* non-JSON */ }
  if (res.status === 401) throw new AuthError(body.error ?? 'Invalid or revoked API key')
  if (!res.ok) throw new ApiError(body.error ?? `Request failed (${res.status})`)
  return body.data as T
}

// Lightweight authenticated call used to validate the key on the options page.
export async function validateKey(settings: Settings): Promise<boolean> {
  await call<Job[]>(settings, '/jobs')
  return true
}

export async function listJobs(settings: Settings): Promise<Job[]> {
  const jobs = await call<{ id: string; title: string }[]>(settings, '/jobs')
  return jobs.map((j) => ({ id: j.id, title: j.title }))
}

export async function createCandidate(settings: Settings, input: {
  name: string; email: string; phone?: string; resumeUrl?: string
}): Promise<{ id: string }> {
  return call<{ id: string }>(settings, '/candidates', { method: 'POST', body: JSON.stringify(input) })
}

export async function triggerInterview(settings: Settings, input: {
  candidateId: string; jobId?: string; title?: string; jdText?: string
}): Promise<{ interviewId: string; interviewUrl: string }> {
  return call<{ interviewId: string; interviewUrl: string }>(settings, '/interviews', { method: 'POST', body: JSON.stringify(input) })
}
