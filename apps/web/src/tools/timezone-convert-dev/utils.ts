import type { TzInput, TzOptions } from './schema'

/** 常用时区（IANA 标识），下拉选项直接复用 */
export const TIMEZONES = [
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Singapore',
  'Asia/Bangkok',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Africa/Cairo',
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Australia/Sydney',
  'Pacific/Auckland',
] as const

function pad2(n: number): string {
  return n < 10 ? '0' + String(n) : String(n)
}

/**
 * 把「某时区下的墙上时间」换算成 UTC 毫秒时间戳。
 * 思路：先把它当 UTC 猜一个时刻，再用 Intl 读出该时刻在目标时区的墙上时间，
 * 两者之差即该时区相对 UTC 的偏移，回代得到真实时刻。
 */
export function wallToInstant(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  s: number,
  tz: string,
): number {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s)
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts: Record<string, number> = {}
  for (const p of dtf.formatToParts(new Date(guess))) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value)
  }
  // 兼容 hour12=false 在凌晨可能给出 "24"
  const hour = parts.hour === 24 ? 0 : parts.hour
  const rendered = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    hour,
    parts.minute,
    parts.second,
  )
  return guess - (rendered - guess)
}

/** 用 Intl 把毫秒时刻格式化成 `YYYY-MM-DD HH:mm:ss`（指定时区） */
export function formatInTz(ms: number, tz: string): string {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts: Record<string, number> = {}
  for (const p of dtf.formatToParts(new Date(ms))) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value)
  }
  const hour = parts.hour === 24 ? 0 : parts.hour
  return (
    `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)} ` +
    `${pad2(hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`
  )
}

/** 解析 `YYYY-MM-DD[ HH:mm[:ss]]` */
function parseWall(text: string): {
  y: number
  mo: number
  d: number
  h: number
  mi: number
  s: number
} {
  const m = text
    .trim()
    .match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/)
  if (!m) throw new Error('日期格式应为 YYYY-MM-DD [HH:mm:ss]')
  const [, y, mo, d, h = '0', mi = '0', s = '0'] = m
  return {
    y: Number(y),
    mo: Number(mo),
    d: Number(d),
    h: Number(h),
    mi: Number(mi),
    s: Number(s),
  }
}

/** T2 同步入口 */
export function transform(input: TzInput, options: TzOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  if (!(TIMEZONES as readonly string[]).includes(options.fromTz)) {
    throw new Error('未知的源时区：' + options.fromTz)
  }
  if (!(TIMEZONES as readonly string[]).includes(options.toTz)) {
    throw new Error('未知的目标时区：' + options.toTz)
  }
  const w = parseWall(text)
  const ms = wallToInstant(w.y, w.mo, w.d, w.h, w.mi, w.s, options.fromTz)
  if (Number.isNaN(ms)) throw new Error('时间换算失败')
  return [
    `${options.fromTz}：${formatInTz(ms, options.fromTz)}`,
    `${options.toTz}：${formatInTz(ms, options.toTz)}`,
    `UTC：${formatInTz(ms, 'UTC')}`,
  ].join('\n')
}
