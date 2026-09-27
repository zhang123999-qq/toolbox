import type { DateCalcInput, DateCalcOptions } from './schema'

export const UNITS = ['year', 'month', 'week', 'day', 'hour', 'minute', 'second'] as const
export const OPS = ['add', 'subtract'] as const

const WEEKDAYS_CN = ['日', '一', '二', '三', '四', '五', '六'] as const

function pad2(n: number): string {
  return n < 10 ? '0' + String(n) : String(n)
}

/** 本地日期时间 `YYYY-MM-DD HH:mm:ss` */
export function local(d: Date): string {
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
    `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  )
}

/** 本地日期 `YYYY-MM-DD` */
export function localDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** 星期几（中文） */
export function weekdayCN(d: Date): string {
  return '星期' + WEEKDAYS_CN[d.getDay()]
}

/**
 * 严格解析用户输入的日期。
 * 支持 `YYYY-MM-DD[ HH:mm[:ss]]`、`YYYY/MM/DD[...]` 以及带 T/Z 的 ISO 串。
 * 越界日期（如 2 月 30 日）中文报错，不做静默回绕。
 */
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

/** 是否闰年 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/** 某年某月（0-11）的天数 */
export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate()
}

/**
 * 加减月份（自研溢出处理）：
 * 保留日号，若目标月没有这一天（如 1 月 31 日 +1 月 → 2 月），
 * 回退到目标月最后一天。
 */
export function addMonths(d: Date, months: number): Date {
  const day = d.getDate()
  const total = d.getMonth() + months
  const year = d.getFullYear() + Math.floor(total / 12)
  const month = ((total % 12) + 12) % 12
  const lastDay = daysInMonth(year, month)
  const newDay = Math.min(day, lastDay)
  return new Date(
    year,
    month,
    newDay,
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds(),
  )
}

/**
 * 加减年份：保留月日，闰年 2-29 落到平年时回退到 2-28。
 */
export function addYears(d: Date, years: number): Date {
  const year = d.getFullYear() + years
  const month = d.getMonth()
  const day = d.getDate()
  const lastDay = daysInMonth(year, month)
  const newDay = Math.min(day, lastDay)
  return new Date(
    year,
    month,
    newDay,
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds(),
  )
}

/** 加减天数（原生 Date 自动处理月年进位，时间部分保留） */
export function addDays(d: Date, days: number): Date {
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() + days,
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds(),
  )
}

/** 解析数量：必须是整数（允许负号），否则中文报错 */
function parseAmount(raw: string): number {
  const s = raw.trim()
  if (s === '') throw new Error('数量不能为空')
  if (!/^-?\d+$/.test(s)) throw new Error('数量必须是整数：' + s)
  return Number(s)
}

/** 对基准日期施加 数量×单位 的偏移（带方向） */
export function shiftDate(base: Date, op: string, amount: number, unit: string): Date {
  const sign = op === 'subtract' ? -1 : 1
  const n = sign * amount
  switch (unit) {
    case 'year':
      return addYears(base, n)
    case 'month':
      return addMonths(base, n)
    case 'week':
      return addDays(base, n * 7)
    case 'day':
      return addDays(base, n)
    case 'hour':
      return new Date(base.getTime() + n * 3600_000)
    case 'minute':
      return new Date(base.getTime() + n * 60_000)
    case 'second':
      return new Date(base.getTime() + n * 1000)
    default:
      throw new Error('不支持的单位：' + unit)
  }
}

const UNIT_CN: Record<string, string> = {
  year: '年',
  month: '个月',
  week: '周',
  day: '天',
  hour: '小时',
  minute: '分钟',
  second: '秒',
}

/** T2 同步入口 */
export function transform(input: DateCalcInput, options: DateCalcOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  if (!(OPS as readonly string[]).includes(options.op)) {
    throw new Error('不支持的操作：' + options.op)
  }
  if (!(UNITS as readonly string[]).includes(options.unit)) {
    throw new Error('不支持的单位：' + options.unit)
  }
  const base = parseDate(text)
  const amount = parseAmount(options.amount)
  const result = shiftDate(base, options.op, amount, options.unit)

  const opCN = options.op === 'add' ? '加' : '减'
  const sign = amount < 0 ? '（数量为负，方向已自动反转）' : ''
  const lines = [
    `基准日期：${local(base)} ${weekdayCN(base)}`,
    `操作：${opCN} ${Math.abs(amount)} ${UNIT_CN[options.unit]}${sign}`,
    `结果：${local(result)} ${weekdayCN(result)}`,
  ]
  // 溢出说明
  if (options.unit === 'year' && base.getMonth() === 1 && base.getDate() === 29) {
    if (!isLeapYear(result.getFullYear())) {
      lines.push(
        `说明：基准日为闰年 2 月 29 日，目标年 ${result.getFullYear()} 是平年，` +
          `2 月只有 28 天，已回退到 2 月 28 日。`,
      )
    }
  }
  if (options.unit === 'month' && base.getDate() > result.getDate()) {
    lines.push(
      `说明：基准日 ${base.getDate()} 日在目标月不存在，已回退到该月最后一天（${result.getDate()} 日）。`,
    )
  }
  return lines.join('\n')
}
