'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Pen, Square, Circle, Minus, Type, Eraser, Undo2, Download, CheckCircle2 } from 'lucide-react'

type Tool = 'pen' | 'rect' | 'circle' | 'arrow' | 'text' | 'eraser'

const PRESET_COLORS = ['#4F46E5', '#7C3AED', '#10B981', '#F59E0B', '#DC2626']
const CANVAS_W = 1400
const CANVAS_H = 480

interface Props {
  onExport?: (dataUrl: string) => void
  onDone?:   () => void   // Fix 2: signal interview engine that whiteboard is done
}

export default function Whiteboard({ onExport, onDone }: Props) {
  const canvasRef          = useRef<HTMLCanvasElement>(null)
  const containerRef       = useRef<HTMLDivElement>(null)
  const [tool, setTool]    = useState<Tool>('pen')
  const [color, setColor]  = useState(PRESET_COLORS[0])
  const [isDrawing, setIsDrawing] = useState(false)
  const [history, setHistory]     = useState<ImageData[]>([])
  const startPos  = useRef({ x: 0, y: 0 })
  const snapRef   = useRef<ImageData | null>(null)

  // Init white canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  }, [])

  const getCtx = () => canvasRef.current?.getContext('2d') ?? null

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect   = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (CANVAS_W / rect.width),
      y: (e.clientY - rect.top)  * (CANVAS_H / rect.height),
    }
  }

  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current
    const ctx    = getCtx()
    if (!canvas || !ctx) return
    const snap = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H)
    setHistory((prev) => [...prev.slice(-24), snap])
  }, [])

  const undo = () => {
    const ctx = getCtx()
    if (!ctx || history.length === 0) return
    const prev = history[history.length - 1]
    ctx.putImageData(prev, 0, 0)
    setHistory((h) => h.slice(0, -1))
  }

  const exportPng = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    onExport?.(dataUrl)
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'whiteboard.png'
    a.click()
  }

  // Fix 2: Done button handler — export PNG then call onDone
  const handleDone = () => {
    const canvas = canvasRef.current
    if (canvas) onExport?.(canvas.toDataURL('image/png'))
    onDone?.()
  }

  // Fix 1: Inline text input overlay — no prompt()
  const handleTextClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas    = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const pos       = getPos(e)
    const rect      = canvas.getBoundingClientRect()
    const scaleX    = rect.width  / CANVAS_W
    void (rect.height / CANVAS_H) // scaleY unused but kept for future touch support
    const inputLeft = e.clientX - container.getBoundingClientRect().left
    const inputTop  = e.clientY - container.getBoundingClientRect().top

    saveHistory()

    const input = document.createElement('input')
    input.type = 'text'
    input.placeholder = 'Type and press Enter'
    input.style.cssText = [
      `position:absolute`,
      `left:${inputLeft}px`,
      `top:${inputTop - 10}px`,
      `font-size:${Math.round(16 * scaleX)}px`,
      `min-width:120px`,
      `max-width:300px`,
      `border:1.5px dashed #4F46E5`,
      `border-radius:4px`,
      `background:rgba(255,255,255,0.9)`,
      `outline:none`,
      `padding:2px 6px`,
      `z-index:100`,
      `font-family:Arial,sans-serif`,
      `color:${color}`,
    ].join(';')

    container.appendChild(input)
    input.focus()

    const commitText = () => {
      if (input.value.trim()) {
        const ctx = getCtx()
        if (ctx) {
          ctx.font      = `bold 18px Arial, sans-serif`
          ctx.fillStyle = color
          ctx.fillText(input.value.trim(), pos.x, pos.y)
          saveHistory()
        }
      }
      input.remove()
    }

    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') commitText()
      if (ev.key === 'Escape') input.remove()
    })
    input.addEventListener('blur', commitText)
    setIsDrawing(false)
  }

  const drawShape = (
    ctx: CanvasRenderingContext2D,
    t: Tool,
    x1: number, y1: number,
    x2: number, y2: number,
  ) => {
    ctx.strokeStyle = color
    ctx.fillStyle   = color
    ctx.lineWidth   = 2.5
    ctx.lineCap     = 'round'
    ctx.beginPath()

    if (t === 'rect') {
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
    } else if (t === 'circle') {
      const rx = Math.abs(x2 - x1) / 2
      const ry = Math.abs(y2 - y1) / 2
      const cx = x1 + (x2 - x1) / 2
      const cy = y1 + (y2 - y1) / 2
      ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2)
      ctx.stroke()
    } else if (t === 'arrow') {
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
      const angle = Math.atan2(y2 - y1, x2 - x1)
      const hs    = 14
      ctx.beginPath()
      ctx.moveTo(x2, y2)
      ctx.lineTo(x2 - hs * Math.cos(angle - Math.PI / 6), y2 - hs * Math.sin(angle - Math.PI / 6))
      ctx.lineTo(x2 - hs * Math.cos(angle + Math.PI / 6), y2 - hs * Math.sin(angle + Math.PI / 6))
      ctx.closePath(); ctx.fill()
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Fix 1: text tool handled separately via onClick-equivalent
    if (tool === 'text') { handleTextClick(e); return }

    const pos = getPos(e)
    startPos.current = pos
    setIsDrawing(true)

    const ctx = getCtx()
    if (!ctx) return

    if (tool === 'pen' || tool === 'eraser') {
      saveHistory()
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
      ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color
      ctx.lineWidth   = tool === 'eraser' ? 28 : 2.5
      ctx.lineCap     = 'round'
      ctx.lineJoin    = 'round'
    } else {
      snapRef.current = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const pos = getPos(e)
    const ctx = getCtx()
    if (!ctx) return

    if (tool === 'pen' || tool === 'eraser') {
      ctx.lineTo(pos.x, pos.y); ctx.stroke()
    } else if (snapRef.current) {
      ctx.putImageData(snapRef.current, 0, 0)
      drawShape(ctx, tool, startPos.current.x, startPos.current.y, pos.x, pos.y)
    }
  }

  const handleMouseUp = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    saveHistory()
  }

  const TOOLS: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: 'pen',    icon: <Pen    size={14} />, label: 'Pen'    },
    { id: 'rect',   icon: <Square size={14} />, label: 'Rect'   },
    { id: 'circle', icon: <Circle size={14} />, label: 'Circle' },
    { id: 'arrow',  icon: <Minus  size={14} />, label: 'Arrow'  },
    { id: 'text',   icon: <Type   size={14} />, label: 'Text'   },
    { id: 'eraser', icon: <Eraser size={14} />, label: 'Erase'  },
  ]

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', borderRadius: 10, overflow: 'hidden', border: '1px solid #1E293B', position: 'relative' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#1E293B' }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {TOOLS.map((t) => (
            <button key={t.id} title={t.label} onClick={() => setTool(t.id)} style={{ padding: '5px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: tool === t.id ? 'rgba(124,58,237,0.25)' : 'transparent', color: tool === t.id ? '#7C3AED' : '#94A3B8', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}>
              {t.icon}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 20, background: '#334155', margin: '0 4px' }} />
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {PRESET_COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} style={{ width: 18, height: 18, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', outline: color === c ? '2px solid #fff' : 'none', boxShadow: color === c ? '0 0 0 1px #64748B' : 'none' }} />
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button onClick={undo} disabled={history.length === 0} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'transparent', color: history.length ? '#94A3B8' : '#334155', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}>
            <Undo2 size={12} /> Undo
          </button>
          <button onClick={exportPng} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(16,185,129,0.2)', color: '#10B981', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}>
            <Download size={12} /> Save
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{ width: '100%', height: 'auto', display: 'block', background: '#FFFFFF', cursor: tool === 'eraser' ? 'cell' : tool === 'text' ? 'text' : 'crosshair' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Fix 2: Done button footer */}
      {onDone && (
        <div style={{ padding: '8px 14px', borderTop: '1px solid #1E293B', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#64748B' }}>Draw your answer, then click Done</span>
          <button onClick={handleDone} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 7, border: 'none', background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)', boxShadow: '0 2px 8px rgba(16,185,129,0.35)' }}>
            <CheckCircle2 size={13} /> Done — Submit Diagram ✓
          </button>
        </div>
      )}
    </div>
  )
}
