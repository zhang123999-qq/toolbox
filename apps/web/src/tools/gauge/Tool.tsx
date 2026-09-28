import { useEffect, useRef, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { buildGaugeOption, parseGaugeInput, parseSize, parseTitle, transform } from './utils'
import type { GaugeInput, GaugeOptions } from './schema'

/** 示例：当前值 75，区间 0–100 */
const EXAMPLE: GaugeInput = { text: '', value: '75', min: '0', max: '100' }

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

interface ChartInstance {
  dispose: () => void
  setOption: (option: unknown, notMerge?: boolean) => void
  getDataURL: (opts?: Record<string, unknown>) => string
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

  const optionDefs: readonly OptionDef<GaugeOptions>[] = [
    { key: 'title', label: '标题', kind: 'text', placeholder: '留空无标题' },
    { key: 'width', label: '宽度', kind: 'text', placeholder: '600' },
    { key: 'height', label: '高度', kind: 'text', placeholder: '400' },
  ]

  function downloadPng() {
    const chart = chartRef.current
    if (!chart) {
      setError('图表尚未渲染，无法导出 PNG')
      return
    }
    try {
      const url = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' })
      const a = document.createElement('a')
      a.href = url
      a.download = `${meta.slug}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function renderOutput(input: GaugeInput, options: GaugeOptions) {
    try {
      const parsed = parseGaugeInput(input.value, input.min, input.max)
      const title = parseTitle(options.title)
      const width = parseSize(options.width, '宽度', 600)
      const height = parseSize(options.height, '高度', 400)
      const option = buildGaugeOption(parsed, title)
      pendingOption.current = option
      return (
        <div>
          <div
            ref={containerRef}
            data-testid="chart-container"
            style={{ width: `${width}px`, height: `${height}px` }}
          />
          <button type="button" data-testid="download-png" onClick={downloadPng}>
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
    <MultiPanel<GaugeInput, GaugeOptions>
      meta={meta}
      initialInput={{ text: '', value: '75', min: '0', max: '100' }}
      initialOptions={{ title: '', width: '600', height: '400' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[
        { key: 'value', label: '当前值' },
        { key: 'min', label: '最小值' },
        { key: 'max', label: '最大值' },
      ]}
      renderOutput={renderOutput}
      toText={(input) => {
        try {
          const p = parseGaugeInput(input.value, input.min, input.max)
          return `仪表盘：当前值 ${p.value}（区间 ${p.min}–${p.max}）`
        } catch {
          return transform(input)
        }
      }}
      downloadExt="txt"
    />
  )
}
