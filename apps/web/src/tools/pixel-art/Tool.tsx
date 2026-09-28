import { useEffect, useRef, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { PixelArtToolInput } from './schema'
import {
  PALETTE,
  applyStroke,
  canvasToAscii,
  createCanvas,
  exportPngData,
  fill,
  mirrorH,
  mirrorV,
  usedColors,
} from './utils'
import type { PixelCanvas } from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'
const INPUT_CLS =
  'w-20 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800'

type ToolMode = 'brush' | 'line' | 'fill'

export default function Tool() {
  const [canvas, setCanvas] = useState<PixelCanvas>(() => createCanvas(16))
  const [color, setColor] = useState('#000000')
  const [mode, setMode] = useState<ToolMode>('brush')
  const [size, setSize] = useState('16')
  const [error, setError] = useState('')
  const [history, setHistory] = useState<PixelCanvas[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lineStart = useRef<[number, number] | null>(null)
  const drawing = useRef(false)

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    el.width = canvas.size
    el.height = canvas.size
    const ctx = el.getContext('2d')
    if (!ctx) return
    const img = ctx.createImageData(canvas.size, canvas.size)
    for (let i = 0; i < canvas.pixels.length; i += 1) {
      const hex = canvas.pixels[i]
      img.data[i * 4] = Number.parseInt(hex.slice(1, 3), 16)
      img.data[i * 4 + 1] = Number.parseInt(hex.slice(3, 5), 16)
      img.data[i * 4 + 2] = Number.parseInt(hex.slice(5, 7), 16)
      img.data[i * 4 + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
  }, [canvas])

  function pushHistory(c: PixelCanvas): void {
    setHistory((h) => [...h.slice(-49), c])
  }

  function toXY(e: React.MouseEvent<HTMLCanvasElement>): [number, number] {
    const el = canvasRef.current as HTMLCanvasElement
    const rect = el.getBoundingClientRect()
    return [
      Math.floor(((e.clientX - rect.left) / rect.width) * canvas.size),
      Math.floor(((e.clientY - rect.top) / rect.height) * canvas.size),
    ]
  }

  function handleDown(e: React.MouseEvent<HTMLCanvasElement>): void {
    const [x, y] = toXY(e)
    setError('')
    try {
      if (mode === 'fill') {
        pushHistory(canvas)
        setCanvas((c) => fill(c, x, y, color))
      } else if (mode === 'line') {
        lineStart.current = [x, y]
      } else {
        drawing.current = true
        pushHistory(canvas)
        setCanvas((c) => applyStroke(c, x, y, x, y, color))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  function handleMove(e: React.MouseEvent<HTMLCanvasElement>): void {
    if (!drawing.current || mode !== 'brush') return
    const [x, y] = toXY(e)
    setCanvas((c) => applyStroke(c, x, y, x, y, color))
  }

  function handleUp(e: React.MouseEvent<HTMLCanvasElement>): void {
    if (mode === 'line' && lineStart.current) {
      const [x, y] = toXY(e)
      const [sx, sy] = lineStart.current
      pushHistory(canvas)
      setCanvas((c) => applyStroke(c, sx, sy, x, y, color))
      lineStart.current = null
    }
    drawing.current = false
  }

  function handleUndo(): void {
    setHistory((h) => {
      if (h.length === 0) return h
      setCanvas(h[h.length - 1])
      return h.slice(0, -1)
    })
  }

  function handleNew(): void {
    setError('')
    try {
      const s = Number.parseInt(size, 10)
      setHistory([])
      setCanvas(createCanvas(s))
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  function handleExport(): void {
    setError('')
    try {
      const url = exportPngData(
        canvas,
        {
          create: (w: number, h: number) => {
            const el = document.createElement('canvas')
            el.width = w
            el.height = h
            const ctx = el.getContext('2d')
            if (!ctx) throw new Error('无法创建画布')
            return {
              ctx: {
                set fillStyle(v: string) {
                  ctx.fillStyle = v
                },
                get fillStyle(): string {
                  return String(ctx.fillStyle)
                },
                fillRect: (x: number, y: number, ww: number, hh: number): void => {
                  ctx.fillRect(x, y, ww, hh)
                },
              },
              toDataURL: () => el.toDataURL('image/png'),
            }
          },
        },
        8,
      )
      const a = document.createElement('a')
      a.href = url
      a.download = `pixel-art-${canvas.size}x${canvas.size}.png`
      a.click()
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  return (
    <MultiPanel<PixelArtToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={{ text: '' }}
      renderOutput={(_input) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-slate-500">
              尺寸{' '}
              <input
                data-testid="pixelart-size"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className={INPUT_CLS}
              />
            </label>
            <button
              type="button"
              data-testid="pixelart-new"
              onClick={handleNew}
              className={BTN_CLS}
            >
              新建
            </button>
            {(['brush', 'line', 'fill'] as ToolMode[]).map((m) => (
              <button
                key={m}
                type="button"
                data-testid={`pixelart-mode-${m}`}
                onClick={() => setMode(m)}
                className={
                  m === mode
                    ? BTN_CLS
                    : 'rounded border border-slate-300 px-4 py-1.5 text-sm dark:border-slate-600'
                }
              >
                {m === 'brush' ? '画笔' : m === 'line' ? '直线' : '填充'}
              </button>
            ))}
            <input
              type="color"
              data-testid="pixelart-color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-8 w-12"
            />
            <div className="flex gap-1">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  data-testid={`pixelart-swatch-${c.slice(1)}`}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className="h-6 w-6 rounded border border-slate-300"
                  aria-label={c}
                />
              ))}
            </div>
            <button
              type="button"
              data-testid="pixelart-mirrorh"
              onClick={() => {
                pushHistory(canvas)
                setCanvas((c) => mirrorH(c))
              }}
              className={BTN_CLS}
            >
              水平镜像
            </button>
            <button
              type="button"
              data-testid="pixelart-mirrorv"
              onClick={() => {
                pushHistory(canvas)
                setCanvas((c) => mirrorV(c))
              }}
              className={BTN_CLS}
            >
              垂直镜像
            </button>
            <button
              type="button"
              data-testid="pixelart-undo"
              onClick={handleUndo}
              disabled={history.length === 0}
              className={BTN_CLS}
            >
              撤销
            </button>
            <button
              type="button"
              data-testid="pixelart-export"
              onClick={handleExport}
              className={BTN_CLS}
            >
              导出 PNG
            </button>
          </div>
          <canvas
            ref={canvasRef}
            data-testid="pixelart-canvas"
            onMouseDown={handleDown}
            onMouseMove={handleMove}
            onMouseUp={handleUp}
            className="cursor-crosshair rounded border border-slate-300 dark:border-slate-600"
            style={{ width: 320, height: 320, imageRendering: 'pixelated' }}
          />
          {error !== '' && (
            <p data-testid="pixelart-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <pre data-testid="pixelart-output" className={PRE_CLS}>
            {`${canvas.size}×${canvas.size}，使用颜色 ${usedColors(canvas).length} 种\n${canvasToAscii(canvas)}`}
          </pre>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：在画布上拖动绘制；画笔/直线/填充三种模式；支持撤销（保留 50 步）。
            纯本地处理，不发送网络请求。
          </p>
        </div>
      )}
      toText={() => canvasToAscii(canvas)}
    />
  )
}
