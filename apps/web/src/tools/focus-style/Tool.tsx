import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { FocusStyleInput, FocusStyleOptions } from './schema'
import {
  DEFAULT_BG,
  DEFAULT_COLOR,
  DEFAULT_OFFSET,
  DEFAULT_RADIUS,
  DEFAULT_WIDTH,
  OUTLINE_STYLES,
  buildCssWithComment,
  checkFocusContrast,
  generateFocusStyle,
  type OutlineStyle,
} from './utils'

/** 预览区作用域选择器，避免污染工具页面其他元素 */
const PREVIEW_SELECTOR = '.focus-preview :focus-visible'

function toNum(v: string): number {
  return v.trim() === '' ? NaN : Number(v)
}

export default function Tool() {
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [width, setWidth] = useState(String(DEFAULT_WIDTH))
  const [offset, setOffset] = useState(String(DEFAULT_OFFSET))
  const [radius, setRadius] = useState(String(DEFAULT_RADIUS))
  const [outlineStyle, setOutlineStyle] = useState<OutlineStyle>('solid')
  const [bg, setBg] = useState(DEFAULT_BG)

  function computed(): { css: string; contrast: string; error: string } {
    try {
      const params = {
        color,
        width: toNum(width),
        offset: toNum(offset),
        radius: toNum(radius),
        outlineStyle,
      }
      const css = generateFocusStyle(params)
      const { ratio, pass } = checkFocusContrast(color, bg)
      return {
        css,
        contrast: `对比度 ${ratio.toFixed(2)}:1（WCAG 非文本要求 ≥ 3:1）：${pass ? '通过 ✓' : '未通过，建议加深焦点颜色'}`,
        error: '',
      }
    } catch (err) {
      return { css: '', contrast: '', error: err instanceof Error ? err.message : '参数错误' }
    }
  }

  const c = computed()

  return (
    <MultiPanel<FocusStyleInput, FocusStyleOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={{ text: '' }}
      renderOutput={() => (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2 rounded border border-slate-200 p-2 dark:border-slate-700">
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">焦点颜色</span>
              <input
                type="text"
                data-testid="color"
                className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">背景颜色</span>
              <input
                type="text"
                data-testid="bg"
                className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">描边宽度</span>
              <input
                type="number"
                data-testid="width"
                className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">描边偏移</span>
              <input
                type="number"
                data-testid="offset"
                className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                value={offset}
                onChange={(e) => setOffset(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">圆角</span>
              <input
                type="number"
                data-testid="radius"
                className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">描边样式</span>
              <select
                data-testid="outline-style"
                className="w-full rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                value={outlineStyle}
                onChange={(e) => setOutlineStyle(e.target.value as OutlineStyle)}
              >
                {OUTLINE_STYLES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {c.error ? (
            <div
              role="alert"
              data-testid="param-error"
              className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            >
              {c.error}
            </div>
          ) : (
            <>
              <div
                data-testid="contrast-result"
                className="rounded border border-slate-200 p-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300"
              >
                {c.contrast}
              </div>
              <div>
                <div className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                  生成的 CSS
                </div>
                <pre
                  data-testid="css-output"
                  className="whitespace-pre-wrap rounded bg-slate-100 p-2 font-mono text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                >
                  {c.css}
                </pre>
              </div>
              <div
                className="focus-preview rounded border border-slate-200 p-4 dark:border-slate-700"
                style={{ backgroundColor: bg }}
              >
                <div className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  实时预览（按 Tab 聚焦下面的控件查看效果）
                </div>
                <style>{generateFocusStyle(
                  {
                    color,
                    width: toNum(width),
                    offset: toNum(offset),
                    radius: toNum(radius),
                    outlineStyle,
                  },
                  PREVIEW_SELECTOR,
                )}</style>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    data-testid="demo-button"
                    className="rounded bg-brand px-3 py-1.5 text-sm text-white"
                  >
                    示例按钮
                  </button>
                  <a data-testid="demo-link" href="#demo" onClick={(e) => e.preventDefault()}>
                    示例链接
                  </a>
                  <input
                    data-testid="demo-input"
                    type="text"
                    placeholder="示例输入框"
                    className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}
      toText={() => {
        try {
          return buildCssWithComment(
            {
              color,
              width: toNum(width),
              offset: toNum(offset),
              radius: toNum(radius),
              outlineStyle,
            },
            bg,
          )
        } catch {
          return ''
        }
      }}
      downloadExt="css"
    />
  )
}
