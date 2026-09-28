import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { FontSizeInput, FontSizeOptions } from './schema'
import { assessReadability, generateFluidType, pxToRem, remToPx } from './utils'

function toNum(v: string): number {
  return v.trim() === '' ? NaN : Number(v)
}

function NumField({
  label,
  testId,
  value,
  onChange,
  hint,
}: {
  label: string
  testId: string
  value: string
  onChange: (v: string) => void
  hint?: string
}) {
  return (
    <label className="flex items-center gap-1 text-sm">
      <span className="w-20 shrink-0 text-slate-600 dark:text-slate-400">{label}</span>
      <input
        type="number"
        data-testid={testId}
        className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={hint ?? label}
      />
    </label>
  )
}

export default function Tool() {
  const [minPx, setMinPx] = useState('16')
  const [maxPx, setMaxPx] = useState('24')
  const [minVw, setMinVw] = useState('320')
  const [maxVw, setMaxVw] = useState('1200')
  const [fsPx, setFsPx] = useState('16')
  const [lineChars, setLineChars] = useState('60')
  const [lineHeight, setLineHeight] = useState('1.6')
  const [convValue, setConvValue] = useState('16')
  const [convDir, setConvDir] = useState<'px2rem' | 'rem2px'>('px2rem')

  function fluid(): { css: string; error: string } {
    try {
      return {
        css: generateFluidType({ minPx: toNum(minPx), maxPx: toNum(maxPx), minVw: toNum(minVw), maxVw: toNum(maxVw) }),
        error: '',
      }
    } catch (err) {
      return { css: '', error: err instanceof Error ? err.message : '参数错误' }
    }
  }

  function readability(): { score: number; issues: readonly string[]; suggestions: readonly string[]; error: string } {
    try {
      const r = assessReadability({
        fontSizePx: toNum(fsPx),
        lineLengthChars: toNum(lineChars),
        lineHeight: toNum(lineHeight),
      })
      return { ...r, error: '' }
    } catch (err) {
      return { score: 0, issues: [], suggestions: [], error: err instanceof Error ? err.message : '参数错误' }
    }
  }

  function converted(): { text: string; error: string } {
    try {
      const v = toNum(convValue)
      const r = convDir === 'px2rem' ? pxToRem(v) : remToPx(v)
      return { text: `${convValue}${convDir === 'px2rem' ? 'px' : 'rem'} = ${r.css}`, error: '' }
    } catch (err) {
      return { text: '', error: err instanceof Error ? err.message : '参数错误' }
    }
  }

  const f = fluid()
  const r = readability()
  const cv = converted()

  return (
    <MultiPanel<FontSizeInput, FontSizeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={{ text: '' }}
      renderOutput={() => (
        <div className="flex flex-col gap-4">
          <section>
            <div className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">流式字号生成</div>
            <div className="grid grid-cols-2 gap-2 rounded border border-slate-200 p-2 dark:border-slate-700">
              <NumField label="最小字号 px" testId="min-px" value={minPx} onChange={setMinPx} />
              <NumField label="最大字号 px" testId="max-px" value={maxPx} onChange={setMaxPx} />
              <NumField label="最小视口 px" testId="min-vw" value={minVw} onChange={setMinVw} />
              <NumField label="最大视口 px" testId="max-vw" value={maxVw} onChange={setMaxVw} />
            </div>
            {f.error ? (
              <div role="alert" data-testid="fluid-error" className="mt-1 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                {f.error}
              </div>
            ) : (
              <pre data-testid="fluid-output" className="mt-1 whitespace-pre-wrap rounded bg-slate-100 p-2 font-mono text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                {f.css}
              </pre>
            )}
          </section>
          <section>
            <div className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">可读性评估</div>
            <div className="grid grid-cols-3 gap-2 rounded border border-slate-200 p-2 dark:border-slate-700">
              <NumField label="字号 px" testId="fs-px" value={fsPx} onChange={setFsPx} />
              <NumField label="行宽 字符" testId="line-chars" value={lineChars} onChange={setLineChars} />
              <NumField label="行高" testId="line-height" value={lineHeight} onChange={setLineHeight} />
            </div>
            {r.error ? (
              <div role="alert" data-testid="readability-error" className="mt-1 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                {r.error}
              </div>
            ) : (
              <div data-testid="readability-result" className="mt-1 rounded border border-slate-200 p-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-300">
                <div className="font-medium">可读性评分：{r.score} / 100</div>
                {r.issues.map((issue, i) => (
                  <div key={i} className="text-amber-700 dark:text-amber-300">问题：{issue}</div>
                ))}
                {r.suggestions.map((s, i) => (
                  <div key={i} className="text-slate-500 dark:text-slate-400">建议：{s}</div>
                ))}
                {r.issues.length === 0 && <div className="text-green-700 dark:text-green-300">各项指标均在舒适区间</div>}
              </div>
            )}
          </section>
          <section>
            <div className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">px / rem 换算（根字号 16px）</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                data-testid="conv-value"
                className="w-32 rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                value={convValue}
                onChange={(e) => setConvValue(e.target.value)}
              />
              <select
                data-testid="conv-dir"
                className="rounded border border-slate-300 px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900"
                value={convDir}
                onChange={(e) => setConvDir(e.target.value as 'px2rem' | 'rem2px')}
              >
                <option value="px2rem">px → rem</option>
                <option value="rem2px">rem → px</option>
              </select>
              {cv.error ? (
                <span data-testid="conv-error" className="text-sm text-red-700 dark:text-red-300">{cv.error}</span>
              ) : (
                <span data-testid="conv-result" className="font-mono text-sm text-slate-700 dark:text-slate-300">{cv.text}</span>
              )}
            </div>
          </section>
        </div>
      )}
      toText={() => (f.error ? '' : f.css)}
      downloadExt="css"
    />
  )
}
