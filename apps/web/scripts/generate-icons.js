#!/usr/bin/env node
/**
 * Generate PWA icons for Levl1.
 * Requires: npm install canvas (or use node-canvas)
 * Run:      node scripts/generate-icons.js
 *
 * Falls back to a pure-Node approach using raw PNG encoding
 * if the `canvas` package is not installed.
 */

const fs   = require('fs')
const path = require('path')

const SIZES = [192, 512]
const OUT_DIR = path.join(__dirname, '..', 'public', 'icons')

fs.mkdirSync(OUT_DIR, { recursive: true })

/* ── Try to use the `canvas` npm package ───────────────────── */
let canvasLib
try {
  canvasLib = require('canvas')
} catch {
  /* silently fall through to the fallback */
}

if (canvasLib) {
  const { createCanvas } = canvasLib
  for (const size of SIZES) {
    const canvas = createCanvas(size, size)
    const ctx    = canvas.getContext('2d')

    /* Background gradient */
    const grad = ctx.createLinearGradient(0, 0, size, size)
    grad.addColorStop(0, '#4F46E5')
    grad.addColorStop(1, '#7C3AED')
    ctx.fillStyle = grad
    ctx.beginPath()
    const r = size * 0.22
    ctx.roundRect(0, 0, size, size, r)
    ctx.fill()

    /* "L1" text */
    ctx.fillStyle = '#FFFFFF'
    ctx.font      = `bold ${Math.round(size * 0.38)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('L1', size / 2, size / 2)

    const buf = canvas.toBuffer('image/png')
    const out = path.join(OUT_DIR, `icon-${size}.png`)
    fs.writeFileSync(out, buf)
    console.log(`✅  Written ${out}`)
  }
} else {
  /* ── Fallback: write a minimal valid 1×1 purple PNG as placeholder ── */
  console.warn('⚠️  `canvas` package not found — writing placeholder PNGs.')
  console.warn('    Install with: npm install canvas')
  console.warn('    Then re-run this script to generate proper icons.')

  /*
   * A valid 1×1 purple (#4F46E5) PNG in base64.
   * Replace with real icons before shipping to production.
   */
  const PURPLE_1x1_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64',
  )

  for (const size of SIZES) {
    const out = path.join(OUT_DIR, `icon-${size}.png`)
    if (!fs.existsSync(out)) {
      fs.writeFileSync(out, PURPLE_1x1_PNG)
      console.log(`📌  Placeholder written: ${out}`)
    } else {
      console.log(`⏭️  Already exists: ${out} — skipping`)
    }
  }
}
