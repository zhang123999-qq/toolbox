import { useCallback, useEffect, useRef, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { DrawingBoardInput } from './schema'
import {
  arrowHeadPoints,
  downloadImage,
  downloadPng,
  floodFill,
  hexToRgba,
  shapePoints,
  sprayPoints,
} from './utils'

const HISTORY_LIMIT = 40

type ToolKind =
  | 'brush'
  | 'spray'
  | 'marker'
  | 'line'
  | 'arrow'
  | 'rect'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'text'
  | 'eraser'
  | 'fill'

type FillMode = 'stroke' | 'fill' | 'both'

const TOOLS: ReadonlyArray<{ id: ToolKind; label: string; hotkey?: string }> = [
  { id: 'brush', label: '画笔', hotkey: 'B' },
  { id: 'spray', label: '喷雾', hotkey: 'S' },
  { id: 'marker', label: '荧光笔', hotkey: 'M' },
  { id: 'line', label: '直线', hotkey: 'L' },
  { id: 'arrow', label: '箭头', hotkey: 'A' },
  { id: 'rect', label: '矩形', hotkey: 'R' },
  { id: 'ellipse', label: '圆形' },
  { id: 'triangle', label: '三角形' },
  { id: 'diamond', label: '菱形' },
  { id: 'star', label: '星形' },
  { id: 'text', label: '文本', hotkey: 'T' },
  { id: 'eraser', label: '橡皮', hotkey: 'E' },
  { id: 'fill', label: '填充', hotkey: 'F' },
]

/** 填充模式适用的图形工具 */
const SHAPE_TOOLS: ReadonlySet<ToolKind> = new Set([
  'rect',
  'ellipse',
  'triangle',
  'diamond',
  'star',
])

const FILL_MODES: ReadonlyArray<{ id: FillMode; label: string }> = [
  { id: 'stroke', label: '描边' },
  { id: 'fill', label: '填充' },
  { id: 'both', label: '描边+填充' },
]

const CANVAS_SIZES = [
  { w: 960, h: 600, label: '960×600 默认' },
  { w: 1280, h: 720, label: '1280×720 宽屏' },
  { w: 800, h: 800, label: '800×800 方形' },
  { w: 620, h: 877, label: '620×877 A4竖版' },
]

const FONT_SIZES = [16, 20, 28, 40, 56]

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

/** 自由笔触（画笔/喷雾/荧光笔/橡皮）的一段 */
function strokeSegment(
  ctx: CanvasRenderingContext2D,
  tool: ToolKind,
  color: string,
  width: number,
  bgColor: string,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  if (tool === 'spray') {
    const pts = sprayPoints(
      x0,
      y0,
      x1,
      y1,
      width * 2.2,
      Math.max(4, Math.round(width * 1.5)),
    )
    ctx.fillStyle = color
    for (const [px, py] of pts) ctx.fillRect(px, py, 2, 2)
    return
  }
  setupCtx(ctx, tool === 'eraser' ? bgColor : color, tool === 'marker' ? width * 3 : width)
  if (tool === 'marker') ctx.globalAlpha = 0.35
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  ctx.stroke()
  ctx.globalAlpha = 1
}

/** 图形绘制（含箭头头部与填充模式） */
function paintShape(
  ctx: CanvasRenderingContext2D,
  kind: ToolKind,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  mode: FillMode,
  color: string,
  width: number,
): void {
  setupCtx(ctx, color, width)
  if (kind === 'line') {
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
    return
  }
  if (kind === 'arrow') {
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()
    const [p1, p2] = arrowHeadPoints(x0, y0, x1, y1, Math.max(10, width * 3))
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(p1[0], p1[1])
    ctx.moveTo(x1, y1)
    ctx.lineTo(p2[0], p2[1])
    ctx.stroke()
    return
  }
  ctx.beginPath()
  if (kind === 'rect') {
    ctx.rect(x0, y0, x1 - x0, y1 - y0)
  } else if (kind === 'ellipse') {
    ctx.ellipse(
      (x0 + x1) / 2,
      (y0 + y1) / 2,
      Math.abs(x1 - x0) / 2,
      Math.abs(y1 - y0) / 2,
      0,
      0,
      Math.PI * 2,
    )
  } else {
    const pts = shapePoints(kind as 'triangle' | 'diamond' | 'star', x0, y0, x1, y1)
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1])
    ctx.closePath()
  }
  if (mode === 'fill' || mode === 'both') ctx.fill()
  if (mode === 'stroke' || mode === 'both') ctx.stroke()
}

export default function Tool() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const textInputRef = useRef<HTMLInputElement>(null)
  const fsRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [tool, setTool] = useState<ToolKind>('brush')
  const [color, setColor] = useState('#000000')
  const [lineWidth, setLineWidth] = useState(6)
  const [fillMode, setFillMode] = useState<FillMode>('stroke')
  const [fontSize, setFontSize] = useState(28)
  const [bgColor, setBgColor] = useState('#ffffff')
  const [canvasSize, setCanvasSize] = useState({ w: 960, h: 600 })
  const [strokes, setStrokes] = useState(0)
  const [textDraft, setTextDraft] = useState<{ x: number; y: number } | null>(null)
  const [textValue, setTextValue] = useState('')
  // 画布显示宽度（用于文本输入框字号缩放），ResizeObserver 跟踪
  const [displayWidth, setDisplayWidth] = useState(0)

  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setDisplayWidth(el.clientWidth))
    ro.observe(el)
    setDisplayWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  // 文本框弹出后自动聚焦（不用 autoFocus prop，满足无障碍规则）
  useEffect(() => {
    if (textDraft) textInputRef.current?.focus()
  }, [textDraft])

  // 全屏切换状态同步（用户按 Esc 退出时也要更新按钮）
  useEffect(() => {
    const onFsChange = (): void => setIsFullscreen(document.fullscreenElement != null)
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  function toggleFullscreen(): void {
    if (document.fullscreenElement) {
      const p = document.exitFullscreen()
      if (p) p.catch(() => {})
    } else {
      const p = fsRef.current?.requestFullscreen()
      if (p) p.catch(() => {})
    }
  }

  const bgColorRef = useRef('#ffffff')

  // 撤销栈：存每一步完成后的 dataURL（ref 存数据，state 只镜像可用状态）
  const historyRef = useRef<string[]>([])
  const indexRef = useRef(-1)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const syncHistState = useCallback((): void => {
    setCanUndo(indexRef.current > 0)
    setCanRedo(indexRef.current < historyRef.current.length - 1)
  }, [])

  // 本次绘制中的临时状态
  const drawingRef = useRef(false)
  const lastRef = useRef<[number, number] | null>(null)
  const shapeStartRef = useRef<[number, number] | null>(null)
  const previewRef = useRef<ImageData | null>(null)

  const ctxOf = (): CanvasRenderingContext2D | null =>
    canvasRef.current?.getContext('2d') ?? null

  /** 每次操作完成后调用：记录完成态（修复旧版只存绘制前快照导致重做失效的问题） */
  const pushHistory = (): void => {
    const canvas = canvasRef.current
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    historyRef.current = historyRef.current.slice(0, indexRef.current + 1)
    historyRef.current.push(url)
    if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift()
    indexRef.current = historyRef.current.length - 1
    syncHistState()
  }

  const commitOp = (): void => {
    pushHistory()
    setStrokes((n) => n + 1)
  }

  const restore = useCallback((url: string): void => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
    }
    img.src = url
  }, [])

  const doUndo = useCallback((): void => {
    if (indexRef.current <= 0) return
    indexRef.current -= 1
    restore(historyRef.current[indexRef.current])
    syncHistState()
  }, [restore, syncHistState])

  const doRedo = useCallback((): void => {
    if (indexRef.current >= historyRef.current.length - 1) return
    indexRef.current += 1
    restore(historyRef.current[indexRef.current])
    syncHistState()
  }, [restore, syncHistState])

  // 初始化 / 画布尺寸变化：白底（当前背景色）+ 重置历史
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.fillStyle = bgColorRef.current
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    historyRef.current = [canvas.toDataURL('image/png')]
    indexRef.current = 0
    setCanUndo(false)
    setCanRedo(false)
  }, [canvasSize])

  // 快捷键：Ctrl/Cmd+Z 撤销，Ctrl/Cmd+Y / Ctrl/Cmd+Shift+Z 重做；单字母切换工具
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const t = e.target as HTMLElement | null
      if (
        t &&
        (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
      )
        return
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      if (mod && key === 'z' && !e.shiftKey) {
        e.preventDefault()
        doUndo()
        return
      }
      if ((mod && key === 'y') || (mod && e.shiftKey && key === 'z')) {
        e.preventDefault()
        doRedo()
        return
      }
      if (mod) return
      const map: Record<string, ToolKind> = {
        b: 'brush',
        s: 'spray',
        m: 'marker',
        l: 'line',
        a: 'arrow',
        r: 'rect',
        t: 'text',
        e: 'eraser',
        f: 'fill',
      }
      const next = map[key]
      if (next) setTool(next)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doUndo, doRedo])

  function posOf(e: React.PointerEvent): [number, number] {
    const canvas = canvasRef.current as HTMLCanvasElement
    const rect = canvas.getBoundingClientRect()
    return [
      ((e.clientX - rect.left) / rect.width) * canvas.width,
      ((e.clientY - rect.top) / rect.height) * canvas.height,
    ]
  }

  function commitText(): void {
    const draft = textDraft
    const canvas = canvasRef.current
    const ctx = ctxOf()
    setTextDraft(null)
    const value = textValue.trim()
    setTextValue('')
    if (!draft || !canvas || !ctx || value === '') return
    ctx.font = `${fontSize}px system-ui, sans-serif`
    ctx.fillStyle = color
    ctx.textBaseline = 'top'
    ctx.fillText(value, draft.x, draft.y)
    commitOp()
  }

  function onPointerDown(e: React.PointerEvent): void {
    const ctx = ctxOf()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    const [x, y] = posOf(e)

    if (tool === 'fill') {
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
      floodFill(img, Math.floor(x), Math.floor(y), hexToRgba(color))
      ctx.putImageData(img, 0, 0)
      commitOp()
      return
    }

    if (tool === 'text') {
      if (textDraft) commitText()
      setTextDraft({ x, y })
      return
    }

    drawingRef.current = true
    if (tool === 'brush' || tool === 'spray' || tool === 'marker' || tool === 'eraser') {
      strokeSegment(ctx, tool, color, lineWidth, bgColorRef.current, x, y, x + 0.01, y + 0.01)
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

    if (tool === 'brush' || tool === 'spray' || tool === 'marker' || tool === 'eraser') {
      const last = lastRef.current
      if (!last) return
      strokeSegment(ctx, tool, color, lineWidth, bgColorRef.current, last[0], last[1], x, y)
      lastRef.current = [x, y]
    } else {
      const start = shapeStartRef.current
      const preview = previewRef.current
      if (!start || !preview) return
      ctx.putImageData(preview, 0, 0)
      paintShape(ctx, tool, start[0], start[1], x, y, fillMode, color, lineWidth)
    }
  }

  function endStroke(): void {
    if (!drawingRef.current) return
    drawingRef.current = false
    lastRef.current = null
    shapeStartRef.current = null
    previewRef.current = null
    commitOp()
  }

  function clearCanvas(): void {
    const ctx = ctxOf()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    ctx.fillStyle = bgColorRef.current
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    commitOp()
  }

  function changeBg(c: string): void {
    const ctx = ctxOf()
    const canvas = canvasRef.current
    setBgColor(c)
    bgColorRef.current = c
    if (!ctx || !canvas) return
    // 直接重填背景（覆盖已有内容，可撤销）
    ctx.fillStyle = c
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    commitOp()
  }

  function onImageFile(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      const ctx = ctxOf()
      if (canvas && ctx) {
        // 底图：背景色打底，图片按比例完整放入居中
        ctx.fillStyle = bgColorRef.current
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        const s = Math.min(canvas.width / img.width, canvas.height / img.height)
        const dw = img.width * s
        const dh = img.height * s
        ctx.drawImage(img, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh)
        commitOp()
      }
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  function exportPng(): void {
    const canvas = canvasRef.current
    if (canvas) downloadPng(canvas, 'drawing-board.png')
  }

  function exportJpg(): void {
    const canvas = canvasRef.current
    if (canvas) downloadImage(canvas, 'drawing-board.jpg', 'image/jpeg', 0.92)
  }

  const overlayScale = canvasSize.w > 0 && displayWidth > 0 ? displayWidth / canvasSize.w : 1

  return (
    <MultiPanel<DrawingBoardInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={{ text: '' }}
      renderOutput={(_input) => (
        <div
          ref={fsRef}
          className={`flex flex-col gap-3 ${
            isFullscreen ? 'h-screen overflow-hidden bg-white p-4 dark:bg-slate-950' : ''
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                data-testid={'drawing-tool-' + t.id}
                title={t.hotkey ? `${t.label}（${t.hotkey}）` : t.label}
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
            {SHAPE_TOOLS.has(tool) && (
              <div className="flex items-center gap-1" data-testid="drawing-fillmode">
                {FILL_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    data-testid={'drawing-fillmode-' + m.id}
                    className={BTN(fillMode === m.id)}
                    onClick={() => setFillMode(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
            {tool === 'text' && (
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                字号
                <select
                  data-testid="drawing-fontsize"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-900"
                >
                  {FONT_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}px
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              画布
              <select
                data-testid="drawing-canvassize"
                value={`${canvasSize.w}x${canvasSize.h}`}
                onChange={(e) => {
                  const s = CANVAS_SIZES.find((v) => `${v.w}x${v.h}` === e.target.value)
                  if (s) setCanvasSize({ w: s.w, h: s.h })
                }}
                className="rounded border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-900"
              >
                {CANVAS_SIZES.map((s) => (
                  <option key={`${s.w}x${s.h}`} value={`${s.w}x${s.h}`}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              背景色
              <input
                type="color"
                data-testid="drawing-bgcolor"
                value={bgColor}
                onChange={(e) => changeBg(e.target.value)}
                className="h-7 w-10 cursor-pointer rounded border border-slate-300 dark:border-slate-600"
                aria-label="背景色（立即重填，可撤销）"
              />
            </label>
            <label
              data-testid="drawing-upload-label"
              className="cursor-pointer rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              上传图片作底图
              <input
                type="file"
                data-testid="drawing-upload"
                accept="image/*"
                className="hidden"
                onChange={onImageFile}
              />
            </label>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              快捷键：B 画笔 · S 喷雾 · M 荧光笔 · E 橡皮 · T 文本 · L 直线 · R 矩形 · A 箭头 ·
              F 填充 · Ctrl+Z 撤销 · Ctrl+Y 重做
            </span>
          </div>

          <div
            ref={wrapRef}
            className={`relative ${isFullscreen ? 'flex min-h-0 flex-1 items-center justify-center overflow-auto' : ''}`}
          >
            <canvas
              ref={canvasRef}
              data-testid="drawing-canvas"
              width={canvasSize.w}
              height={canvasSize.h}
              className={`cursor-crosshair touch-none rounded border border-slate-300 bg-white dark:border-slate-600 ${
                isFullscreen ? '' : 'w-full'
              }`}
              style={
                isFullscreen
                  ? { maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }
                  : { aspectRatio: `${canvasSize.w} / ${canvasSize.h}` }
              }
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endStroke}
              onPointerLeave={endStroke}
              onPointerCancel={endStroke}
            />
            {textDraft && (
              <input
                ref={textInputRef}
                data-testid="drawing-text-input"
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitText()
                  if (e.key === 'Escape') {
                    setTextDraft(null)
                    setTextValue('')
                  }
                }}
                onBlur={commitText}
                placeholder="输入文字，回车确认"
                className="absolute z-10 min-w-32 rounded border border-brand bg-white/95 px-2 py-1 shadow dark:bg-slate-900/95"
                style={{
                  left: `${(textDraft.x / canvasSize.w) * 100}%`,
                  top: `${(textDraft.y / canvasSize.h) * 100}%`,
                  fontSize: `${Math.max(12, fontSize * overlayScale)}px`,
                  color,
                }}
              />
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="drawing-undo"
              className={BTN(false)}
              disabled={!canUndo}
              onClick={doUndo}
            >
              撤销
            </button>
            <button
              type="button"
              data-testid="drawing-redo"
              className={BTN(false)}
              disabled={!canRedo}
              onClick={doRedo}
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
              data-testid="drawing-fullscreen"
              className={BTN(false)}
              onClick={toggleFullscreen}
              title="全屏 / 退出全屏（Esc）"
            >
              {isFullscreen ? '退出全屏' : '全屏'}
            </button>
            <button
              type="button"
              data-testid="drawing-export"
              className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90"
              onClick={exportPng}
            >
              导出 PNG
            </button>
            <button
              type="button"
              data-testid="drawing-export-jpg"
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-brand dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              onClick={exportJpg}
            >
              导出 JPG
            </button>
          </div>
        </div>
      )}
      toText={(_input) => `在线画图 ${canvasSize.w}x${canvasSize.h}，共 ${strokes} 笔`}
      downloadExt="txt"
    />
  )
}
