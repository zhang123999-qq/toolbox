import type { MapInput } from './schema'

/** 支持的地图类型 */
export type MapKind = 'china' | 'world'

/** 地图数据源：geoJSON 运行时从 CDN 获取（D 级工具，需联网） */
export interface MapSource {
  readonly mapName: string
  readonly url: string
  readonly label: string
}

export const MAP_SOURCES: Record<MapKind, MapSource> = {
  china: {
    mapName: 'toolbox-china',
    url: 'https://geo.datav.aliyun.com/areas_v3/bound/100000.json',
    label: '中国',
  },
  world: {
    mapName: 'toolbox-world',
    url: 'https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/json/world.json',
    label: '世界',
  },
}

/** 地区数值行 */
export interface RegionValue {
  readonly name: string
  readonly value: number
}

/** 与浏览器 Response 对齐的最小形状（测试中注入，无需真实网络） */
export interface FetchResponseLike {
  readonly ok: boolean
  readonly status: number
  json: () => Promise<unknown>
}

/**
 * 可注入的 fetch 函数类型。
 * 无默认值：调用方必须显式传入 fetch 实现（浏览器环境传全局 fetch）。
 */
export type FetchLike = (url: string) => Promise<FetchResponseLike>

/** 内置示例地区数据（留空输入时使用） */
export const EXAMPLE_REGIONS = `广东:120
北京:80
上海:95
四川:60`

/** 解析地图类型：china / world，留空默认 china */
export function parseMapKind(raw: string): MapKind {
  const v = raw.trim()
  if (v === '') return 'china'
  if (v === 'china') return 'china'
  if (v === 'world') return 'world'
  throw new Error(`地图类型非法：${v}（须为 china / world）`)
}

/** 解析地区数据：每行「地区名:数值」，全角冒号自动归一 */
export function parseRegionData(text: string): RegionValue[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '')
  if (lines.length === 0) {
    throw new Error('地区数据不能为空（每行：地区名:数值）')
  }
  const seen = new Set<string>()
  const regions: RegionValue[] = []
  for (const rawLine of lines) {
    const line = rawLine.replace(/：/g, ':')
    const idx = line.indexOf(':')
    if (idx < 0) {
      throw new Error(`格式非法：${rawLine}（应为 地区名:数值）`)
    }
    const name = line.slice(0, idx).trim()
    const vstr = line.slice(idx + 1).trim()
    if (name === '') {
      throw new Error(`格式非法：${rawLine}（地区名不能为空）`)
    }
    if (seen.has(name)) {
      throw new Error(`重复的地区：${name}`)
    }
    const value = Number(vstr)
    if (!Number.isFinite(value)) {
      throw new Error(`地区 ${name} 的数值非法：${vstr}`)
    }
    seen.add(name)
    regions.push({ name, value })
  }
  return regions
}

/**
 * 从 CDN 加载地图 geoJSON。
 * 纯函数式（fetch 可注入）：网络错误 / 非 2xx / 非 JSON / 形状非法均抛中文错。
 */
export async function fetchMapGeoJson(url: string, fetchFn: FetchLike): Promise<unknown> {
  let res: FetchResponseLike
  try {
    res = await fetchFn(url)
  } catch {
    throw new Error('地图数据加载失败：网络错误，地图 geoJSON 需联网加载')
  }
  if (!res.ok) {
    throw new Error(`地图数据加载失败：HTTP ${res.status}，地图 geoJSON 需联网加载`)
  }
  let data: unknown
  try {
    data = await res.json()
  } catch {
    throw new Error('地图数据加载失败：返回内容不是合法 JSON')
  }
  if (
    typeof data !== 'object' ||
    data === null ||
    !Array.isArray((data as { features?: unknown }).features)
  ) {
    throw new Error('地图数据加载失败：geoJSON 格式非法（缺少 features 数组）')
  }
  return data
}

/** 构建 echarts choropleth option（纯对象，不依赖 echarts 运行时） */
export function buildMapOption(
  mapName: string,
  title: string,
  regions: readonly RegionValue[],
): Record<string, unknown> {
  let min = 0
  let max = 100
  if (regions.length > 0) {
    min = regions[0].value
    max = regions[0].value
    for (const r of regions) {
      if (r.value < min) min = r.value
      if (r.value > max) max = r.value
    }
  }
  return {
    ...(title ? { title: { text: title, left: 'center' } } : {}),
    tooltip: { trigger: 'item' },
    visualMap: {
      min,
      max,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: { color: ['#e0f2fe', '#0369a1'] },
    },
    series: [
      {
        type: 'map',
        map: mapName,
        roam: true,
        data: regions.map((r) => ({ name: r.name, value: r.value })),
        emphasis: {
          label: { show: true },
          itemStyle: { areaColor: '#fbbf24' },
        },
      },
    ],
  }
}

/** 解析标题：留空返回空串（不显示标题） */
export function parseTitle(raw: string): string {
  return raw.trim()
}

/** 解析尺寸：100–2000，留空回退 fallback */
export function parseSize(raw: string, name: string, fallback: number): number {
  const v = raw.trim()
  if (v === '') return fallback
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`${name}格式非法：${v}（须为数字）`)
  if (n < 100 || n > 2000) throw new Error(`${name}须在 100–2000 之间（当前 ${v}）`)
  return n
}

/** T3 toText 入口：返回地区数据文本（空输入用示例） */
export function transform(input: MapInput): string {
  const text = input.text.trim()
  return text === '' ? EXAMPLE_REGIONS : text
}
