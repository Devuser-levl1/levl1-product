import { Settings, DEFAULT_BASE_URL } from './types'

// The API key is stored ONLY in chrome.storage.local (this browser profile).
// It is never hardcoded, synced, or sent anywhere except the user's own Levl1
// API base URL.
const KEY = 'levl1_settings'

export async function getSettings(): Promise<Settings> {
  const out = await chrome.storage.local.get(KEY)
  const s = (out[KEY] ?? {}) as Partial<Settings>
  return {
    apiKey: s.apiKey ?? '',
    baseUrl: (s.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, ''),
    defaultJobId: s.defaultJobId ?? '',
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  await chrome.storage.local.set({ [KEY]: { ...s, baseUrl: s.baseUrl.replace(/\/+$/, '') } })
}
