import type { LunarInput, LunarOptions } from './schema'

/**
 * 农历数据表（1900–2100，共 201 年）。
 *
 * 每个整数按 20bit 编码一年农历信息（标准紧凑编码，公开历书数据整理）：
 * - bit16（0x10000）：当年若有闰月，闰月大小；1=大月30天，0=小月29天
 * - bit15..bit4（0x8000..0x10）：正月..十二月的大小，1=大月30天，0=小月29天
 * - bit3..bit0（0x000f）：闰月月份，0 表示该年无闰月
 *
 * 基准日：1900-01-31 = 农历 1900 年正月初一。
 */
export const LUNAR_INFO: readonly number[] = [
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

/** 基准：1900-01-31（农历 1900 正月初一）的 UTC 毫秒 */
const BASE_MS = Date.UTC(1900, 0, 31)
const DAY_MS = 86400000

export const MIN_LUNAR_YEAR = 1900
export const MAX_LUNAR_YEAR = 2100

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const ANIMALS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']

function info(year: number): number {
  const i = year - MIN_LUNAR_YEAR
  if (i < 0 || i >= LUNAR_INFO.length)
    throw new Error(`超出农历覆盖范围：仅支持 ${MIN_LUNAR_YEAR}–${MAX_LUNAR_YEAR} 年`)
  return LUNAR_INFO[i]
}

/** 当年闰月月份，0 = 无闰 */
export function leapMonth(year: number): number {
  return info(year) & 0xf
}

/** 闰月天数（无闰月返回 0） */
export function leapDays(year: number): number {
  if (!leapMonth(year)) return 0
  return info(year) & 0x10000 ? 30 : 29
}

/** 正月..十二月中第 m 月（1..12）的天数 */
export function monthDays(year: number, m: number): number {
  return info(year) & (0x10000 >> m) ? 30 : 29
}

/** 农历一年总天数（12 或 13 个月） */
export function yearDays(year: number): number {
  let sum = 348 // 12 * 29
  for (let bit = 0x8000; bit > 0x8; bit >>= 1) {
    if (info(year) & bit) sum += 1
  }
  return sum + leapDays(year)
}

interface Slot {
  readonly month: number
  readonly isLeap: boolean
  readonly days: number
}

/** 农历一年的有序月槽：正常月 1..12，闰月插在对应正常月之后 */
function slotsOf(year: number): Slot[] {
  const leap = leapMonth(year)
  const slots: Slot[] = []
  for (let m = 1; m <= 12; m++) {
    slots.push({ month: m, isLeap: false, days: monthDays(year, m) })
    if (leap > 0 && m === leap) slots.push({ month: leap, isLeap: true, days: leapDays(year) })
  }
  return slots
}

export interface LunarDate {
  readonly year: number
  readonly month: number
  readonly day: number
  readonly isLeap: boolean
}

/** 公历 → 农历 */
export function solar2lunar(
  gY: number,
  gM: number,
  gD: number,
): LunarDate & { ganzhi: string; animal: string } {
  const dateMs = Date.UTC(gY, gM - 1, gD)
  let offset = Math.round((dateMs - BASE_MS) / DAY_MS)
  if (offset < 0) throw new Error('日期早于 1900-01-31，超出农历覆盖范围')
  let year = MIN_LUNAR_YEAR
  while (year < MAX_LUNAR_YEAR && offset >= yearDays(year)) {
    offset -= yearDays(year)
    year++
  }
  if (offset >= yearDays(year)) throw new Error('该公历日期超出农历覆盖范围（2100 年末之后）')
  const slots = slotsOf(year)
  let i = 0
  while (i < slots.length && offset >= slots[i].days) {
    offset -= slots[i].days
    i++
  }
  const slot = slots[i]
  return {
    year,
    month: slot.month,
    day: offset + 1,
    isLeap: slot.isLeap,
    ganzhi: STEMS[(((year - 4) % 10) + 10) % 10] + BRANCHES[(((year - 4) % 12) + 12) % 12],
    animal: ANIMALS[(((year - 4) % 12) + 12) % 12],
  }
}

/** 农历 → 公历，返回 { y, m, d }（公历） */
export function lunar2solar(
  lY: number,
  lM: number,
  lD: number,
  isLeap: boolean,
): { y: number; m: number; d: number } {
  if (lY < MIN_LUNAR_YEAR || lY > MAX_LUNAR_YEAR) {
    throw new Error(`超出农历覆盖范围：仅支持 ${MIN_LUNAR_YEAR}–${MAX_LUNAR_YEAR} 年`)
  }
  const leap = leapMonth(lY)
  if (isLeap && leap !== lM) throw new Error(`${lY} 年没有闰 ${lM} 月`)
  if (lM < 1 || lM > 12) throw new Error('农历月份须在 1–12 之间')
  const slots = slotsOf(lY)
  const target = slots.find((s) => s.month === lM && s.isLeap === isLeap)
  if (!target) throw new Error(`${lY} 年没有该月${isLeap ? '（闰月）' : ''}`)
  if (lD < 1 || lD > target.days) throw new Error(`该农历月只有 ${target.days} 天`)
  let offset = 0
  for (let y = MIN_LUNAR_YEAR; y < lY; y++) offset += yearDays(y)
  for (const s of slots) {
    if (s.month === lM && s.isLeap === isLeap) {
      offset += lD - 1
      break
    }
    offset += s.days
  }
  const dt = new Date(BASE_MS + offset * DAY_MS)
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() }
}

// 月份名：1=正月 … 9=九月、10=十月、11=冬月、12=腊月（共 12 项）
const CN_MONTH = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊']
const CN_DAY1 = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

/** 农历月中文名：正月 / 闰二月 / … */
export function cnMonth(month: number, isLeap: boolean): string {
  return (isLeap ? '闰' : '') + CN_MONTH[month - 1] + '月'
}

/** 农历日中文名：初一 / 十五 / 廿三 / 三十 */
export function cnDay(day: number): string {
  if (day === 10) return '初十'
  if (day === 20) return '二十'
  if (day === 30) return '三十'
  const tens = ['初', '十', '廿', '卅']
  return tens[Math.floor((day - 1) / 10)] + CN_DAY1[(day - 1) % 10]
}

function validSolar(y: number, m: number, d: number): boolean {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false
  if (y < 1900 || y > 2100) return false
  if (m < 1 || m > 12 || d < 1 || d > 31) return false
  // 月日存在性回读：避免 2023-02-30 这类被 Date.UTC 静默进位成 3 月 2 日
  const probe = new Date(Date.UTC(y, m - 1, d))
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d
}

/** 解析日期文本为数值 */
function parseDate(text: string): { y: number; m: number; d: number; leap: boolean } {
  const cleaned = text.trim()
  // 支持「闰」前缀在月段，例如 2023-闰2-1
  const hasLeap = cleaned.includes('闰')
  const nums = cleaned.match(/\d+/g)
  if (!nums || nums.length < 3)
    throw new Error('无法识别日期，请用「年-月-日」格式，例如 2025-1-29')
  const y = Number(nums[0])
  const m = Number(nums[1])
  const d = Number(nums[2])
  return { y, m, d, leap: hasLeap }
}

/** 主转换：空输入返回空串；越界 / 非法抛中文错误 */
export function transform(input: LunarInput, options: LunarOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const { y, m, d, leap } = parseDate(input.text)

  if (options.direction === 'solar2lunar') {
    if (!validSolar(y, m, d)) throw new Error('非法或超出范围的公历日期（仅支持 1900–2100）')
    const r = solar2lunar(y, m, d)
    return [
      `公历 ${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      `农历：${r.year} 年 ${cnMonth(r.month, r.isLeap)}${cnDay(r.day)}`,
      `干支：${r.ganzhi}年（生肖属${r.animal}）`,
    ].join('\n')
  }

  // lunar2solar
  const s = lunar2solar(y, m, d, leap)
  return [
    `农历 ${y} 年 ${cnMonth(m, leap)}${cnDay(d)}`,
    `公历：${s.y}-${String(s.m).padStart(2, '0')}-${String(s.d).padStart(2, '0')}`,
  ].join('\n')
}
