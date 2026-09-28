import { useEffect, useRef, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import {
  buildGraphOption,
  EXAMPLE_EDGES,
  EXAMPLE_NODES,
  parseGraphData,
  parseSize,
  parseTitle,
  resolveEdgeText,
  transform,
} from './utils'
import type { GraphInput, GraphOptions } from './schema'

/** 示例：节点 + 边 */
const EXAMPLE: GraphInput = { text: EXAMPLE_NODES, edgeText: EXAMPLE_EDGES }

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

interface ChartInstance {
  dispose: () => void
  setOption: (option: unknown, notMerge?: boolean) => void
  getDataURL: (o?: Record<string, unknown>) => string
}

function triggerDownload(url: string, filename: string): void {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
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

  function downloadPng(): void {
    if (!chartRef.current) return
    const url = chartRef.current.getDataURL({ pixelRatio: 2, backgroundColor: '#ffffff' })
    triggerDownload(url, 'graph.png')
  }

  const optionDefs: readonly OptionDef<GraphOptions>[] = [
    { key: 'title', label: '标题', kind: 'text', placeholder: '留空无标题' },
    { key: 'width', label: '宽度', kind: 'text', placeholder: '400' },
    { key: 'height', label: '高度', kind: 'text', placeholder: '300' },
  ]

  function renderOutput(input: GraphInput, options: GraphOptions) {
    try {
      const title = parseTitle(options.title)
      const width = parseSize(options.width, '宽度', 600)
      const height = parseSize(options.height, '高度', 400)
      const parsed = parseGraphData(transform(input), resolveEdgeText(input.edgeText))
      const option = buildGraphOption(parsed, title)
      pendingOption.current = option
      return (
        <div>
          <div
            ref={containerRef}
            data-testid="chart-container"
            style={{ width: `${width}px`, height: `${height}px` }}
          />
          <div className="mt-2">
            <button type="button" data-testid="download-png" onClick={downloadPng}>
              下载 PNG
            </button>
          </div>
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
    <MultiPanel<GraphInput, GraphOptions>
      meta={meta}
      initialInput={{ text: '', edgeText: '' }}
      initialOptions={{ title: '', width: '600', height: '400' }}
      example={EXAMPLE}
      extraInputs={[{ key: 'edgeText', label: '边数据（每行：源 -> 目标 或 源 -> 目标:权重）' }]}
      optionDefs={optionDefs}
      renderOutput={renderOutput}
      toText={transform}
      downloadExt="txt"
    />
  )
}
