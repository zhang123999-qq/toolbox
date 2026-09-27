import type { EChartsCoreOption } from 'echarts/core'
import type { Translate } from '../../i18n'
import type { StatisticsInput, StatisticsOptions } from './schema'

/** 输入字符上限（与 schema 的 max 保持一致） */
const MAX_INPUT_LENGTH = 200000

/** 字段分隔符：空白 / 逗号 / 分号 */
const FIELD_SEP_RE = /[\s,;]+/

/** 柱状图 / 折线图的系列颜色 */
const SERIES_COLOR = '#3b82f6'

export interface DataSeries {
  readonly labels: string[]
  readonly values: number[]
}

export interface Summary {
  readonly count: number
  readonly sum: number
  readonly mean: number
  readonly min: number
  readonly max: number
}

function isNumericToken(token: string): boolean {
  return token !== '' && Number.isFinite(Number(token))
}

/**
 * 解析文本数据：每行一个数据点。
 * - 纯数字行：`10 20 30` 或 `10,20,30` → 多个值，自动编号为标签
 * - 「标签,数值」行：`一月,120` → 带标签的单个值
 * 空行跳过；非法行抛 i18n 双语错误（带行号）。
 */
export function parseSeries(text: string, t: Translate): DataSeries {
  if (text.trim() === '') throw new Error(t('statistics.error.noData'))
  if (text.length > MAX_INPUT_LENGTH) throw new Error(t('statistics.error.tooLong'))
  const labels: string[] = []
  const values: number[] = []
  let lineNo = 0
  let autoIndex = 0
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line === '') continue
    lineNo += 1
    const parts = line
      .split(FIELD_SEP_RE)
      .map((p) => p.trim())
      .filter((p) => p !== '')
    if (parts.length === 0) {
      throw new Error(t('statistics.error.invalidLine', { line: lineNo, value: line }))
    }
    if (parts.length === 2 && !isNumericToken(parts[0]) && isNumericToken(parts[1])) {
      labels.push(parts[0])
      values.push(Number(parts[1]))
      continue
    }
    if (parts.every(isNumericToken)) {
      for (const p of parts) {
        autoIndex += 1
        labels.push(String(autoIndex))
        values.push(Number(p))
      }
      continue
    }
    throw new Error(t('statistics.error.invalidLine', { line: lineNo, value: line }))
  }
  return { labels, values }
}

/** 汇总统计：个数 / 总和 / 均值 / 最值 */
export function describe(values: readonly number[], t: Translate): Summary {
  if (values.length === 0) throw new Error(t('statistics.error.noData'))
  let sum = 0
  let min = values[0]
  let max = values[0]
  for (const v of values) {
    sum += v
    if (v < min) min = v
    if (v > max) max = v
  }
  return { count: values.length, sum, mean: sum / values.length, min, max }
}

/** 按指定小数位数格式化，并去掉无意义的尾零（2.5000 → 2.5） */
export function fmtFixed(n: number, decimals: number): string {
  if (!Number.isFinite(n)) return String(n)
  const s = n.toFixed(decimals)
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s
}

/**
 * 构建 echarts option（纯函数，不触碰 DOM；实例生命周期由 Tool.tsx 管理）。
 * 缺省图表类型回退为柱状图。
 */
export function buildChartOption(
  series: DataSeries,
  chart: StatisticsOptions['chart'] | undefined,
  t: Translate,
): EChartsCoreOption {
  const kind = chart ?? 'bar'
  const title = t('statistics.chart.title')
  if (kind === 'pie') {
    return {
      title: { text: title, left: 'center' },
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          radius: '60%',
          data: series.labels.map((name, i) => ({ name, value: series.values[i] })),
        },
      ],
    }
  }
  const cartesianSeries =
    kind === 'line'
      ? { type: 'line' as const, data: series.values, itemStyle: { color: SERIES_COLOR } }
      : { type: 'bar' as const, data: series.values, itemStyle: { color: SERIES_COLOR } }
  return {
    title: { text: title, left: 'center' },
    tooltip: { trigger: 'axis' },
    grid: { left: 48, right: 12, top: 40, bottom: 56 },
    xAxis: {
      type: 'category',
      data: series.labels,
      axisLabel: { interval: 0, rotate: 30 },
    },
    yAxis: { type: 'value' },
    series: [cartesianSeries],
  }
}

/** 汇总文本（供复制 / 下载） */
export function formatSummary(s: Summary, t: Translate, decimals: number): string {
  const f = (n: number): string => fmtFixed(n, decimals)
  return [
    `${t('statistics.summary.count')}: ${s.count}`,
    `${t('statistics.summary.sum')}: ${f(s.sum)}`,
    `${t('statistics.summary.mean')}: ${f(s.mean)}`,
    `${t('statistics.summary.min')}: ${f(s.min)}`,
    `${t('statistics.summary.max')}: ${f(s.max)}`,
  ].join('\n')
}

/** T3 文本入口：空输入返回空串（复制/下载无内容），非法输入抛错 */
export function summarizeText(
  input: StatisticsInput,
  options: StatisticsOptions,
  t: Translate,
): string {
  if (input.text.trim() === '') return ''
  const decimals = Number(options.decimals ?? '2')
  return formatSummary(describe(parseSeries(input.text, t).values, t), t, decimals)
}
