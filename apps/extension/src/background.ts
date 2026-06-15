import { DEFAULT_BASE_URL } from './types'

// MV3 service worker. Seeds a default base URL on install and opens the options
// page so the recruiter can paste their API key. The API base + key live in
// chrome.storage.local (read by the popup); nothing is hardcoded here.
chrome.runtime.onInstalled.addListener(async (details) => {
  const out = await chrome.storage.local.get('levl1_settings')
  if (!out.levl1_settings) {
    await chrome.storage.local.set({ levl1_settings: { apiKey: '', baseUrl: DEFAULT_BASE_URL, defaultJobId: '' } })
  }
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage()
  }
})
