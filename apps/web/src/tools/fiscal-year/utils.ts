import type { FiscalYearInput, FiscalYearOptions } from './schema'

function pad2(n: number): string {
  return n < 10 ? '0' + String(n) : String(n)
}

/** 解析 YYYY-MM-DD 为合法公历日 */
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

export interface FiscalYearInfo {
  fyLabel: string
  start: string
  end: string
  progress: number
  daysToEnd: number
}

/**
 * 计算所属财年。
 *
 * 财年起始月 s（1~12）：
 *   - 当 m >= s：该财年从 s 月开始，记为「FY{s 所在公历年}」
 *   - 当 m < s：该日期属于上一年开始的财年
 * 例：s=4（日本/微软财年），2025-06 → FY2025（2025-04-01 ~ 2026-03-31）；
 *     s=7（澳大利亚/美国政府财年），2025-02 → FY2024（2024-07-01 ~ 2025-06-30）。
 */
export function fiscalYearInfo(
  y: number,
  m: number,
  d: number,
  startMonth: number,
): FiscalYearInfo {
  if (startMonth < 1 || startMonth > 12) throw new Error('财年起始月须在 1~12 之间：' + startMonth)

  const fyYear = m >= startMonth ? y : y - 1
  // 财年起止：start = (fyYear, startMonth, 1)；end = (fyYear+1, startMonth, 0)
  const startUtc = Date.UTC(fyYear, startMonth - 1, 1)
  const endUtc = Date.UTC(fyYear + 1, startMonth - 1, 0) // 下个月 0 日 = 本月最后一天

  const today = Date.UTC(y, m - 1, d)
  const totalDays = Math.round((endUtc - startUtc) / 86400000) + 1
  const elapsed = Math.round((today - startUtc) / 86400000) + 1
  const progress = Math.min(100, Math.max(0, (elapsed / totalDays) * 100))
  const daysToEnd = Math.round((endUtc - today) / 86400000) + 1

  const endDate = new Date(endUtc)
  return {
    fyLabel: `FY${fyYear}`,
    start: `${fyYear}-${pad2(startMonth)}-01`,
    end: `${endDate.getUTCFullYear()}-${pad2(endDate.getUTCMonth() + 1)}-${pad2(endDate.getUTCDate())}`,
    progress,
    daysToEnd,
  }
}

/** T2 同步入口 */
export function transform(input: FiscalYearInput, options: FiscalYearOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const { y, m, d } = parseDate(text)
  const info = fiscalYearInfo(y, m, d, Number(options.startMonth))
  return [
    `日期：${y}-${pad2(m)}-${pad2(d)}`,
    `所属财年：${info.fyLabel}`,
    `财年起止：${info.start} ~ ${info.end}`,
    `财年进度：${info.progress.toFixed(1)}%`,
    `距财年末：${info.daysToEnd} 天`,
  ].join('\n')
}
