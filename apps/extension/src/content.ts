import { scrapeProfile } from './scrape'

// Content script declared for LinkedIn profile pages. Responds to a scrape
// request from the popup. (For non-LinkedIn pages the popup injects scrapeProfile
// directly via chrome.scripting.executeScript, so no content script is needed.)
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'LEVL1_SCRAPE') {
    try {
      sendResponse({ ok: true, data: scrapeProfile() })
    } catch (e) {
      sendResponse({ ok: false, error: e instanceof Error ? e.message : 'scrape failed' })
    }
  }
  return true // keep the message channel open for the async response
})
