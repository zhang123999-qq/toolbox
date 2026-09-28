import type { ChartExportInput } from './schema'

/** 导出格式 */
export type ExportFormat = 'png' | 'svg'

/** 内置示例 option JSON */
export const EXAMPLE_OPTION = `{
  "title": { "text": "示例柱状图", "left": "center" },
  "xAxis": { "type": "category", "data": ["A", "B", "C"] },
  "yAxis": { "type": "value" },
  "series": [{ "type": "bar", "data": [120, 200, 150] }]
}`

/**
 * 解析 echarts option JSON：须为 JSON 对象（series 可选）。
 * 纯函数：空输入 / JSON 非法 / 非对象（数组、null、原始值）都抛中文错。
 */
export function parseOptionJson(text: string): Record<string, unknown> {
  const t = text.trim()
  if (t === '') {
    throw new Error('option JSON 不能为空：请粘贴 echarts option 对象')
  }
  let v: unknown
  try {
    v = JSON.parse(t)
  } catch {
    throw new Error('JSON 解析失败：请检查是否为合法 JSON')
  }
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    throw new Error('option 须为 JSON 对象（不能是数组或原始值）')
  }
  return v as Record<string, unknown>
}

/** 解析导出尺寸：100–4000，留空回 fallback */
export function parseExportSize(raw: string, name: string, fallback: number): number {
  const v = raw.trim()
  if (v === '') return fallback
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`${name}格式非法：${v}（须为数字）`)
  if (n < 100 || n > 4000) throw new Error(`${name}须在 100–4000 之间（当前 ${v}）`)
  return n
}

/**
 * 解析背景色：空 / transparent → 'transparent'；#rgb / #rrggbb（大小写不限）归一为小写。
 * 纯函数：其他格式抛中文错。
 */
export function parseBgColor(raw: string): string {
  const t = raw.trim().toLowerCase()
  if (t === '' || t === 'transparent') return 'transparent'
  if (/^#[0-9a-f]{3}$/.test(t) || /^#[0-9a-f]{6}$/.test(t)) return t
  throw new Error(`背景色格式非法：${raw}（须为 #rrggbb / #rgb 或 transparent）`)
}

/** 解析导出格式：仅 png / svg */
export function parseFormat(raw: string): ExportFormat {
  if (raw === 'png' || raw === 'svg') return raw
  throw new Error(`导出格式非法：${raw}`)
}

/** T3 toText 入口：空输入用示例 option */
export function transform(input: ChartExportInput): string {
  const text = input.text.trim()
  if (text === '') return EXAMPLE_OPTION
  return text
}
