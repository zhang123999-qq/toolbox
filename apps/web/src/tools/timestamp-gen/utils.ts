import type { TsGenInput, TsGenOptions } from './schema'

function pad2(n: number): string {
  return n < 10 ? '0' + String(n) : String(n)
}

let zoneSet: Set<string> | null = null
function knownZones(): Set<string> {
  if (zoneSet) return zoneSet
  zoneSet =
    typeof Intl.supportedValuesOf === 'function'
      ? new Set(Intl.supportedValuesOf('timeZone'))
      : new Set()
  return zoneSet
}

/** 校验 IANA 时区名（白名单 + 构造法兜底） */
export function isValidTimeZone(tz: string): boolean {
  if (knownZones().has(tz)) return true
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export interface Wall {
  y: number
  mo: number
  d: number
  h: number
  mi: number
  s: number
}

/** 某时刻在指定时区的墙上时间分量 */
export function wallParts(date: Date, tz: string): Wall {
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
  const get = (type: string): number =>
    Number(dtf.formatToParts(date).find((p) => p.type === type)?.value ?? '0')
  return {
    y: get('year'),
    mo: get('month'),
    d: get('day'),
    h: get('hour') % 24,
    mi: get('minute'),
    s: get('second'),
  }
}

/** 指定时区在某时刻相对 UTC 的偏移（分钟，东为正） */
export function zoneOffsetMinutes(tz: string, date: Date): number {
  const w = wallParts(date, tz)
  const asUTC = Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s)
  return Math.round((asUTC - date.getTime()) / 60000)
}

/** 解析输入墙上时间分量；非法抛中文错误 */
export function parseWall(text: string): Wall {
  const m = text
    .trim()
    .match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/)
  if (!m) throw new Error(`无法解析的日期时间：${text}（示例：2026-09-27 15:30:00）`)
  const [, y, mo, d, h = '0', mi = '0', s = '0'] = m
  const wall = {
    y: Number(y),
    mo: Number(mo),
    d: Number(d),
    h: Number(h),
    mi: Number(mi),
    s: Number(s),
  }
  // 时间分量区间校验，避免 25:99:99 被 Date 静默进位
  if (wall.h > 23 || wall.mi > 59 || wall.s > 59) {
    throw new Error(`时间越界：${text}`)
  }
  const probe = new Date(wall.y, wall.mo - 1, wall.d)
  if (
    probe.getFullYear() !== wall.y ||
    probe.getMonth() !== wall.mo - 1 ||
    probe.getDate() !== wall.d
  ) {
    throw new Error(`非法日期：${text}`)
  }
  return wall
}

/** 把「指定时区的墙上时间」反推为 UTC 毫秒时刻（两次迭代处理 DST 跳变） */
export function wallToInstant(tz: string, wall: Wall): number {
  const guess = Date.UTC(wall.y, wall.mo - 1, wall.d, wall.h, wall.mi, wall.s)
  const off1 = zoneOffsetMinutes(tz, new Date(guess))
  let inst = guess - off1 * 60000
  const off2 = zoneOffsetMinutes(tz, new Date(inst))
  inst = guess - off2 * 60000
  return inst
}

/** T2 同步入口 */
export function transform(input: TsGenInput, options: TsGenOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const wall = parseWall(input.text)
  const zone = options.zone.trim()

  let instant: number
  let usedZone: string
  if (zone === '') {
    // 留空：按浏览器本地时区解释墙上时间
    instant = new Date(wall.y, wall.mo - 1, wall.d, wall.h, wall.mi, wall.s).getTime()
    usedZone = '本地时区'
  } else {
    if (!isValidTimeZone(zone))
      throw new Error(`非法时区：${zone}（请用 IANA 名，如 Asia/Shanghai）`)
    instant = wallToInstant(zone, wall)
    usedZone = zone
  }

  const utc = wallParts(new Date(instant), 'UTC')
  const utcLabel = `${utc.y}-${pad2(utc.mo)}-${pad2(utc.d)} ${pad2(utc.h)}:${pad2(utc.mi)}:${pad2(utc.s)}`

  return [
    `输入：${input.text.trim()}（${usedZone}）`,
    `Unix 秒：${Math.floor(instant / 1000)}`,
    `Unix 毫秒：${instant}`,
    `UTC：${utcLabel}`,
  ].join('\n')
}
