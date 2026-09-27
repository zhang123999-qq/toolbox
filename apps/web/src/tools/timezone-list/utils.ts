import type { TzListInput, TzListOptions } from './schema'

function pad2(n: number): string {
  return n < 10 ? '0' + String(n) : String(n)
}

/** 运行时支持的全部 IANA 时区（缓存） */
let cached: string[] | null = null
export function allTimeZones(): string[] {
  if (cached) return cached
  cached =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone').slice() : []
  return cached
}

interface Wall {
  y: number
  mo: number
  d: number
  h: number
  mi: number
  s: number
}

function wallParts(date: Date, tz: string): Wall {
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

function zoneOffsetMinutes(tz: string, date: Date): number {
  const w = wallParts(date, tz)
  const asUTC = Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s)
  return Math.round((asUTC - date.getTime()) / 60000)
}

function offsetLabel(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '-'
  const abs = Math.abs(minutes)
  return `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`
}

/** 按关键词过滤时区（大小写不敏感，子串匹配） */
export function filterZones(keyword: string): string[] {
  const kw = keyword.trim().toLowerCase()
  if (kw === '') return allTimeZones()
  return allTimeZones().filter((tz) => tz.toLowerCase().includes(kw))
}

/** 生成单行：时区名（已对齐到 width）  当前时间  (UTC±HH:mm) */
export function formatZoneLine(tz: string, now: Date, width = tz.length): string {
  const w = wallParts(now, tz)
  const off = offsetLabel(zoneOffsetMinutes(tz, now))
  return `${tz.padEnd(width, ' ')}  ${w.y}-${pad2(w.mo)}-${pad2(w.d)} ${pad2(w.h)}:${pad2(w.mi)}:${pad2(w.s)}  (UTC${off})`
}

/** T2 同步入口 */
export function transform(input: TzListInput, _options: TzListOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const matched = filterZones(input.text)
  if (matched.length === 0) {
    return `（无匹配的时区：${input.text.trim()}）`
  }
  const now = new Date()
  const width = matched.reduce((max, tz) => Math.max(max, tz.length), 0)
  return matched.map((tz) => formatZoneLine(tz, now, width)).join('\n')
}
