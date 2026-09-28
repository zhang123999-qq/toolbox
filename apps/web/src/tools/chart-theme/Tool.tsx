import { useEffect, useRef, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import {
  EXAMPLE_PALETTE,
  EXAMPLE_TITLE,
  buildPreviewOption,
  resolveTheme,
} from './utils'
import type { ChartThemeInput, ChartThemeOptions } from './schema'

/** 示例：默认主题四要素 + 预览标题 */
const EXAMPLE: ChartThemeInput = { text: EXAMPLE_TITLE }

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

interface ChartInstance {
  dispose: () => void
  setOption: (option: unknown, notMerge?: boolean) => void
}

/** 由输入与选项组装主题；任一校验失败即抛中文错（实现见 utils.resolveTheme） */
function resolveThemeForRender(input: ChartThemeInput, options: ChartThemeOptions) {
  return resolveTheme({
    title: input.text,
    background: options.background,
    palette: options.palette,
    fontFamily: options.fontFamily,
    titleSize: options.titleSize,
  })
}

export default function Tool() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<ChartInstance | null>(null)
  // render 阶段计算主题 + 预览 option，effect 阶段喂给 echarts
  const pendingRender = useRef<{ theme: Record<string, unknown>; option: Record<string, unknown> } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function draw() {
      if (!containerRef.current) return
      try {
        // 动态导入 echarts：独立分包，避免拖慢主 chunk
        const echarts = await import('echarts')
        if (cancelled) return
        const pending = pendingRender.current
        if (!pending) return
        if (chartRef.current) {
          chartRef.current.dispose()
          chartRef.current = null
        }
        // 主题对象直接作为第二参数传入 init
        chartRef.current = (
          echarts as unknown as {
            init: (el: HTMLElement, theme: unknown) => ChartInstance
          }
        ).init(containerRef.current, pending.theme)
        chartRef.current.setOption(pending.option, true)
        setError(null)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    }
    draw()
    return () => {
      cancelled = true
      if (chartRef.current) {
        chartRef.current.dispose()
        chartRef.current = null
      }
    }
  })

  const optionDefs: readonly OptionDef<ChartThemeOptions>[] = [
    { key: 'background', label: '背景色', kind: 'text', placeholder: '#ffffff' },
    { key: 'palette', label: '主色板（逗号分隔）', kind: 'text', placeholder: EXAMPLE_PALETTE },
    { key: 'fontFamily', label: '字体', kind: 'text', placeholder: 'sans-serif' },
    { key: 'titleSize', label: '标题字号', kind: 'text', placeholder: '18' },
  ]

  function renderOutput(input: ChartThemeInput, options: ChartThemeOptions) {
    try {
      const { theme, title } = resolveThemeForRender(input, options)
      const option = buildPreviewOption(theme, title)
      pendingRender.current = { theme, option }
      return (
        <div>
          <div ref={containerRef} data-testid="chart-container" style={{ width: '600px', height: '360px' }} />
          <pre data-testid="theme-json" className="mt-2 overflow-auto rounded bg-gray-100 p-2 text-xs dark:bg-gray-800">
            {JSON.stringify(theme, null, 2)}
          </pre>
          {error ? (
            <p role="alert" className={ERROR_CLASS}>
              {error}
            </p>
          ) : null}
        </div>
      )
    } catch (e) {
      pendingRender.current = null
      return (
        <p role="alert" className={ERROR_CLASS}>
          {e instanceof Error ? e.message : String(e)}
        </p>
      )
    }
  }

  return (
    <MultiPanel<ChartThemeInput, ChartThemeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ background: '', palette: '', fontFamily: '', titleSize: '' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      renderOutput={renderOutput}
      toText={(input, options) => {
        try {
          const { theme } = resolveThemeForRender(input, options)
          return JSON.stringify(theme, null, 2)
        } catch {
          return ''
        }
      }}
      downloadExt="json"
    />
  )
}
