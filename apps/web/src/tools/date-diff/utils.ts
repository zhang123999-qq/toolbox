import type { DateDiffInput, DateDiffOptions } from './schema'

function pad2(n: number): string {
  return n < 10 ? '0' + String(n) : String(n)
}

export function localDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** 严格解析日期，越界中文报错（与 date-calc 同源逻辑，禁止跨工具 import，故复制） */
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

function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate()
}

export interface DiffParts {
  sign: 1 | -1
  years: number
  months: number
  days: number
  hours: number
  minutes: number
  seconds: number
}

/**
 * 把两个日期的差分解为「X 年 Y 个月 Z 天」形式（公历借位）。
 * 先按日历日做借位，再用毫秒差补足时分秒。
 */
export function diffParts(a: Date, b: Date): DiffParts {
  const ms = b.getTime() - a.getTime()
  const sign: 1 | -1 = ms >= 0 ? 1 : -1
  const early = ms >= 0 ? a : b
  const late = ms >= 0 ? b : a

  let years = late.getFullYear() - early.getFullYear()
  let months = late.getMonth() - early.getMonth()
  let days = late.getDate() - early.getDate()

  // 从 late 出发逐月向前借日，直到 days >= 0。
  // 只借一次不够：例如 early=1/31、late=3/1，借 2 月(28 天) 后 days 仍为负，
  // 需继续借 1 月(31 天) 才能转正，否则会输出负数天数。
  let borrowMonth = late.getMonth()
  let borrowYear = late.getFullYear()
  while (days < 0) {
    borrowMonth -= 1
    if (borrowMonth < 0) {
      borrowMonth = 11
      borrowYear -= 1
    }
    days += daysInMonth(borrowYear, borrowMonth)
    months -= 1
  }
  if (months < 0) {
    months += 12
    years -= 1
  }

  // 时分秒：取两个「当天 00:00」之外的毫秒差绝对值，拆成时/分/秒
  const absMs = Math.abs(ms)
  // 整天毫秒数（按 24h，忽略 DST 边界；本地时区下一般稳定）
  const totalSeconds = Math.floor(absMs / 1000)
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60) % 60
  const hours = Math.floor(totalSeconds / 3600) % 24

  return { sign, years, months, days, hours, minutes, seconds }
}

const DAY_MS = 86_400_000

/** T2 同步入口 */
export function transform(input: DateDiffInput, _options: DateDiffOptions): string {
  const aText = input.text.trim()
  const bText = input.textB.trim()
  if (aText === '' || bText === '') return ''
  if (input.text.length > 200000 || input.textB.length > 200000) {
    throw new Error('输入超过 200,000 字符上限')
  }

  const a = parseDate(aText)
  const b = parseDate(bText)
  const parts = diffParts(a, b)

  const absMs = Math.abs(b.getTime() - a.getTime())
  const totalSeconds = Math.round(absMs / 1000)
  const totalMinutes = Math.floor(totalSeconds / 60)
  const totalHours = Math.floor(totalSeconds / 3600)
  const totalDays = Math.round(absMs / DAY_MS)
  const totalWeeks = Math.floor(totalDays / 7)

  const dirCN = parts.sign === 1 ? '晚于' : '早于'
  const compound =
    `${parts.years} 年 ${parts.months} 个月 ${parts.days} 天` +
    `（${pad2(parts.hours)}:${pad2(parts.minutes)}:${pad2(parts.seconds)}）`

  return [
    `日期 A：${localDate(a)}`,
    `日期 B：${localDate(b)}`,
    `方向：B ${dirCN} A`,
    `复合间隔：${compound}`,
    `总天数：${totalDays} 天（约 ${totalWeeks} 周）`,
    `总小时：${totalHours} 小时`,
    `总分钟：${totalMinutes} 分钟`,
    `总秒数：${totalSeconds} 秒`,
  ].join('\n')
}
