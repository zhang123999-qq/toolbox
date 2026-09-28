import type { ChartGenInput, ChartGenOptions } from './schema'

/** 支持的图表类型 */
export type ChartType = 'bar' | 'line' | 'pie' | 'scatter'

/** 内置示例 CSV（留空输入时使用） */
export const EXAMPLE_CSV = `类别,数量
苹果,10
香蕉,25
橙子,15
葡萄,30`

/** 解析图表类型：bar / line / pie / scatter，留空默认 bar */
export function parseChartType(raw: string): ChartType {
  const v = raw.trim()
  if (v === '' || v === 'bar') return 'bar'
  if (v === 'line') return 'line'
  if (v === 'pie') return 'pie'
  if (v === 'scatter') return 'scatter'
  throw new Error(`图表类型非法：${v}（须为 bar / line / pie / scatter）`)
}

/** 解析尺寸：100–2000，留空默认 600（宽）/ 400（高） */
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

/** CSV 解析结果 */
export interface ParsedCsv {
  /** 表头列名 */
  readonly headers: readonly string[]
  /** 数据行（每行各列已 trim，数值列尝试转 number） */
  readonly rows: readonly (readonly (string | number)[])[]
}

/**
 * 解析简单 CSV：按行分割、逗号分列。
 * 纯函数：不处理引号嵌套（工具面向简单数据），数值列自动转 number。
 */
export function parseCsv(text: string): ParsedCsv {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '')
  if (lines.length < 2) {
    throw new Error('CSV 数据不足：至少需要一行表头和一行数据')
  }
  const headers = lines[0].split(',').map((h) => h.trim())
  if (headers.length < 2) {
    throw new Error('CSV 至少需要两列（类别 + 数值）')
  }
  const rows: (string | number)[][] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map((c) => c.trim())
    if (cells.length < 2) continue
    // 第二列起尝试转数字
    const typed = cells.map((c, idx) => {
      if (idx === 0) return c
      const n = Number(c)
      return Number.isFinite(n) ? n : c
    })
    rows.push(typed)
  }
  if (rows.length === 0) {
    throw new Error('CSV 没有有效数据行')
  }
  return { headers, rows }
}

/** 从 CSV 构建 echarts option（纯对象，不依赖 echarts 运行时） */
export function buildChartOption(
  csv: string,
  type: ChartType,
  title: string,
): Record<string, unknown> {
  const { headers, rows } = parseCsv(csv)
  const base: Record<string, unknown> = {
    title: title ? { text: title, left: 'center' } : undefined,
    tooltip: {},
  }

  if (type === 'pie') {
    const data = rows.map((r) => ({ name: String(r[0]), value: Number(r[1]) }))
    return {
      ...base,
      series: [
        {
          type: 'pie',
          radius: '60%',
          data,
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' },
          },
        },
      ],
    }
  }

  if (type === 'scatter') {
    // 两列：x, y
    const data = rows.map((r) => [Number(r[0]), Number(r[1])])
    return {
      ...base,
      xAxis: { type: 'value' },
      yAxis: { type: 'value' },
      series: [{ type: 'scatter', data, symbolSize: 12 }],
    }
  }

  // bar / line：第一列类目轴，其余列为系列
  const categories = rows.map((r) => String(r[0]))
  const series: Record<string, unknown>[] = []
  for (let col = 1; col < headers.length; col++) {
    series.push({
      name: headers[col],
      type,
      data: rows.map((r) => Number(r[col])),
    })
  }
  return {
    ...base,
    legend: {},
    xAxis: { type: 'category', data: categories },
    yAxis: { type: 'value' },
    series,
  }
}

/** T3 toText 入口：返回 CSV 数据文本（空输入用示例） */
export function transform(input: ChartGenInput, _options: ChartGenOptions): string {
  const text = input.text.trim()
  return text === '' ? EXAMPLE_CSV : text
}
