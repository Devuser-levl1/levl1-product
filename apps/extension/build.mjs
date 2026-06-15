import * as esbuild from 'esbuild'
import { cpSync, mkdirSync, existsSync } from 'node:fs'

const watch = process.argv.includes('--watch')
const outdir = 'dist'

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
}
