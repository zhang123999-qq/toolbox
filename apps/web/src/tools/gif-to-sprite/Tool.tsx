import { useRef, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { GifToSpriteToolInput } from './schema'
import { decodeGifFrames, layoutSpriteSheet, sheetPngData } from './utils'
import type { DecodedGifFrame, SheetLayout } from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'
const INPUT_CLS =
  'w-20 rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800'

export default function Tool() {
  const [frames, setFrames] = useState<DecodedGifFrame[]>([])
  const [cols, setCols] = useState('4')
  const [layout, setLayout] = useState<SheetLayout | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  async function handleFile(file: File): Promise<void> {
    setError('')
    setBusy(true)
    try {
      const buffer = await file.arrayBuffer()
      const decoded = await decodeGifFrames(buffer)
      setFrames(decoded)
      setLayout(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '解码失败')
    } finally {
      setBusy(false)
    }
  }

  function handleLayout(): void {
    setError('')
    try {
      const c = Number.parseInt(cols, 10)
      const l = layoutSpriteSheet(
        frames.map((f) => ({ width: f.width, height: f.height })),
        c,
      )
      setLayout(l)
      const el = canvasRef.current
      if (el) {
        el.width = l.sheetW
        el.height = l.sheetH
        const ctx = el.getContext('2d')
        if (ctx) {
          l.cells.forEach((cell, i) => {
            const f = frames[i]
            if (f) ctx.drawImage(f.bitmap as ImageBitmap, cell.x, cell.y, cell.w, cell.h)
          })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '布局失败')
    }
  }

  function handleExport(): void {
    setError('')
    try {
      if (!layout) throw new Error('请先生成布局')
      const url = sheetPngData(frames, layout, {
        create: (w: number, h: number) => {
          const el = document.createElement('canvas')
          el.width = w
          el.height = h
          const ctx = el.getContext('2d')
          if (!ctx) throw new Error('无法创建画布')
          return {
            ctx: {
              drawImage: (b: unknown, x: number, y: number, ww: number, hh: number): void => {
                ctx.drawImage(b as ImageBitmap, x, y, ww, hh)
              },
            },
            toDataURL: () => el.toDataURL('image/png'),
          }
        },
      })
      const a = document.createElement('a')
      a.href = url
      a.download = 'sprite-sheet.png'
      a.click()
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败')
    }
  }

  const info =
    frames.length === 0
      ? '请选择 GIF 文件。'
      : `共 ${frames.length} 帧；` +
        frames.map((f, i) => `#${i} ${f.width}×${f.height} ${f.durationMs}ms`).join('；') +
        (layout ? `\n布局：${layout.cols} 列 × ${layout.rows} 行，雪碧图 ${layout.sheetW}×${layout.sheetH}` : '')

  return (
    <MultiPanel<GifToSpriteToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={{ text: '' }}
      renderOutput={(_input) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/gif"
              data-testid="giftosprite-file"
              className="text-sm"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleFile(f)
              }}
            />
            <label className="text-xs text-slate-500">
              列数 <input data-testid="giftosprite-cols" value={cols} onChange={(e) => setCols(e.target.value)} className={INPUT_CLS} />
            </label>
            <button type="button" data-testid="giftosprite-layout" onClick={handleLayout} disabled={frames.length === 0 || busy} className={BTN_CLS}>
              生成雪碧图
            </button>
            <button type="button" data-testid="giftosprite-export" onClick={handleExport} disabled={!layout} className={BTN_CLS}>
              导出 PNG
            </button>
          </div>
          {error !== '' && (
            <p data-testid="giftosprite-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <canvas
            ref={canvasRef}
            data-testid="giftosprite-canvas"
            className="max-w-full rounded border border-slate-300 dark:border-slate-600"
            style={{ imageRendering: 'pixelated' }}
          />
          <pre data-testid="giftosprite-output" className={PRE_CLS}>
            {info}
          </pre>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：使用浏览器 WebCodecs ImageDecoder 逐帧解码（需要 Chrome/Edge 94+、Safari 18.4+ 或 Firefox 130+）；
            单元格取各帧最大宽高，每帧左上角对齐。纯本地处理，不发送网络请求。
          </p>
        </div>
      )}
      toText={() => info}
    />
  )
}
