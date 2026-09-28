import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { ReducedMotionInput, ReducedMotionOptions } from './schema'
import {
  detectAnimations,
  generateReducedMotionCss,
  summarizeFindings,
  type AnimationFinding,
} from './utils'

const EXAMPLE_CSS = `.btn {
  animation: pulse 2s ease-in-out infinite;
  transition: background-color 0.3s;
}

@keyframes pulse {
  50% { opacity: 0.5; }
}`

function CheckRow({
  label,
  testId,
  checked,
  onChange,
}: {
  label: string
  testId: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
      <input
        type="checkbox"
        data-testid={testId}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4"
      />
      {label}
    </label>
  )
}

export default function Tool() {
  const [disableAnimations, setDisableAnimations] = useState(true)
  const [disableTransitions, setDisableTransitions] = useState(true)
  const [disableSmoothScroll, setDisableSmoothScroll] = useState(true)
  const [extraSelectors, setExtraSelectors] = useState('')

  function generatedCss(): { css: string; error: string } {
    try {
      return {
        css: generateReducedMotionCss({
          disableAnimations,
          disableTransitions,
          disableSmoothScroll,
          extraSelectors,
        }),
        error: '',
      }
    } catch (err) {
      return { css: '', error: err instanceof Error ? err.message : '参数错误' }
    }
  }

  function findings(text: string): { list: AnimationFinding[]; summary: string; error: string } {
    if (text.trim() === '') return { list: [], summary: '', error: '' }
    try {
      const list = detectAnimations(text)
      return { list, summary: summarizeFindings(list), error: '' }
    } catch (err) {
      return { list: [], summary: '', error: err instanceof Error ? err.message : '解析错误' }
    }
  }

  const g = generatedCss()

  return (
    <MultiPanel<ReducedMotionInput, ReducedMotionOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={{ text: EXAMPLE_CSS }}
      renderOutput={(input) => {
        const f = findings(input.text)
        return (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 rounded border border-slate-200 p-2 dark:border-slate-700">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">生成选项</div>
              <CheckRow label="关闭 animation 动画" testId="opt-animations" checked={disableAnimations} onChange={setDisableAnimations} />
              <CheckRow label="关闭 transition 过渡" testId="opt-transitions" checked={disableTransitions} onChange={setDisableTransitions} />
              <CheckRow label="关闭平滑滚动" testId="opt-scroll" checked={disableSmoothScroll} onChange={setDisableSmoothScroll} />
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <span className="shrink-0">额外选择器</span>
                <input
                  type="text"
                  data-testid="extra-selectors"
                  placeholder=".carousel, #hero（逗号分隔，可空）"
                  className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                  value={extraSelectors}
                  onChange={(e) => setExtraSelectors(e.target.value)}
                />
              </label>
            </div>
            {g.error ? (
              <div role="alert" data-testid="gen-error" className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                {g.error}
              </div>
            ) : (
              <div>
                <div className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">生成的 CSS</div>
                <pre data-testid="css-output" className="whitespace-pre-wrap rounded bg-slate-100 p-2 font-mono text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                  {g.css}
                </pre>
              </div>
            )}
            <div>
              <div className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                动画声明检测（扫描上方输入框的 CSS）
              </div>
              {f.error ? (
                <div role="alert" data-testid="scan-error" className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                  {f.error}
                </div>
              ) : input.text.trim() === '' ? (
                <div data-testid="scan-empty" className="text-sm text-slate-500 dark:text-slate-400">
                  在上方输入框粘贴 CSS 后自动扫描 animation / transition / @keyframes 声明
                </div>
              ) : (
                <>
                  <div data-testid="scan-summary" className="mb-1 text-sm text-slate-700 dark:text-slate-300">
                    {f.summary}
                  </div>
                  {f.list.length > 0 && (
                    <ul data-testid="scan-list" className="flex flex-col gap-1">
                      {f.list.map((item, i) => (
                        <li key={i} className="rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          第 {item.line} 行 [{item.kind}] {item.detail}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>
        )
      }}
      toText={(input) => {
        const g2 = generatedCss()
        const f2 = findings(input.text)
        const parts: string[] = []
        if (g2.css) parts.push(g2.css)
        if (f2.summary) parts.push('', f2.summary)
        return parts.join('\n')
      }}
      downloadExt="css"
    />
  )
}
