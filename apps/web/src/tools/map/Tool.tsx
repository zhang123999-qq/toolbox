import { useEffect, useRef, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import {
  buildMapOption,
  EXAMPLE_REGIONS,
  fetchMapGeoJson,
  MAP_SOURCES,
  parseMapKind,
  parseRegionData,
  parseSize,
  parseTitle,
  transform,
} from './utils'
import type { MapKind } from './utils'
import type { MapInput, MapOptions } from './schema'

/** 示例：示例地区数据 */
const EXAMPLE: MapInput = { text: EXAMPLE_REGIONS }

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'
const LOADING_CLASS = 'text-sm text-slate-500 dark:text-slate-400'

interface ChartInstance {
  dispose: () => void
  setOption: (option: unknown, notMerge?: boolean) => void
  getDataURL: () => string
}

/** 每个地图类型一份缓存：数据或加载错误（二者之一一旦落定就不再重拉） */
interface GeoEntry {
  data?: unknown
  error?: string
}

export default function Tool() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<ChartInstance | null>(null)
  // render 阶段计算 option 与目标地图，effect 阶段喂给 echarts
  const pendingOption = useRef<Record<string, unknown> | null>(null)
  const pendingKind = useRef<MapKind>('china')
  const geoCache = useRef<Partial<Record<MapKind, GeoEntry>>>({})
  // 只 set 不读：geo 落定后触发 Tool 重渲染，renderOutput 与 effect 自然重跑
  const [, setGeoTick] = useState(0)
  const [error, setError] = useState<string | null>(null)

  /**
   * 确保某地图的 geoJSON 已发起加载。幂等：每个 kind 只拉一次。
   * 注意：input / options 状态在 MultiPanel 内部，Tool 本体不会因选项变化重渲染，
   * 因此加载必须在这里（renderOutput 调用路径上）触发，而不能只依赖下面的 effect；
   * 落定后 setGeoTick 让 Tool 重渲染，effect 随之重跑完成注册与绘制。
   */
  function ensureGeo(kind: MapKind): void {
    if (geoCache.current[kind]) return
    const entry: GeoEntry = {}
    geoCache.current[kind] = entry
    const src = MAP_SOURCES[kind]
    void fetchMapGeoJson(src.url, (u) => fetch(u)).then(
      (data) => {
        entry.data = data
        setGeoTick((t) => t + 1)
      },
      (e: unknown) => {
        entry.error = e instanceof Error ? e.message : String(e)
        setGeoTick((t) => t + 1)
      },
    )
  }

  useEffect(() => {
    let cancelled = false
    async function draw() {
      const kind = pendingKind.current
      const entry = geoCache.current[kind]
      // 数据未就绪（或已失败）：renderOutput 负责展示加载 / 错误态
      if (!entry || !entry.data) return
      if (!containerRef.current) return
      try {
        // 动态导入 echarts：独立分包，避免拖慢主 chunk
        const echarts = await import('echarts')
        if (cancelled) return
        ;(echarts as unknown as { registerMap: (n: string, g: unknown) => void }).registerMap(
          MAP_SOURCES[kind].mapName,
          entry.data,
        )
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

  async function downloadPng() {
    if (!chartRef.current) return
    try {
      const url = chartRef.current.getDataURL()
      const a = document.createElement('a')
      a.href = url
      a.download = 'map.png'
      a.click()
      setError(null)
    } catch {
      // 不弹 alert：错误显示在输出区
      setError('导出 PNG 失败，请重试')
    }
  }

  const optionDefs: readonly OptionDef<MapOptions>[] = [
    { key: 'kind', label: '地图', kind: 'select', values: ['china', 'world'] },
    { key: 'title', label: '标题', kind: 'text', placeholder: '留空无标题' },
    { key: 'width', label: '宽度', kind: 'text', placeholder: '600' },
    { key: 'height', label: '高度', kind: 'text', placeholder: '400' },
  ]

  function renderOutput(input: MapInput, options: MapOptions) {
    try {
      const kind = parseMapKind(options.kind)
      pendingKind.current = kind
      const title = parseTitle(options.title)
      const width = parseSize(options.width, '宽度', 600)
      const height = parseSize(options.height, '高度', 400)
      const regions = parseRegionData(transform(input))
      ensureGeo(kind)
      const entry = geoCache.current[kind]
      if (entry?.error) {
        pendingOption.current = null
        return (
          <p role="alert" className={ERROR_CLASS}>
            {entry.error}
          </p>
        )
      }
      if (!entry?.data) {
        pendingOption.current = null
        return <p className={LOADING_CLASS}>地图数据加载中…</p>
      }
      pendingOption.current = buildMapOption(MAP_SOURCES[kind].mapName, title, regions)
      return (
        <div>
          <div
            ref={containerRef}
            data-testid="chart-container"
            style={{ width: `${width}px`, height: `${height}px` }}
          />
          {error ? (
            <p role="alert" className={ERROR_CLASS}>
              {error}
            </p>
          ) : null}
          <button
            type="button"
            data-testid="download-png"
            className={SECONDARY_BUTTON}
            onClick={() => void downloadPng()}
          >
            下载 PNG
          </button>
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
    <MultiPanel<MapInput, MapOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ kind: 'china', title: '', width: '600', height: '400' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      renderOutput={renderOutput}
      toText={transform}
      downloadExt="txt"
    />
  )
}
