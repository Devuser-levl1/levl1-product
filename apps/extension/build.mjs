import * as esbuild from 'esbuild'
import { cpSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { execSync } from 'node:child_process'

const watch = process.argv.includes('--watch')
const outdir = 'dist'

// Package dist/ into a downloadable .zip the in-app setup page serves. Hosted
// from the web app's static assets (apps/web/public), so recruiters can
// download → unzip → Load unpacked without a terminal.
function packageZip() {
  const zipName = 'levl1-sourcing-extension.zip'
  const publicDir = '../web/public'
  try {
    rmSync(`${publicDir}/${zipName}`, { force: true })
    // Zip the CONTENTS of dist/ under a top-level folder so unzip yields a
    // single "levl1-sourcing-extension" folder to Load unpacked.
    execSync(`rm -rf .pkg && mkdir -p .pkg/levl1-sourcing-extension && cp -R ${outdir}/. .pkg/levl1-sourcing-extension/ && (cd .pkg && zip -r -q ../${publicDir}/${zipName} levl1-sourcing-extension) && rm -rf .pkg`, { stdio: 'inherit' })
    console.log(`[extension] packaged → apps/web/public/${zipName}`)
  } catch (e) {
    console.error('[extension] zip packaging failed:', e instanceof Error ? e.message : e)
  }
}

mkdirSync(outdir, { recursive: true })

// Static assets → dist/
cpSync('manifest.json', `${outdir}/manifest.json`)
cpSync('src/popup.html', `${outdir}/popup.html`)
cpSync('src/options.html', `${outdir}/options.html`)
if (existsSync('icons')) cpSync('icons', `${outdir}/icons`, { recursive: true })

const common = {
  bundle: true,
  format: 'esm',
  target: ['chrome110'],
  jsx: 'automatic',
  logLevel: 'info',
  define: { 'process.env.NODE_ENV': '"production"' },
}

const builds = [
  { entryPoints: ['src/popup.tsx'], outfile: `${outdir}/popup.js` },
  { entryPoints: ['src/options.tsx'], outfile: `${outdir}/options.js` },
  { entryPoints: ['src/content.ts'], outfile: `${outdir}/content.js`, format: 'iife' },
  { entryPoints: ['src/background.ts'], outfile: `${outdir}/background.js` },
]

if (watch) {
  for (const b of builds) {
    const ctx = await esbuild.context({ ...common, ...b })
    await ctx.watch()
  }
  console.log('[extension] watching…')
} else {
  await Promise.all(builds.map((b) => esbuild.build({ ...common, ...b })))
  console.log('[extension] build complete → dist/')
  packageZip()
}
