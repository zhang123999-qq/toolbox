import type { RadarInput } from './schema'

/** 雷达图指标：名称 + 最大值 */
export interface RadarIndicator {
  readonly name: string
  readonly max: number
}

/** 雷达图数据系列：系列名 + 按 indicators 顺序排列的值 */
export interface RadarSeries {
  readonly name: string
  readonly value: number[]
}

/** 雷达图解析结果 */
export interface ParsedRadar {
  readonly indicators: RadarIndicator[]
  readonly series: RadarSeries[]
}

/** 内置示例数据（主 text 留空时使用） */
export const EXAMPLE_DATA = `产品A, 速度:80, 力量:65, 耐力:90
产品B, 速度:60, 力量:85, 耐力:70`

/** 内置示例指标最大值（maxText 留空时使用） */
export const EXAMPLE_MAX = `速度:100, 力量:100, 耐力:100`

/**
 * 全角标点归一化：把全角冒号、逗号转成半角。
 * 纯函数：无分支。
 */
function normalizePunct(raw: string): string {
  return raw.replace(/：/g, ':').replace(/，/g, ',')
}

/**
 * 解析指标最大值：按逗号分割「指标名:最大值」单元。
 * 纯函数：空输入 / 无冒号 / 名为空 / 重复 / 最大值非法都抛中文错。
 */
export function parseMaxIndicators(raw: string): RadarIndicator[] {
  const text = normalizePunct(raw).trim()
  if (text === '') {
    throw new Error('指标最大值不能为空：请按「指标名:最大值, 指标名:最大值…」格式填写')
  }
  const indicators: RadarIndicator[] = []
  const seen = new Set<string>()
  for (const part of text.split(',')) {
    const cell = part.trim()
    const idx = cell.indexOf(':')
    if (idx === -1) {
      throw new Error(`指标最大值格式非法：${cell}（须为「指标名:最大值」）`)
    }
    const name = cell.slice(0, idx).trim()
    if (name === '') {
      throw new Error(`指标最大值格式非法：${cell}（指标名不能为空）`)
    }
    if (seen.has(name)) {
      throw new Error(`指标重复：${name}`)
    }
    seen.add(name)
    const max = Number(cell.slice(idx + 1).trim())
    if (!Number.isFinite(max) || max <= 0) {
      throw new Error(`指标「${name}」的最大值非法：须为大于 0 的数字`)
    }
    indicators.push({ name, max })
  }
  return indicators
}

/**
 * 解析雷达图数据：每行一个系列，「系列名, 指标1:值, 指标2:值…」。
 * 纯函数：系列名重复、单元缺冒号、未知指标、系列内指标重复、数值非法、
 * 值域越界、系列缺指标都抛中文错。系列 value 按 indicators 顺序组装。
 */
export function parseRadarData(dataText: string, maxText: string): ParsedRadar {
  const indicators = parseMaxIndicators(maxText)
  const maxByName = new Map(indicators.map((ind) => [ind.name, ind.max]))
  const text = normalizePunct(dataText).trim()
  if (text === '') {
    throw new Error('雷达图数据不能为空：每行一个系列，格式为「系列名, 指标1:值, 指标2:值…」')
  }
  const series: RadarSeries[] = []
  const seenSeries = new Set<string>()
  for (const rawLine of text.split(/\r?\n/)) {
    const row = rawLine.trim()
    if (row === '') {
      throw new Error('雷达图数据不能为空行')
    }
    const cells = row.split(',').map((c) => c.trim())
    if (cells.length < 2) {
      throw new Error(`数据行格式非法：${row}（至少需要「系列名, 指标:值」两个单元）`)
    }
    const seriesName = cells[0]
    if (seenSeries.has(seriesName)) {
      throw new Error(`系列名重复：${seriesName}`)
    }
    seenSeries.add(seriesName)
    const valueByName = new Map<string, number>()
    for (let i = 1; i < cells.length; i++) {
      const cell = cells[i]
      const idx = cell.indexOf(':')
      if (idx === -1) {
        throw new Error(`单元格式非法：${cell}（须为「指标名:数值」）`)
      }
      const indName = cell.slice(0, idx).trim()
      const max = maxByName.get(indName)
      if (max === undefined) {
        throw new Error(`未知指标：${indName}（不在指标最大值中）`)
      }
      if (valueByName.has(indName)) {
        throw new Error(`系列「${seriesName}」中指标重复：${indName}`)
      }
      const v = Number(cell.slice(idx + 1).trim())
      if (!Number.isFinite(v)) {
        throw new Error(`系列「${seriesName}」的指标「${indName}」数值非法：须为数字`)
      }
      if (v < 0 || v > max) {
        throw new Error(`系列「${seriesName}」的指标「${indName}」值 ${v} 超出范围 0–${max}`)
      }
      valueByName.set(indName, v)
    }
    const value: number[] = []
    for (const ind of indicators) {
      const v = valueByName.get(ind.name)
      if (v === undefined) {
        throw new Error(`系列「${seriesName}」缺少指标：${ind.name}`)
      }
      value.push(v)
    }
    series.push({ name: seriesName, value })
  }
  return { indicators, series }
}

/**
 * 从解析结果构建 echarts option（纯对象，不依赖 echarts 运行时）。
 * title 为空时不带 title 字段；legend 底部展示系列名；单个 radar 系列。
 */
export function buildRadarOption(parsed: ParsedRadar, title: string): Record<string, unknown> {
  const base: Record<string, unknown> = {
    tooltip: {},
    legend: { bottom: 0, data: parsed.series.map((s) => s.name) },
    radar: { indicator: parsed.indicators.map((ind) => ({ name: ind.name, max: ind.max })) },
    series: [
      {
        type: 'radar',
        data: parsed.series.map((s) => ({ name: s.name, value: [...s.value] })),
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

/** 解析尺寸：100–2000，留空回 fallback（宽 600 / 高 400） */
export function parseSize(raw: string, name: string, fallback: number): number {
  const v = raw.trim()
  if (v === '') return fallback
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`${name}格式非法：${v}（须为数字）`)
  if (n < 100 || n > 2000) throw new Error(`${name}须在 100–2000 之间（当前 ${v}）`)
  return n
}

/** T3 toText 入口：返回雷达图数据文本（空输入用示例） */
export function transform(input: RadarInput): string {
  const text = input.text.trim()
  if (text === '') return EXAMPLE_DATA
  return text
}

/** maxText 留空时用内置示例指标最大值 */
export function resolveMaxText(raw: string): string {
  const text = raw.trim()
  if (text === '') return EXAMPLE_MAX
  return text
}
