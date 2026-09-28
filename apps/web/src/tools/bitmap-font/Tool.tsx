import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { BitmapFontToolInput } from './schema'
import { exportBitmapFont, rasterizeText } from './utils'
import type { BitmapChar, RasterCanvasFactory } from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const PRE_CLS =
  'max-h-80 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'
const INPUT_CLS =
  'rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800'

function realFactory(): RasterCanvasFactory {
  return {
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
          set font(v: string) {
            ctx.font = v
          },
          get font(): string {
            return ctx.font
          },
          set textBaseline(v: string) {
            ctx.textBaseline = v as CanvasTextBaseline
          },
          get textBaseline(): string {
            return ctx.textBaseline
          },
          fillRect: (x: number, y: number, ww: number, hh: number): void => {
            ctx.fillRect(x, y, ww, hh)
          },
          fillText: (t: string, x: number, y: number): void => {
            ctx.fillText(t, x, y)
          },
          getImageData: (x: number, y: number, ww: number, hh: number) => {
            const d = ctx.getImageData(x, y, ww, hh)
            return { data: d.data, width: d.width, height: d.height }
          },
        },
      }
    },
  }
}

function CharPreview({ c }: { c: BitmapChar }): React.ReactElement {
  if (c.w === 0 || c.h === 0) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="flex h-8 items-center justify-center rounded border border-slate-300 text-xs text-slate-400 dark:border-slate-600">
          空白
        </div>
        <span className="font-mono text-xs">'{c.char}'</span>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="grid rounded border border-slate-300 dark:border-slate-600"
        style={{ gridTemplateColumns: `repeat(${c.w}, 6px)` }}
      >
        {c.bitmap.flatMap((row, y) =>
          row.map((v, x) => (
            <div
              key={`${y}-${x}`}
              style={{ width: 6, height: 6, backgroundColor: v === 1 ? '#0f172a' : '#ffffff' }}
            />
          )),
        )}
      </div>
      <span className="font-mono text-xs">
        '{c.char}' {c.w}×{c.h}
      </span>
    </div>
  )
}

export default function Tool() {
  const [text, setText] = useState('ABC')
  const [font, setFont] = useState('monospace')
  const [size, setSize] = useState('16')
  const [format, setFormat] = useState<'json' | 'c'>('json')
  const [chars, setChars] = useState<BitmapChar[]>([])
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function handleRun(): void {
    setError('')
    setDone(false)
    try {
      const s = Number.parseInt(size, 10)
      setChars(rasterizeText({ text, font, size: s }, realFactory()))
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  function handleDownload(): void {
    setError('')
    try {
      const out = exportBitmapFont(chars, format)
      const blob = new Blob([out], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bitmap-font.${format === 'json' ? 'json' : 'h'}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : '下载失败')
    }
  }

  const output = done ? exportBitmapFont(chars, format) : ''

  return (
    <MultiPanel<BitmapFontToolInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: 'ABC' }}
      initialOptions={{}}
      example={{ text: 'ABC' }}
      renderOutput={(_input) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-slate-500">
              文本{' '}
              <input
                data-testid="bitmapfont-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className={`${INPUT_CLS} w-40`}
              />
            </label>
            <label className="text-xs text-slate-500">
              字体{' '}
              <select
                data-testid="bitmapfont-font"
                value={font}
                onChange={(e) => setFont(e.target.value)}
                className={INPUT_CLS}
              >
                <option value="monospace">等宽</option>
                <option value="serif">衬线</option>
                <option value="sans-serif">无衬线</option>
              </select>
            </label>
            <label className="text-xs text-slate-500">
              字号{' '}
              <input
                data-testid="bitmapfont-size"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className={`${INPUT_CLS} w-20`}
              />
            </label>
            <button
              type="button"
              data-testid="bitmapfont-run"
              onClick={handleRun}
              className={BTN_CLS}
            >
              生成位图
            </button>
            <label className="text-xs text-slate-500">
              导出格式{' '}
              <select
                data-testid="bitmapfont-format"
                value={format}
                onChange={(e) => setFormat(e.target.value as 'json' | 'c')}
                className={INPUT_CLS}
              >
                <option value="json">JSON</option>
                <option value="c">C 数组</option>
              </select>
            </label>
            <button
              type="button"
              data-testid="bitmapfont-download"
              onClick={handleDownload}
              disabled={!done}
              className={BTN_CLS}
            >
              下载
            </button>
          </div>
          {error !== '' && (
            <p data-testid="bitmapfont-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {done && (
            <div data-testid="bitmapfont-preview" className="flex flex-wrap gap-3">
              {chars.map((c) => (
                <CharPreview key={c.char} c={c} />
              ))}
            </div>
          )}
          <pre data-testid="bitmapfont-output" className={PRE_CLS}>
            {output === '' ? '点击「生成位图」后显示导出数据。' : output}
          </pre>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：逐字光栅化为位图（自动裁剪空白边，重复字符去重），导出 JSON 或 C
            数组供游戏引擎使用。 纯本地处理，不发送网络请求。
          </p>
        </div>
      )}
      toText={() => output}
    />
  )
}
