import type { QuarterInput, QuarterOptions } from './schema'

function pad2(n: number): string {
  return n < 10 ? '0' + String(n) : String(n)
}

/** 解析 YYYY-MM-DD 为合法公历日，失败抛中文错误 */
export function parseDate(text: string): { y: number; m: number; d: number } {
  const t = text.trim()
  const dm = t.match(/^(\d{4})\s*[-/](\d{1,2})\s*[-/](\d{1,2})$/)
  if (!dm) throw new Error('无法识别日期，请使用 YYYY-MM-DD')
  const y = Number(dm[1])
  const m = Number(dm[2])
  const d = Number(dm[3])
  const probe = new Date(y, m - 1, d)
  if (probe.getFullYear() !== y || probe.getMonth() !== m - 1 || probe.getDate() !== d) {
    throw new Error('非法日期：' + t)
  }
  return { y, m, d }
}

export interface QuarterInfo {
  quarter: number
  start: string
  end: string
  daysToEnd: number
  yearProgress: number
}

/** 由日期计算所属季度、起止、距季末天数、当年进度 */
export function quarterInfo(y: number, m: number, d: number): QuarterInfo {
  const q = Math.floor((m - 1) / 3) + 1
  const startMonth = 3 * (q - 1) + 1
  const endMonth = 3 * q
  // 季度末：endMonth 的最后一天（Date(y, endMonth, 0) 即上月最后一天）
  const endLastDay = new Date(y, endMonth, 0).getDate()

  const start = `${y}-${pad2(startMonth)}-01`
  const end = `${y}-${pad2(endMonth)}-${pad2(endLastDay)}`

  const today = Date.UTC(y, m - 1, d)
  const endUtc = Date.UTC(y, endMonth - 1, endLastDay)
  // 距季度末天数（含今天）
  const daysToEnd = Math.round((endUtc - today) / 86400000) + 1

  const yearStart = Date.UTC(y, 0, 1)
  const dayOfYear = Math.round((today - yearStart) / 86400000) + 1
  const totalDays = Math.round((Date.UTC(y + 1, 0, 1) - yearStart) / 86400000)
  const yearProgress = (dayOfYear / totalDays) * 100

  return { quarter: q, start, end, daysToEnd, yearProgress }
}

/** T2 同步入口 */
export function transform(input: QuarterInput, _options: QuarterOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const { y, m, d } = parseDate(text)
  const info = quarterInfo(y, m, d)
  return [
    `日期：${y}-${pad2(m)}-${pad2(d)}`,
    `所属季度：Q${info.quarter}`,
    `季度起止：${info.start} ~ ${info.end}`,
    `距季度末：${info.daysToEnd} 天`,
    `当年进度：${info.yearProgress.toFixed(1)}%`,
  ].join('\n')
}
