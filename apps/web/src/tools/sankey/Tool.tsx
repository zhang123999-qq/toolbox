import { useEffect, useRef, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import {
  buildSankeyOption,
  EXAMPLE_DATA,
  parseSankeyData,
  parseSize,
  parseTitle,
  transform,
} from './utils'
import type { SankeyInput, SankeyOptions } from './schema'

/** 示例：示例桑基图数据 */
const EXAMPLE: SankeyInput = { text: EXAMPLE_DATA }

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'
const BTN_CLASS =
  'rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'

interface ChartInstance {
  dispose: () => void
  setOption: (option: unknown, notMerge?: boolean) => void
  getDataURL: (o?: Record<string, unknown>) => string
}

export default function Tool() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<ChartInstance | null>(null)
  // render 阶段计算 option，effect 阶段喂给 echarts
  const pendingOption = useRef<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function draw() {
      if (!containerRef.current) return
      try {
        // 动态导入 echarts：独立分包，避免拖慢主 chunk
        const echarts = await import('echarts')
        if (cancelled) return
        const option = pendingOption.current
        if (!option) return
        if (!chartRef.current) {
          chartRef.current = echarts.init(containerRef.current) as unknown as ChartInstance
        }
        chartRef.current.setOption(option, true)
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

  const optionDefs: readonly OptionDef<SankeyOptions>[] = [
    { key: 'title', label: '标题', kind: 'text', placeholder: '留空无标题' },
    { key: 'width', label: '宽度', kind: 'text', placeholder: '600' },
    { key: 'height', label: '高度', kind: 'text', placeholder: '400' },
  ]

  function downloadPng() {
    try {
      const chart = chartRef.current
      if (!chart) {
        setError('图表尚未渲染，无法导出 PNG')
        return
      }
      const url = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
      const a = document.createElement('a')
      a.href = url
      a.download = 'sankey.png'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function renderOutput(input: SankeyInput, options: SankeyOptions) {
    try {
      const title = parseTitle(options.title)
      const width = parseSize(options.width, '宽度', 600)
      const height = parseSize(options.height, '高度', 400)
      const data = transform(input, options)
      const option = buildSankeyOption(parseSankeyData(data), title)
      pendingOption.current = option
      return (
        <div>
          <div
            ref={containerRef}
            data-testid="chart-container"
            style={{ width: `${width}px`, height: `${height}px` }}
          />
          <button
            type="button"
            data-testid="download-png"
            className={BTN_CLASS}
            onClick={downloadPng}
          >
            下载 PNG
          </button>
          {error ? (
            <p role="alert" className={ERROR_CLASS}>
              {error}
            </p>
          ) : null}
        </div>
      )
    } catch (e) {
      pendingOption.current = null
      return (
        <p role="alert" className={ERROR_CLASS}>
          {e instanceof Error ? e.message : String(e)}
        </p>
      )
    }
  }

  return (
    <MultiPanel<SankeyInput, SankeyOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ title: '', width: '600', height: '400' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      renderOutput={renderOutput}
      toText={(input, options) => {
        try {
          return transform(input, options)
        } catch {
          return ''
        }
      }}
      downloadExt="txt"
    />
  )
}
