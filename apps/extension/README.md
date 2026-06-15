# Levl1 Hire — Candidate Capture (Chrome Extension)

One-click capture of a candidate from a LinkedIn profile (or any page) into
**Levl1 Hire**, optionally triggering an AI interview. Manifest V3.

This extension is **separate from the Next.js app** and is **not deployed on
Render**. It is packaged and uploaded to the Chrome Web Store independently.

It authenticates with a tenant **API key** (Build 0 public API) and calls:
- `GET  /api/v1/jobs` — validate key + load default-job options
- `POST /api/v1/candidates` — create the candidate
- `POST /api/v1/interviews` — (optional) trigger an AI interview

## Prerequisites
- The Levl1 public API (Build 0) must be live.
- An API key from **Levl1 Hire → Settings → Developers** (shown once on creation).

## Develop (load unpacked)
```bash
cd apps/extension
npm install
npm run icons      # generate brand icons → icons/ (first run only)
npm run build      # bundle → dist/
# (or `npm run watch` to rebuild on change)
```
Then in Chrome:
1. Go to `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** → select `apps/extension/dist`.
3. The options page opens on first install — paste your API key, click
   **Validate & save**, optionally pick a default job.
4. Open a `https://www.linkedin.com/in/...` profile, click the Levl1 toolbar
   icon, review the pre-filled fields, and **Add to Levl1** (or **Add & trigger
   interview**).

## Package for the Chrome Web Store
```bash
npm run zip        # builds dist/ and produces levl1-extension.zip
```
Upload `levl1-extension.zip` in the Chrome Web Store Developer Dashboard.

## Project layout
```
manifest.json            MV3 manifest (copied into dist/)
build.mjs                esbuild bundler (popup/options/content/background)
gen-icons.mjs            generates solid-purple PNG icons
src/
  popup.html / popup.tsx     capture UI (React, tiny)
  options.html / options.tsx setup: API key, base URL, default job
  content.ts                 LinkedIn content script (scrape on request)
  background.ts              MV3 service worker
  api.ts                     Levl1 public API client ({ data, error } envelope)
  scrape.ts                  self-contained page scraper (injected on any page)
  storage.ts / types.ts      chrome.storage.local helpers + shared types
```

## Adding more sites later
Keep the **same content-script contract**: a page scraper returning the
`Captured` shape (`src/types.ts`). Extend `scrapeProfile()` in `src/scrape.ts`
with site-specific selectors (it already falls back to JSON-LD / Open Graph /
visible mailto·tel for generic pages), or add a `matches` entry in
`manifest.json` for a new content-script host. No API changes required.

## Compliance & data posture (read this)
- **Only data already visible** to the logged-in recruiter on the current page
  is captured. No background crawling, no bulk scraping, no bypassing auth walls
  or paywalls. **One profile at a time, user-initiated** (you open the popup).
- **Email / phone** are captured only if they are **visibly present** on the
  page (e.g. a `mailto:`/`tel:` link or shown text). If not shown, you add them
  manually — the fields are editable before submit.
- The **API key is stored only in `chrome.storage.local`** on your machine. It
  is never hardcoded, never synced, and is sent only to your configured Levl1
  API base URL (`https://levl1.io` by default).
- The recruiter is responsible for having a lawful basis to add a candidate and
  for complying with each source site's terms of use.
