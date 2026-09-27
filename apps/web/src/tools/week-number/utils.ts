import type { WeekNumberInput, WeekNumberOptions } from './schema'

const WEEKDAYS_CN = ['日', '一', '二', '三', '四', '五', '六'] as const

function pad2(n: number): string {
  return n < 10 ? '0' + String(n) : String(n)
}

export function localDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** 严格解析日期，越界中文报错 */
export function parseDate(text: string): Date {
  const t = text.trim()
  if (t === '') throw new Error('日期不能为空')
  if (/^\d{4}-\d{2}-\d{2}T/.test(t) || /Z$/.test(t)) {
    const d = new Date(t)
    if (!Number.isNaN(d.getTime())) return d
    throw new Error('无法解析的日期格式：' + t)
  }
  const m = t.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
  )
  if (m) {
    const [, ys, mos, ds, h = '0', mi = '0', s = '0'] = m
    const y = Number(ys)
    const mo = Number(mos)
    const da = Number(ds)
    if (mo < 1 || mo > 12) throw new Error('月份越界：' + mo + '（应为 1-12）')
    if (da < 1 || da > 31) throw new Error('日期越界：' + da)
    const d = new Date(y, mo - 1, da, Number(h), Number(mi), Number(s))
    if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== da) {
      throw new Error('日期越界：' + y + ' 年 ' + mo + ' 月没有 ' + da + ' 日')
    }
    if (!Number.isNaN(d.getTime())) return d
  }
  throw new Error('无法解析的日期格式：' + t)
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/** Date.getDay() 转 ISO 编号：周一=1 … 周日=7 */
function isoDow(d: Date): number {
  const g = d.getDay()
  return g === 0 ? 7 : g
}

export interface IsoWeek {
  year: number
  week: number
}

/**
 * 自研 ISO 8601 周算法：
 * 1. 本周周四所在的年份即 ISO 年（第 1 周含当年第一个周四 / 1 月 4 日）。
 * 2. 以 ISO 年第 1 周周一为基准，(目标周四 - 基准) / 7 得周号。
 */
export function isoWeek(d: Date): IsoWeek {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = isoDow(date)
  // 本周周四
  const thursday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + (4 - dow))
  const isoYear = thursday.getFullYear()
  // ISO 年 1 月 4 日必在第 1 周；找该周周一
  const jan4 = new Date(isoYear, 0, 4)
  const jan4Dow = isoDow(jan4)
  const week1Monday = new Date(isoYear, 0, 4 - (jan4Dow - 1))
  const diffDays = Math.round((thursday.getTime() - week1Monday.getTime()) / 86_400_000)
  const week = Math.floor(diffDays / 7) + 1
  return { year: isoYear, week }
}

/**
 * 某年的 ISO 总周数：
 * - 1 月 1 日是周四 → 53 周
 * - 闰年且 1 月 1 日是周三 → 53 周
 * - 否则 52 周
 */
export function isoWeeksInYear(year: number): number {
  const jan1 = new Date(year, 0, 1)
  const dow = isoDow(jan1)
  if (dow === 4) return 53
  if (dow === 3 && isLeapYear(year)) return 53
  return 52
}

/** 该周周一（00:00） */
export function mondayOfWeek(d: Date): Date {
  const dow = isoDow(d)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - (dow - 1))
}

/** 该周周日（00:00） */
export function sundayOfWeek(d: Date): Date {
  const dow = isoDow(d)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (7 - dow))
}

/** T2 同步入口 */
export function transform(input: WeekNumberInput, _options: WeekNumberOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const d = parseDate(text)
  const { year, week } = isoWeek(d)
  const totalWeeks = isoWeeksInYear(year)
  const dow = isoDow(d)
  const mon = mondayOfWeek(d)
  const sun = sundayOfWeek(d)

  return [
    `日期：${localDate(d)}`,
    `星期：${WEEKDAYS_CN[d.getDay()]}（ISO 周 ${dow}）`,
    `ISO 周数：${year}-W${pad2(week)}`,
    `该周周一：${localDate(mon)}`,
    `该周周日：${localDate(sun)}`,
    `${year} 年共 ${totalWeeks} 个 ISO 周`,
  ].join('\n')
}
