const { createCanvas } = require('canvas')
const fs = require('fs')

function generateIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Indigo background with rounded corners
  const radius = size * 0.2
  ctx.fillStyle = '#4F46E5'
  ctx.beginPath()
  ctx.moveTo(radius, 0)
  ctx.lineTo(size - radius, 0)
  ctx.quadraticCurveTo(size, 0, size, radius)
  ctx.lineTo(size, size - radius)
  ctx.quadraticCurveTo(size, size, size - radius, size)
  ctx.lineTo(radius, size)
  ctx.quadraticCurveTo(0, size, 0, size - radius)
  ctx.lineTo(0, radius)
  ctx.quadraticCurveTo(0, 0, radius, 0)
  ctx.closePath()
  ctx.fill()

  // White L1 text
  ctx.fillStyle = '#FFFFFF'
  ctx.font = `bold ${size * 0.35}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('L1', size / 2, size / 2)

  return canvas.toBuffer('image/png')
}

fs.mkdirSync('public/icons', { recursive: true })
fs.writeFileSync('public/icons/icon-192.png', generateIcon(192))
fs.writeFileSync('public/icons/icon-512.png', generateIcon(512))
console.log('Icons generated')
