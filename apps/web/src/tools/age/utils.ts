import type { AgeInput, AgeOptions } from './schema'

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

function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate()
}

/** 生肖：(year - 4) % 12，0=鼠 … 11=猪 */
export const ZODIAC_CN = [
  '鼠',
  '牛',
  '虎',
  '兔',
  '龙',
  '蛇',
  '马',
  '羊',
  '猴',
  '鸡',
  '狗',
  '猪',
] as const

export function zodiac(year: number): string {
  return ZODIAC_CN[(((year - 4) % 12) + 12) % 12]
}

/** 星座按 (月, 日) 区间表，返回中文名 */
export function westernZodiac(month0: number, day: number): string {
  // 用「月*100+日」做单调比较，边界日期落在后一个星座
  const v = (month0 + 1) * 100 + day
  if (v >= 321 && v <= 419) return '白羊座'
  if (v >= 420 && v <= 520) return '金牛座'
  if (v >= 521 && v <= 621) return '双子座'
  if (v >= 622 && v <= 722) return '巨蟹座'
  if (v >= 723 && v <= 822) return '狮子座'
  if (v >= 823 && v <= 922) return '处女座'
  if (v >= 923 && v <= 1023) return '天秤座'
  if (v >= 1024 && v <= 1122) return '天蝎座'
  if (v >= 1123 && v <= 1221) return '射手座'
  // 摩羯座跨年末年初：1222-1231 与 101-119
  if (v >= 1222 || v <= 119) return '摩羯座'
  if (v >= 120 && v <= 218) return '水瓶座'
  if (v >= 219 && v <= 320) return '双鱼座'
  return '未知'
}

/** 周岁：参考日是否已过当年生日 */
export interface AgeParts {
  years: number
  months: number
  days: number
  totalDays: number
}

export function ageParts(birth: Date, ref: Date): AgeParts {
  if (birth.getTime() > ref.getTime()) {
    throw new Error('出生日期晚于参考日期，无法计算年龄')
  }
  let years = ref.getFullYear() - birth.getFullYear()
  let months = ref.getMonth() - birth.getMonth()
  let days = ref.getDate() - birth.getDate()

  // 从参考日出发逐月向前借日，直到 days >= 0。
  // 出生于 31 日、参考日落在短月时（如 1/31 出生、3/1 参考），
  // 借 2 月后仍为负，需继续借上一月，否则会输出负数天数。
  let borrowMonth = ref.getMonth()
  let borrowYear = ref.getFullYear()
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

  const totalDays = Math.round((ref.getTime() - birth.getTime()) / 86_400_000)
  return { years, months, days, totalDays }
}

/**
 * 下一个生日（含今天）。
 * 2 月 29 日出生的人在平年用 2 月 28 日庆祝（与 date-calc 的回退策略一致）。
 */
export function nextBirthday(ref: Date, birthMonth0: number, birthDay: number): Date {
  const todayNoon = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 12, 0, 0)
  function at(year: number): Date {
    if (birthMonth0 === 1 && birthDay === 29 && !isLeapYear(year)) {
      return new Date(year, 1, 28, 12, 0, 0)
    }
    return new Date(year, birthMonth0, birthDay, 12, 0, 0)
  }
  let candidate = at(ref.getFullYear())
  if (candidate.getTime() < todayNoon.getTime()) {
    candidate = at(ref.getFullYear() + 1)
  }
  return candidate
}

const DAY_MS = 86_400_000

/** T2 同步入口 */
export function transform(input: AgeInput, _options: AgeOptions): string {
  const birthText = input.text.trim()
  if (birthText === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const birth = parseDate(birthText)
  const refText = input.textB.trim()
  const ref = refText === '' ? new Date() : parseDate(refText)

  const parts = ageParts(birth, ref)
  const next = nextBirthday(ref, birth.getMonth(), birth.getDate())
  const todayNoon = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 12, 0, 0)
  const daysToNext = Math.round((next.getTime() - todayNoon.getTime()) / DAY_MS)

  const lunar = zodiac(birth.getFullYear())
  const western = westernZodiac(birth.getMonth(), birth.getDate())

  const lines = [
    `出生日期：${localDate(birth)}`,
    `参考日期：${localDate(ref)}`,
    `年龄：${parts.years} 岁 ${parts.months} 个月 ${parts.days} 天`,
    `（约 ${parts.totalDays} 天）`,
    `生肖：${lunar}`,
    `星座：${western}`,
  ]
  if (daysToNext === 0) {
    lines.push('下一个生日：就是今天！生日快乐！')
  } else {
    lines.push(`距下一个生日：${daysToNext} 天（${localDate(next)}）`)
  }
  if (birth.getMonth() === 1 && birth.getDate() === 29) {
    lines.push('注：2 月 29 日出生，平年按 2 月 28 日庆祝生日。')
  }
  return lines.join('\n')
}
