import type { WorldClockInput, WorldClockOptions } from './schema'

/** 两位补零 */
function pad2(n: number): string {
  return n < 10 ? '0' + String(n) : String(n)
}

/** 浏览器 / 运行时支持的全部 IANA 时区（缓存） */
let zoneSet: Set<string> | null = null
function knownZones(): Set<string> {
  if (zoneSet) return zoneSet
  if (typeof Intl.supportedValuesOf === 'function') {
    zoneSet = new Set(Intl.supportedValuesOf('timeZone'))
  } else {
    zoneSet = new Set()
  }
  return zoneSet
}

/**
 * 校验 IANA 时区名。
 * 优先用 Intl.supportedValuesOf('timeZone') 的白名单快速判定；
 * 不在白名单里的（如 UTC 这类别名）再退化为尝试构造 Intl.DateTimeFormat
 * （非法名会抛 RangeError），两者都通过才算合法。
 */
export function isValidTimeZone(tz: string): boolean {
  const list = knownZones()
  if (list.size > 0 && list.has(tz)) return true
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export interface WallParts {
  y: number
  mo: number
  d: number
  h: number
  mi: number
  s: number
}

/** 取某一时刻在指定时区的墙上时间分量（年/月/日/时/分/秒） */
export function wallParts(date: Date, tz: string): WallParts {
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

/**
 * 指定时区在某时刻相对 UTC 的偏移（分钟，东为正）。
 * 做法：把该时区的墙上时间当作 UTC 构造一个 Date，它与真实时刻的差即偏移。
 * DST 由 Intl 自动体现，无需手写偏移表。
 */
export function zoneOffsetMinutes(tz: string, date: Date): number {
  const w = wallParts(date, tz)
  const asUTC = Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s)
  return Math.round((asUTC - date.getTime()) / 60000)
}

/** 偏移分钟 → "+08:00" / "-04:00" */
export function offsetLabel(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '-'
  const abs = Math.abs(minutes)
  return `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`
}

/** 把墙上分量格式化为一行日期时间 */
function formatDateTime(w: WallParts, hour12: boolean): string {
  const date = `${w.y}-${pad2(w.mo)}-${pad2(w.d)}`
  if (!hour12) return `${date} ${pad2(w.h)}:${pad2(w.mi)}:${pad2(w.s)}`
  const isPM = w.h >= 12
  const h12 = w.h % 12 === 0 ? 12 : w.h % 12
  return `${date} ${pad2(h12)}:${pad2(w.mi)}:${pad2(w.s)} ${isPM ? '下午' : '上午'}`
}

/** 解析输入：每行一个时区名，去空白、去空行 */
export function parseZoneList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
}

export interface ZoneRow {
  zone: string
  line: string
}

/** 生成全部时区行（now 可注入便于测试） */
export function buildRows(zones: string[], hour12: boolean, now: Date): ZoneRow[] {
  const width = zones.reduce((max, z) => Math.max(max, z.length), 0)
  return zones.map((zone) => {
    const w = wallParts(now, zone)
    const off = offsetLabel(zoneOffsetMinutes(zone, now))
    const name = zone.padEnd(width, ' ')
    return { zone, line: `${name}  ${formatDateTime(w, hour12)}  (UTC${off})` }
  })
}

/** T2 同步入口 */
export function transform(input: WorldClockInput, options: WorldClockOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const zones = parseZoneList(input.text)
  if (zones.length === 0) return ''
  for (const zone of zones) {
    if (!isValidTimeZone(zone)) {
      throw new Error(`非法时区名：${zone}（请使用 IANA 名，如 Asia/Shanghai）`)
    }
  }
  return buildRows(zones, options.hour12, new Date())
    .map((r) => r.line)
    .join('\n')
}
