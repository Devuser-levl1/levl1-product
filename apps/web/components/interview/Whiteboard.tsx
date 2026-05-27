'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Pen, Square, Circle, Minus, Type, Eraser, Undo2, Download } from 'lucide-react'

type Tool = 'pen' | 'rect' | 'circle' | 'arrow' | 'text' | 'eraser'

const PRESET_COLORS = ['#4F46E5', '#7C3AED', '#10B981', '#F59E0B', '#DC2626']
const CANVAS_W = 1400
const CANVAS_H = 480

interface Props {
  onExport?: (dataUrl: string) => void
}

export default function Whiteboard({ onExport }: Props) {
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const [tool, setTool]     = useState<Tool>('pen')
  const [color, setColor]   = useState(PRESET_COLORS[0])
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
    setHistory((prev) => prev.slice(0, -1))
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
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()
      const angle = Math.atan2(y2 - y1, x2 - x1)
      const hs    = 14
      ctx.beginPath()
      ctx.moveTo(x2, y2)
      ctx.lineTo(x2 - hs * Math.cos(angle - Math.PI / 6), y2 - hs * Math.sin(angle - Math.PI / 6))
      ctx.lineTo(x2 - hs * Math.cos(angle + Math.PI / 6), y2 - hs * Math.sin(angle + Math.PI / 6))
      ctx.closePath()
      ctx.fill()
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPos(e)
    startPos.current = pos
    setIsDrawing(true)

    const canvas = canvasRef.current
    const ctx    = getCtx()
    if (!canvas || !ctx) return

    if (tool === 'text') {
      saveHistory()
      const text = prompt('Enter text:') || ''
      if (text) {
        ctx.fillStyle = color
        ctx.font      = 'bold 18px "Inter", sans-serif'
        ctx.fillText(text, pos.x, pos.y)
        saveHistory()
      }
      setIsDrawing(false)
      return
    }

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

    if (tool === 'pen') {
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    } else if (tool === 'eraser') {
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
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
    <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 10, overflow: 'hidden', border: '1px solid #1E293B' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px',
        background: '#1E293B',
      }}>
        {/* Tools */}
        <div style={{ display: 'flex', gap: 2 }}>
          {TOOLS.map((t) => (
            <button
              key={t.id}
              title={t.label}
              onClick={() => setTool(t.id)}
              style={{
                padding: '5px 8px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: tool === t.id ? 'rgba(124,58,237,0.25)' : 'transparent',
                color: tool === t.id ? '#7C3AED' : '#94A3B8',
                display: 'flex', alignItems: 'center',
                transition: 'all 0.15s',
              }}
            >
              {t.icon}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 20, background: '#334155', margin: '0 4px' }} />

        {/* Colors */}
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 18, height: 18, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                outline: color === c ? '2px solid #fff' : 'none',
                boxShadow: color === c ? '0 0 0 1px #64748B' : 'none',
              }}
            />
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button
            onClick={undo}
            disabled={history.length === 0}
            style={{
              padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: 'transparent', color: history.length ? '#94A3B8' : '#334155',
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
            }}
          >
            <Undo2 size={12} /> Undo
          </button>
          <button
            onClick={exportPng}
            style={{
              padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: 'rgba(16,185,129,0.2)', color: '#10B981',
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
            }}
          >
            <Download size={12} /> Save PNG
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          background: '#FFFFFF',
          cursor: tool === 'eraser' ? 'cell' : tool === 'text' ? 'text' : 'crosshair',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  )
}
