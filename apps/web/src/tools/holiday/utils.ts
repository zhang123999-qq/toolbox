import type { HolidayInput, HolidayOptions } from './schema'

/**
 * 本工具**自包含**一份最小农历核心（不 import 其它工具）。
 * 仅用于把农历节日（春节/元宵/端午/中秋）换算到公历。
 * 数据表与编码同「公历农历互转」工具：1900–2100，每年一个 hex。
 */
const LUNAR_INFO: readonly number[] = [
  0x04bd8,
  0x04ae0,
  0x0a570,
  0x054d5,
  0x0d260,
  0x0d950,
  0x16554,
  0x056a0,
  0x09ad0,
  0x055d2, //1900-1909
  0x04ae0,
  0x0a5b6,
  0x0a4d0,
  0x0d250,
  0x1d255,
  0x0b540,
  0x0d6a0,
  0x0ada2,
  0x095b0,
  0x14977, //1910-1919
  0x04970,
  0x0a4b0,
  0x0b4b5,
  0x06a50,
  0x06d40,
  0x1ab54,
  0x02b60,
  0x09570,
  0x052f2,
  0x04970, //1920-1929
  0x06566,
  0x0d4a0,
  0x0ea50,
  0x06e95,
  0x05ad0,
  0x02b60,
  0x186e3,
  0x092e0,
  0x1c8d7,
  0x0c950, //1930-1939
  0x0d4a0,
  0x1d8a6,
  0x0b550,
  0x056a0,
  0x1a5b4,
  0x025d0,
  0x092d0,
  0x0d2b2,
  0x0a950,
  0x0b557, //1940-1949
  0x06ca0,
  0x0b550,
  0x15355,
  0x04da0,
  0x0a5b0,
  0x14573,
  0x052b0,
  0x0a9a8,
  0x0e950,
  0x06aa0, //1950-1959
  0x0aea6,
  0x0ab50,
  0x04b60,
  0x0aae4,
  0x0a570,
  0x05260,
  0x0f263,
  0x0d950,
  0x05b57,
  0x056a0, //1960-1969
  0x096d0,
  0x04dd5,
  0x04ad0,
  0x0a4d0,
  0x0d4d4,
  0x0d250,
  0x0d558,
  0x0b540,
  0x0b6a0,
  0x195a6, //1970-1979
  0x095b0,
  0x049b0,
  0x0a974,
  0x0a4b0,
  0x0b27a,
  0x06a50,
  0x06d40,
  0x0af46,
  0x0ab60,
  0x09570, //1980-1989
  0x04af5,
  0x04970,
  0x064b0,
  0x074a3,
  0x0ea50,
  0x06b58,
  0x055c0,
  0x0ab60,
  0x096d5,
  0x092e0, //1990-1999
  0x0c960,
  0x0d954,
  0x0d4a0,
  0x0da50,
  0x07552,
  0x056a0,
  0x0abb7,
  0x025d0,
  0x092d0,
  0x0cab5, //2000-2009
  0x0a950,
  0x0b4a0,
  0x0baa4,
  0x0ad50,
  0x055d9,
  0x04ba0,
  0x0a5b0,
  0x15176,
  0x052b0,
  0x0a930, //2010-2019
  0x07954,
  0x06aa0,
  0x0ad50,
  0x05b52,
  0x04b60,
  0x0a6e6,
  0x0a4e0,
  0x0d260,
  0x0ea65,
  0x0d530, //2020-2029
  0x05aa0,
  0x076a3,
  0x096d0,
  0x04afb,
  0x04ad0,
  0x0a4d0,
  0x1d0b6,
  0x0d250,
  0x0d520,
  0x0dd45, //2030-2039
  0x0b5a0,
  0x056d0,
  0x055b2,
  0x049b0,
  0x0a577,
  0x0a4b0,
  0x0aa50,
  0x1b255,
  0x06d20,
  0x0ada0, //2040-2049
  0x14b63,
  0x09370,
  0x049f8,
  0x04970,
  0x064b0,
  0x168a6,
  0x0ea50,
  0x06b20,
  0x1a6c4,
  0x0aae0, //2050-2059
  0x0a2e0,
  0x0d2e3,
  0x0c960,
  0x0d557,
  0x0d4a0,
  0x0da50,
  0x05d55,
  0x056a0,
  0x0a6d0,
  0x055d4, //2060-2069
  0x052d0,
  0x0a9b8,
  0x0a950,
  0x0b4a0,
  0x0b6a6,
  0x0ad50,
  0x055a0,
  0x0aba4,
  0x0a5b0,
  0x052b0, //2070-2079
  0x0b273,
  0x06930,
  0x07337,
  0x06aa0,
  0x0ad50,
  0x14b55,
  0x04b60,
  0x0a570,
  0x054e4,
  0x0d160, //2080-2089
  0x0e968,
  0x0d520,
  0x0daa0,
  0x16aa6,
  0x056d0,
  0x04ae0,
  0x0a9d4,
  0x0a2d0,
  0x0d150,
  0x0f252, //2090-2099
  0x0d520, //2100
]

const BASE_MS = Date.UTC(1900, 0, 31)
const DAY_MS = 86400000

function leapMonthOf(y: number): number {
  return LUNAR_INFO[y - 1900] & 0xf
}
function leapDaysOf(y: number): number {
  return leapMonthOf(y) ? (LUNAR_INFO[y - 1900] & 0x10000 ? 30 : 29) : 0
}
function monthDaysOf(y: number, m: number): number {
  return LUNAR_INFO[y - 1900] & (0x10000 >> m) ? 30 : 29
}
function yearDaysOf(y: number): number {
  let sum = 348
  for (let bit = 0x8000; bit > 0x8; bit >>= 1) if (LUNAR_INFO[y - 1900] & bit) sum += 1
  return sum + leapDaysOf(y)
}

interface Slot {
  readonly month: number
  readonly isLeap: boolean
  readonly days: number
}

/** 农历→公历（仅正常月，节日不会落在闰月） */
export function lunarToSolar(
  lY: number,
  lM: number,
  lD: number,
): { y: number; m: number; d: number } {
  if (lY < 1900 || lY > 2100) throw new Error('超出农历覆盖范围：仅支持 1900–2100 年')
  const leap = leapMonthOf(lY)
  const slots: Slot[] = []
  for (let m = 1; m <= 12; m++) {
    slots.push({ month: m, isLeap: false, days: monthDaysOf(lY, m) })
    if (leap > 0 && m === leap) slots.push({ month: leap, isLeap: true, days: leapDaysOf(lY) })
  }
  let offset = 0
  for (let y = 1900; y < lY; y++) offset += yearDaysOf(y)
  let done = false
  for (const s of slots) {
    if (s.month === lM && !s.isLeap) {
      offset += lD - 1
      done = true
      break
    }
    offset += s.days
  }
  if (!done) throw new Error('农历月份非法')
  const dt = new Date(BASE_MS + offset * DAY_MS)
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() }
}

function fmt(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export interface Festival {
  readonly name: string
  readonly date: string
  readonly kind: 'solar' | 'lunar' | 'approx'
}

/** 列出某公历年的主要节日（规则推算，非法定调休） */
export function listFestivals(year: number): Festival[] {
  const items: Festival[] = [{ name: '元旦', date: fmt(year, 1, 1), kind: 'solar' }]
  // 清明：二十四节气，近似 4/4（节气需太阳黄经，这里按固定近似）
  items.push({ name: '清明（近似）', date: fmt(year, 4, 4), kind: 'approx' })
  items.push({ name: '劳动节', date: fmt(year, 5, 1), kind: 'solar' })
  items.push({ name: '国庆节', date: fmt(year, 10, 1), kind: 'solar' })

  // 农历节日：取农历年 year 的对应日期（通常落在公历年 year 内）
  const spring = lunarToSolar(year, 1, 1)
  const lantern = lunarToSolar(year, 1, 15)
  const dragon = lunarToSolar(year, 5, 5)
  const midautumn = lunarToSolar(year, 8, 15)
  items.push({ name: '春节', date: fmt(spring.y, spring.m, spring.d), kind: 'lunar' })
  items.push({ name: '元宵节', date: fmt(lantern.y, lantern.m, lantern.d), kind: 'lunar' })
  items.push({ name: '端午节', date: fmt(dragon.y, dragon.m, dragon.d), kind: 'lunar' })
  items.push({ name: '中秋节', date: fmt(midautumn.y, midautumn.m, midautumn.d), kind: 'lunar' })

  items.sort((a, b) => a.date.localeCompare(b.date))
  return items
}

/** 统计该公历年的周六 + 周日天数 */
export function countWeekends(year: number): number {
  let count = 0
  const start = Date.UTC(year, 0, 1)
  const end = Date.UTC(year + 1, 0, 1)
  for (let ms = start; ms < end; ms += DAY_MS) {
    const wd = new Date(ms).getUTCDay()
    if (wd === 0 || wd === 6) count++
  }
  return count
}

/** 解析年份 */
export function parseYear(text: string): number {
  const m = text.trim().match(/^(\d{4})$/)
  if (!m) throw new Error('无法识别年份，请输入四位整数年份，例如 2025')
  const y = Number(m[1])
  if (y < 1900 || y > 2100) throw new Error('年份超出覆盖范围：仅支持 1900–2100')
  return y
}

/** 主转换 */
export function transform(input: HolidayInput, _options: HolidayOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const year = parseYear(input.text)
  const list = listFestivals(year)
  const weekends = countWeekends(year)
  const lines = list.map(
    (f) =>
      `${f.date}  ${f.name}（${f.kind === 'lunar' ? '农历' : f.kind === 'approx' ? '节气近似' : '公历'}）`,
  )
  return [
    `${year} 年主要节日（规则推算）：`,
    ...lines,
    '',
    `全年周末（周六+周日）约 ${weekends} 天`,
    '注意：以上为按历法规则的推算，不含国务院法定调休/补班安排，非权威。',
  ].join('\n')
}
