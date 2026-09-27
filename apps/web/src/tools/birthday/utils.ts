import type { BirthdayInput, BirthdayOptions } from './schema'

const WEEKDAYS_CN = ['日', '一', '二', '三', '四', '五', '六'] as const

function pad2(n: number): string {
  return n < 10 ? '0' + String(n) : String(n)
}

export function localDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export interface ParsedBirthday {
  month0: number
  day: number
  birthYear: number | null
}

/**
 * 解析生日：
 * - `YYYY-MM-DD` / `YYYY/MM/DD`：带年份（用于算年龄）
 * - `MM-DD` / `MM/DD`：只给月日
 */
export function parseBirthday(text: string): ParsedBirthday {
  const t = text.trim()
  if (t === '') throw new Error('生日不能为空')

  const full = t.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (full) {
    const y = Number(full[1])
    const mo = Number(full[2])
    const da = Number(full[3])
    validateMonthDay(mo, da)
    return { month0: mo - 1, day: da, birthYear: y }
  }
  const md = t.match(/^(\d{1,2})[-/](\d{1,2})$/)
  if (md) {
    const mo = Number(md[1])
    const da = Number(md[2])
    validateMonthDay(mo, da)
    return { month0: mo - 1, day: da, birthYear: null }
  }
  throw new Error('无法解析的生日格式：' + t + '（示例 05-20 或 1990-05-20）')
}

function validateMonthDay(mo: number, da: number): void {
  if (mo < 1 || mo > 12) throw new Error('月份越界：' + mo + '（应为 1-12）')
  if (da < 1 || da > 31) throw new Error('日期越界：' + da)
  // 用 2024（闰年）做存在性校验
  const probe = new Date(2024, mo - 1, da)
  if (probe.getMonth() !== mo - 1 || probe.getDate() !== da) {
    throw new Error('日期越界：' + mo + ' 月没有 ' + da + ' 日')
  }
}

/**
 * 下一次生日的日期（含今天）。
 * 2-29 出生在平年用 2-28 庆祝（与 date-calc / age 一致）。
 */
export function nextBirthdayDate(
  now: Date,
  month0: number,
  day: number,
): { date: Date; leapFallback: boolean } {
  const thisYear = now.getFullYear()
  function at(year: number): { date: Date; fallback: boolean } {
    if (month0 === 1 && day === 29 && !isLeapYear(year)) {
      return { date: new Date(year, 1, 28, 0, 0, 0), fallback: true }
    }
    return { date: new Date(year, month0, day, 0, 0, 0), fallback: false }
  }
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  let cur = at(thisYear)
  if (cur.date.getTime() < todayStart.getTime()) {
    cur = at(thisYear + 1)
  }
  return { date: cur.date, leapFallback: cur.fallback }
}

/** T2 同步入口（以打开页面时刻为「现在」计算静态倒计时） */
export function transform(input: BirthdayInput, _options: BirthdayOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const bd = parseBirthday(text)
  const now = new Date()
  const { date, leapFallback } = nextBirthdayDate(now, bd.month0, bd.day)
  const diffMs = date.getTime() - now.getTime()
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000))
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const wd = '星期' + WEEKDAYS_CN[date.getDay()]

  const lines: string[] = [
    `生日：${pad2(bd.month0 + 1)}-${pad2(bd.day)}${bd.birthYear ? '（' + bd.birthYear + ' 年生）' : ''}`,
    `下一次生日：${localDate(date)}（${wd}）`,
  ]
  if (isToday) {
    lines.push('就是今天！生日快乐！')
  } else {
    lines.push(`倒计时：${days} 天 ${pad2(hours)} 时 ${pad2(minutes)} 分 ${pad2(seconds)} 秒`)
  }
  if (bd.birthYear != null) {
    // 到下一次生日时的周岁
    const turningAge = date.getFullYear() - bd.birthYear
    lines.push(`届时将满 ${turningAge} 周岁`)
  }
  if (leapFallback) {
    lines.push('注：2 月 29 日生日，平年按 2 月 28 日庆祝。')
  }
  return lines.join('\n')
}
