import type { IsoWeekInput, IsoWeekOptions } from './schema'

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

export interface IsoWeekInfo {
  isoYear: number
  week: number
  weekday: number
  format: string
}

/**
 * 自研 ISO 8601 周日期算法。
 * 规则：ISO 周一是一周起点；含当年第一个周四的周为 W01。
 * 做法：把日期平移到所在 ISO 周的周四，以该周四的年份为 ISO 周年，
 * 再用「距该周年 1 月 1 日的天数」算周数。
 */
export function isoWeek(y: number, m: number, d: number): IsoWeekInfo {
  const dt = Date.UTC(y, m - 1, d)
  const dow = ((new Date(dt).getUTCDay() + 6) % 7) + 1 // Mon=1..Sun=7
  // 平移到本周周四
  const thursday = dt + (4 - dow) * 86400000
  const th = new Date(thursday)
  const isoYear = th.getUTCFullYear()
  const yearStart = Date.UTC(isoYear, 0, 1)
  const week = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7)
  return {
    isoYear,
    week,
    weekday: dow,
    format: `${isoYear}-W${pad2(week)}-${dow}`,
  }
}

/** T2 同步入口 */
export function transform(input: IsoWeekInput, _options: IsoWeekOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const { y, m, d } = parseDate(text)
  const info = isoWeek(y, m, d)
  const weekdayName = ['一', '二', '三', '四', '五', '六', '日'][info.weekday - 1]
  return [
    `日期：${y}-${pad2(m)}-${pad2(d)}`,
    `ISO 周日期：${info.format}`,
    `ISO 周年：${info.isoYear}`,
    `周数：W${pad2(info.week)}`,
    `星期：周${weekdayName}`,
  ].join('\n')
}
