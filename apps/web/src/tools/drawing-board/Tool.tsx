import { useEffect, useRef, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { DrawingBoardInput } from './schema'
import { downloadPng, floodFill, hexToRgba } from './utils'

const CANVAS_W = 960
const CANVAS_H = 600
const HISTORY_LIMIT = 40

type ToolKind = 'brush' | 'line' | 'rect' | 'ellipse' | 'eraser' | 'fill'

const TOOLS: ReadonlyArray<{ id: ToolKind; label: string }> = [
  { id: 'brush', label: '画笔' },
  { id: 'line', label: '直线' },
  { id: 'rect', label: '矩形' },
  { id: 'ellipse', label: '圆形' },
  { id: 'eraser', label: '橡皮' },
  { id: 'fill', label: '填充' },
]

const SWATCHES = [
  '#000000',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
]

const BTN = (active: boolean): string =>
  `rounded border px-3 py-1.5 text-sm ${
    active
      ? 'border-brand bg-brand text-white'
      : 'border-slate-300 bg-white text-slate-700 hover:border-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
  }`

function setupCtx(ctx: CanvasRenderingContext2D, color: string, width: number): void {
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}

export default function Tool() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<ToolKind>('brush')
  const [color, setColor] = useState('#000000')
  const [lineWidth, setLineWidth] = useState(6)
  const [strokes, setStrokes] = useState(0)

  // 撤销栈：存每一步之前的 dataURL（ref 存数据，state 只镜像可用状态）
  const historyRef = useRef<string[]>([])
  const indexRef = useRef(-1)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const syncHistState = (): void => {
    setCanUndo(indexRef.current > 0)
    setCanRedo(indexRef.current < historyRef.current.length - 1)
  }

  // 本次绘制中的临时状态
  const drawingRef = useRef(false)
  const lastRef = useRef<[number, number] | null>(null)
  const shapeStartRef = useRef<[number, number] | null>(null)
  const previewRef = useRef<ImageData | null>(null)

  const ctxOf = (): CanvasRenderingContext2D | null =>
    canvasRef.current?.getContext('2d') ?? null

  const snapshot = (): void => {
    const canvas = canvasRef.current
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    historyRef.current = historyRef.current.slice(0, indexRef.current + 1)
    historyRef.current.push(url)
    if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift()
    indexRef.current = historyRef.current.length - 1
    syncHistState()
  }

  const restore = (url: string): void => {
    const canvas = canvasRef.current
    const ctx = ctxOf()
    if (!canvas || !ctx) return
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
    }
    img.src = url
  }

  // 初始化白底 + 首帧快照
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = ctxOf()
    if (!canvas || !ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    historyRef.current = [canvas.toDataURL('image/png')]
    indexRef.current = 0
    syncHistState()
  }, [])

  function undo(): void {
    if (!canUndo) return
    indexRef.current -= 1
    restore(historyRef.current[indexRef.current])
    syncHistState()
  }

  function redo(): void {
    if (!canRedo) return
    indexRef.current += 1
    restore(historyRef.current[indexRef.current])
    syncHistState()
  }

  function clearCanvas(): void {
    const ctx = ctxOf()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    snapshot()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setStrokes((n) => n + 1)
  }

  function posOf(e: React.PointerEvent): [number, number] {
    const canvas = canvasRef.current as HTMLCanvasElement
    const rect = canvas.getBoundingClientRect()
    return [
      ((e.clientX - rect.left) / rect.width) * canvas.width,
      ((e.clientY - rect.top) / rect.height) * canvas.height,
    ]
  }

  function drawShape(
    ctx: CanvasRenderingContext2D,
    kind: ToolKind,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
  ): void {
    if (kind === 'line') {
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
      ctx.stroke()
    } else if (kind === 'rect') {
      ctx.strokeRect(x0, y0, x1 - x0, y1 - y0)
    } else if (kind === 'ellipse') {
      ctx.beginPath()
      ctx.ellipse(
        (x0 + x1) / 2,
        (y0 + y1) / 2,
        Math.abs(x1 - x0) / 2,
        Math.abs(y1 - y0) / 2,
        0,
        0,
        Math.PI * 2,
      )
      ctx.stroke()
    }
  }

  function onPointerDown(e: React.PointerEvent): void {
    const ctx = ctxOf()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    const [x, y] = posOf(e)

    if (tool === 'fill') {
      snapshot()
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
      floodFill(img, Math.floor(x), Math.floor(y), hexToRgba(color))
      ctx.putImageData(img, 0, 0)
      setStrokes((n) => n + 1)
      return
    }

    snapshot()
    drawingRef.current = true
    if (tool === 'brush' || tool === 'eraser') {
      setupCtx(ctx, tool === 'eraser' ? '#ffffff' : color, lineWidth)
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + 0.01, y + 0.01)
      ctx.stroke()
      lastRef.current = [x, y]
    } else {
      shapeStartRef.current = [x, y]
      previewRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height)
    }
  }

  function onPointerMove(e: React.PointerEvent): void {
    if (!drawingRef.current) return
    const ctx = ctxOf()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    const [x, y] = posOf(e)

    if (tool === 'brush' || tool === 'eraser') {
      const last = lastRef.current
      if (!last) return
      setupCtx(ctx, tool === 'eraser' ? '#ffffff' : color, lineWidth)
      ctx.beginPath()
      ctx.moveTo(last[0], last[1])
      ctx.lineTo(x, y)
      ctx.stroke()
      lastRef.current = [x, y]
    } else {
      const start = shapeStartRef.current
      const preview = previewRef.current
      if (!start || !preview) return
      ctx.putImageData(preview, 0, 0)
      setupCtx(ctx, color, lineWidth)
      drawShape(ctx, tool, start[0], start[1], x, y)
    }
  }

  function endStroke(): void {
    if (!drawingRef.current) return
    drawingRef.current = false
    lastRef.current = null
    shapeStartRef.current = null
    previewRef.current = null
    setStrokes((n) => n + 1)
  }

  function exportPng(): void {
    const canvas = canvasRef.current
    if (canvas) downloadPng(canvas, 'drawing-board.png')
  }

  return (
    <MultiPanel<DrawingBoardInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={{ text: '' }}
      renderOutput={(_input) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                data-testid={'drawing-tool-' + t.id}
                className={BTN(tool === t.id)}
                onClick={() => setTool(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  data-testid={'drawing-swatch-' + c.slice(1)}
                  aria-label={'颜色 ' + c}
                  className={`h-7 w-7 rounded border-2 ${
                    color === c ? 'border-brand' : 'border-slate-300 dark:border-slate-600'
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
              <input
                type="color"
                data-testid="drawing-color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="ml-1 h-7 w-10 cursor-pointer rounded border border-slate-300 dark:border-slate-600"
                aria-label="自定义颜色"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              粗细
              <input
                type="range"
                data-testid="drawing-width"
                min={1}
                max={50}
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="w-28"
              />
              <span className="w-8 text-right tabular-nums">{lineWidth}</span>
            </label>
          </div>

          <canvas
            ref={canvasRef}
            data-testid="drawing-canvas"
            width={CANVAS_W}
            height={CANVAS_H}
            className="w-full cursor-crosshair touch-none rounded border border-slate-300 bg-white dark:border-slate-600"
            style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endStroke}
            onPointerLeave={endStroke}
            onPointerCancel={endStroke}
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="drawing-undo"
              className={BTN(false)}
              disabled={!canUndo}
              onClick={undo}
            >
              撤销
            </button>
            <button
              type="button"
              data-testid="drawing-redo"
              className={BTN(false)}
              disabled={!canRedo}
              onClick={redo}
            >
              重做
            </button>
            <button
              type="button"
              data-testid="drawing-clear"
              className={BTN(false)}
              onClick={clearCanvas}
            >
              清空
            </button>
            <button
              type="button"
              data-testid="drawing-export"
              className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90"
              onClick={exportPng}
            >
              导出 PNG
            </button>
          </div>
        </div>
      )}
      toText={(_input) => `在线画图 ${CANVAS_W}x${CANVAS_H}，共 ${strokes} 笔`}
      downloadExt="txt"
    />
  )
}
