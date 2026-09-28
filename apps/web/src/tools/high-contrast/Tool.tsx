import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { HighContrastInput, HighContrastOptions } from './schema'
import {
  HIGH_CONTRAST_MODES,
  buildContrastReport,
  generateHighContrastCss,
  type HighContrastMode,
} from './utils'

function toText(v: string): string {
  return v
}

export default function Tool() {
  const [background, setBackground] = useState('#000000')
  const [foreground, setForeground] = useState('#ffffff')
  const [linkColor, setLinkColor] = useState('#ffff00')
  const [mode, setMode] = useState<HighContrastMode>('dark')

  function computed(): { css: string; report: string; error: string } {
    try {
      const params = { background, foreground, linkColor, mode }
      return {
        css: generateHighContrastCss(params),
        report: buildContrastReport(params),
        error: '',
      }
    } catch (err) {
      return { css: '', report: '', error: err instanceof Error ? err.message : '参数错误' }
    }
  }

  const c = computed()

  return (
    <MultiPanel<HighContrastInput, HighContrastOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={{ text: '' }}
      renderOutput={() => (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2 rounded border border-slate-200 p-2 dark:border-slate-700">
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">背景颜色</span>
              <input
                type="text"
                data-testid="background"
                className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">前景颜色</span>
              <input
                type="text"
                data-testid="foreground"
                className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                value={foreground}
                onChange={(e) => setForeground(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">链接颜色</span>
              <input
                type="text"
                data-testid="link-color"
                className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                value={linkColor}
                onChange={(e) => setLinkColor(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">主题模式</span>
              <select
                data-testid="mode"
                className="w-full rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                value={mode}
                onChange={(e) => setMode(e.target.value as HighContrastMode)}
              >
                {HIGH_CONTRAST_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
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
                data-testid="contrast-report"
                className="whitespace-pre-wrap rounded border border-slate-200 p-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300"
              >
                {c.report}
              </div>
              <div
                data-testid="theme-preview"
                className="hc-theme rounded border border-slate-200 p-4 dark:border-slate-700"
                style={{ backgroundColor: toText(background), color: toText(foreground) }}
              >
                <style>{c.css}</style>
                <div className="mb-1 text-sm font-medium">主题预览</div>
                <p className="text-sm">这是正文文字的显示效果。</p>
                <a
                  href="#preview"
                  onClick={(e) => e.preventDefault()}
                  style={{ color: toText(linkColor), textDecoration: 'underline' }}
                >
                  这是链接文字
                </a>
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
            </>
          )}
        </div>
      )}
      toText={() => {
        const c2 = computed()
        if (c2.error) return ''
        return [`/* ${c2.report.replace(/\n/g, '；')} */`, c2.css].join('\n')
      }}
      downloadExt="css"
    />
  )
}
