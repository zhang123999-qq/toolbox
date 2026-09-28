import type { GaugeInput } from './schema'

/** 仪表盘解析结果 */
export interface ParsedGauge {
  readonly value: number
  readonly min: number
  readonly max: number
}

/** 三段色：低 / 中 / 高区间 */
export const GAUGE_COLORS: readonly [
  readonly [number, string],
  readonly [number, string],
  readonly [number, string],
] = [
  [0.33, '#67e0e3'],
  [0.67, '#37a2da'],
  [1, '#fd666d'],
]

/** 解析单个数字输入 */
function parseNumber(raw: string, name: string): number {
  const v = raw.trim()
  if (v === '') {
    throw new Error(`${name}不能为空`)
  }
  const n = Number(v)
  if (!Number.isFinite(n)) {
    throw new Error(`${name}格式非法：${v}（须为数字）`)
  }
  return n
}

/**
 * 解析仪表盘输入：当前值、最小值、最大值。
 * 纯函数：空值 / 非数字 / 最小值 ≥ 最大值 / 当前值越界都抛中文错。
 */
export function parseGaugeInput(valueRaw: string, minRaw: string, maxRaw: string): ParsedGauge {
  const value = parseNumber(valueRaw, '当前值')
  const min = parseNumber(minRaw, '最小值')
  const max = parseNumber(maxRaw, '最大值')
  if (min >= max) {
    throw new Error(`最小值须小于最大值（当前 ${min} ≥ ${max}）`)
  }
  if (value < min || value > max) {
    throw new Error(`当前值须在 ${min}–${max} 之间（当前 ${value}）`)
  }
  return { value, min, max }
}

/**
 * 构建 echarts gauge option（纯对象，不依赖 echarts 运行时）。
 * 刻度盘按值区间三段着色；title 为空时不带 title 字段、无标题时数据名用「当前值」。
 * 纯函数。
 */
export function buildGaugeOption(parsed: ParsedGauge, title: string): Record<string, unknown> {
  const base: Record<string, unknown> = {
    series: [
      {
        type: 'gauge',
        min: parsed.min,
        max: parsed.max,
        axisLine: {
          lineStyle: {
            width: 20,
            color: GAUGE_COLORS.map(([stop, c]) => [stop, c]),
          },
        },
        detail: { formatter: '{value}' },
        data: [{ value: parsed.value, name: title === '' ? '当前值' : title }],
      },
    ],
  }
  if (title !== '') {
    return { title: { text: title, left: 'center' }, ...base }
  }
  return base
}

/** 解析标题：留空返回空串（不显示标题） */
export function parseTitle(raw: string): string {
  return raw.trim()
}

/** 解析尺寸：100–2000，留空回 fallback */
export function parseSize(raw: string, name: string, fallback: number): number {
  const v = raw.trim()
  if (v === '') return fallback
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`${name}格式非法：${v}（须为数字）`)
  if (n < 100 || n > 2000) throw new Error(`${name}须在 100–2000 之间（当前 ${v}）`)
  return n
}

/** T3 toText 入口：仪表盘以选项为输入，主文本固定说明 */
export function transform(input: GaugeInput): string {
  return input.text.trim()
}
