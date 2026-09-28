import { useEffect, useRef, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import {
  EXAMPLE_OPTION,
  parseBgColor,
  parseExportSize,
  parseFormat,
  parseOptionJson,
  transform,
  type ExportFormat,
} from './utils'
import type { ChartExportInput, ChartExportOptions } from './schema'

/** 示例输入 */
const EXAMPLE: ChartExportInput = { text: EXAMPLE_OPTION }

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

interface ChartInstance {
  dispose: () => void
  setOption: (option: unknown, notMerge?: boolean) => void
  getDataURL: (opts?: Record<string, unknown>) => string
}

interface ExportJob {
  readonly option: Record<string, unknown>
  readonly width: number
  readonly height: number
  readonly bg: string
  readonly format: ExportFormat
}

function downloadUrl(url: string, filename: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export default function Tool() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<ChartInstance | null>(null)
  // render 阶段计算预览 option 与导出任务，effect 阶段喂给 echarts
  const pendingOption = useRef<Record<string, unknown> | null>(null)
  const pendingJob = useRef<ExportJob | null>(null)
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

  const optionDefs: readonly OptionDef<ChartExportOptions>[] = [
    { key: 'width', label: '宽度', kind: 'text', placeholder: '800' },
    { key: 'height', label: '高度', kind: 'text', placeholder: '600' },
    { key: 'bgColor', label: '背景色', kind: 'text', placeholder: '#ffffff / transparent' },
    { key: 'format', label: '导出格式', kind: 'select', values: ['png', 'svg'] },
  ]

  async function exportImage() {
    const job = pendingJob.current
    if (!job) {
      setError('图表尚未渲染，无法导出')
      return
    }
    // PNG 走预览实例：守卫前置，保持同步可断言
    if (job.format === 'png' && !chartRef.current) {
      setError('图表尚未渲染，无法导出 PNG')
      return
    }
    try {
      const echarts = await import('echarts')
      if (job.format === 'png') {
        const chart = chartRef.current
        if (!chart) {
          setError('图表尚未渲染，无法导出 PNG')
          return
        }
        const url = chart.getDataURL({
          type: 'png',
          pixelRatio: 2,
          backgroundColor: job.bg,
        })
        downloadUrl(url, `${meta.slug}.png`)
      } else {
        // SVG：临时容器以 svg 渲染器绘制，序列化 svg 元素后下载
        const el = document.createElement('div')
        el.style.width = `${job.width}px`
        el.style.height = `${job.height}px`
        document.body.appendChild(el)
        const tmp = echarts.init(el, null, {
          renderer: 'svg',
          width: job.width,
          height: job.height,
        }) as unknown as ChartInstance
        try {
          tmp.setOption(job.option, true)
          const svg = el.querySelector('svg')
          if (!svg) {
            throw new Error('SVG 渲染失败：未生成 svg 元素')
          }
          const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml;charset=utf-8' })
          const url = URL.createObjectURL(blob)
          downloadUrl(url, `${meta.slug}.svg`)
          URL.revokeObjectURL(url)
        } finally {
          tmp.dispose()
          el.remove()
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function renderOutput(input: ChartExportInput, options: ChartExportOptions) {
    try {
      const option = parseOptionJson(transform(input))
      const width = parseExportSize(options.width, '宽度', 800)
      const height = parseExportSize(options.height, '高度', 600)
      const bg = parseBgColor(options.bgColor)
      const format = parseFormat(options.format)
      pendingOption.current = option
      pendingJob.current = { option, width, height, bg, format }
      return (
        <div>
          <div
            ref={containerRef}
            data-testid="chart-container"
            style={{ width: `${width}px`, height: `${height}px` }}
          />
          <button type="button" data-testid="export-image" onClick={exportImage}>
            导出{format === 'png' ? ' PNG' : ' SVG'}
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
      pendingJob.current = null
      return (
        <p role="alert" className={ERROR_CLASS}>
          {e instanceof Error ? e.message : String(e)}
        </p>
      )
    }
  }

  return (
    <MultiPanel<ChartExportInput, ChartExportOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ width: '800', height: '600', bgColor: '#ffffff', format: 'png' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      renderOutput={renderOutput}
      toText={(input) => {
        try {
          return transform(input)
        } catch {
          return ''
        }
      }}
      downloadExt="json"
    />
  )
}
