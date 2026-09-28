import type { HeatmapInput } from './schema'

/** 内置示例数据（留空输入时使用） */
export const EXAMPLE_DATA = `周一, 上午, 12
周一, 下午, 30
周二, 上午, 8
周二, 下午, 25`

/** 热力图解析结果：data 为 [x 序号, y 序号, 数值]，类目按首次出现顺序编号 */
export interface ParsedHeatmap {
  readonly xCats: readonly string[]
  readonly yCats: readonly string[]
  readonly data: readonly (readonly [number, number, number])[]
}

/** 解析尺寸：100–2000，留空返回 fallback */
export function parseSize(raw: string, name: string, fallback: number): number {
  const v = raw.trim()
  if (v === '') return fallback
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`${name}格式非法：${v}（须为数字）`)
  if (n < 100 || n > 2000) throw new Error(`${name}须在 100–2000 之间（当前 ${v}）`)
  return n
}

/** 解析标题：留空返回空串（不显示标题） */
export function parseTitle(raw: string): string {
  return raw.trim()
}

/**
 * 解析热力图数据：每行「X类目, Y类目, 数值」，全角逗号自动归一。
 * 纯函数：类目按首次出现顺序编号，(x, y) 重复抛错。
 */
export function parseHeatmapData(text: string): ParsedHeatmap {
  const lines = text
    .replace(/，/g, ',')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '')
  if (lines.length === 0) {
    throw new Error('数据不能为空（每行：X类目, Y类目, 数值）')
  }
  const xIndex = new Map<string, number>()
  const yIndex = new Map<string, number>()
  const xCats: string[] = []
  const yCats: string[] = []
  const seen = new Set<string>()
  const data: [number, number, number][] = []
  for (const line of lines) {
    const parts = line.split(',')
    if (parts.length !== 3) {
      throw new Error(`数据格式非法：${line}（每行须为 X类目, Y类目, 数值）`)
    }
    const x = parts[0].trim()
    const y = parts[1].trim()
    const vstr = parts[2].trim()
    if (x === '' || y === '') {
      throw new Error(`类目不能为空：${line}`)
    }
    const value = Number(vstr)
    if (!Number.isFinite(value)) {
      throw new Error(`数值非法：${vstr}`)
    }
    const key = x + '\u0000' + y
    if (seen.has(key)) {
      throw new Error(`重复的数据点：${x},${y}`)
    }
    seen.add(key)
    let xi = xIndex.get(x)
    if (xi === undefined) {
      xi = xCats.length
      xIndex.set(x, xi)
      xCats.push(x)
    }
    let yi = yIndex.get(y)
    if (yi === undefined) {
      yi = yCats.length
      yIndex.set(y, yi)
      yCats.push(y)
    }
    data.push([xi, yi, value])
  }
  return { xCats, yCats, data }
}

/** 从解析结果构建 echarts heatmap option（纯对象，不依赖 echarts 运行时） */
export function buildHeatmapOption(parsed: ParsedHeatmap, title: string): Record<string, unknown> {
  let min = Infinity
  let max = -Infinity
  for (const d of parsed.data) {
    if (d[2] < min) min = d[2]
    if (d[2] > max) max = d[2]
  }
  return {
    title: title ? { text: title, left: 'center' } : undefined,
    tooltip: { position: 'top' },
    grid: { height: '60%', top: '10%' },
    xAxis: { type: 'category', data: parsed.xCats, splitArea: { show: true } },
    yAxis: { type: 'category', data: parsed.yCats, splitArea: { show: true } },
    visualMap: { min, max, calculable: true, orient: 'horizontal', left: 'center', bottom: 0 },
    series: [
      {
        type: 'heatmap',
        data: parsed.data.map((d) => [d[0], d[1], d[2]]),
        label: { show: true },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
      },
    ],
  }
}

/** T3 toText 入口：返回数据文本（空输入用示例） */
export function transform(input: HeatmapInput): string {
  const text = input.text.trim()
  return text === '' ? EXAMPLE_DATA : text
}
