import type { TzConvertInput, TzConvertOptions } from './schema'

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
  if (tz.trim() === '') return false
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

export function offsetLabel(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '-'
  const abs = Math.abs(minutes)
  return `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`
}

/**
 * 解析输入的墙上时间串。
 * 支持 `YYYY-MM-DD`、`YYYY/MM/DD`、可附带 `HH:mm[:ss]`（用空格或 T 分隔）。
 * 解析不了直接抛中文错误，绝不把 Invalid Date 放出去。
 */
export function parseWall(text: string): Wall {
  const t = text.trim()
  const m = t.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
  )
  if (!m) throw new Error(`无法解析的时间：${text}（示例：2026-09-27 15:30:00）`)
  const [, y, mo, d, h = '0', mi = '0', s = '0'] = m
  const wall = {
    y: Number(y),
    mo: Number(mo),
    d: Number(d),
    h: Number(h),
    mi: Number(mi),
    s: Number(s),
  }
  // 合法性区间校验，避免 2 月 30 日这类被 new Date 静默进位
  if (wall.mo < 1 || wall.mo > 12 || wall.d < 1 || wall.d > 31) {
    throw new Error(`日期越界：${text}`)
  }
  if (wall.h > 23 || wall.mi > 59 || wall.s > 59) {
    throw new Error(`时间越界：${text}`)
  }
  // 日号存在性回读校验（如 2026-02-30），避免后续 Date.UTC 静默进位到 3 月
  const probe = new Date(wall.y, wall.mo - 1, wall.d, wall.h, wall.mi, wall.s)
  if (
    probe.getFullYear() !== wall.y ||
    probe.getMonth() !== wall.mo - 1 ||
    probe.getDate() !== wall.d
  ) {
    throw new Error(`日期越界：${text}`)
  }
  return wall
}

/**
 * 把「某时区的墙上时间分量」反推为 UTC 毫秒时刻。
 *
 * 做法：先把墙上分量当作 UTC 得到一个猜测时刻，
 * 用它查该时区此时的偏移并修正；DST 跳变日附近再按修正后的时刻复查一次偏移，
 * 两次迭代足以落在正确的偏移上。
 */
export function wallToInstant(tz: string, wall: Wall): number {
  const guess = Date.UTC(wall.y, wall.mo - 1, wall.d, wall.h, wall.mi, wall.s)
  const off1 = zoneOffsetMinutes(tz, new Date(guess))
  let inst = guess - off1 * 60000
  const off2 = zoneOffsetMinutes(tz, new Date(inst))
  inst = guess - off2 * 60000
  return inst
}

function fmtWall(w: Wall): string {
  return `${w.y}-${pad2(w.mo)}-${pad2(w.d)} ${pad2(w.h)}:${pad2(w.mi)}:${pad2(w.s)}`
}

/** T2 同步入口 */
export function transform(input: TzConvertInput, options: TzConvertOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const fromZone = options.fromZone.trim()
  const toZone = options.toZone.trim()
  if (!isValidTimeZone(fromZone))
    throw new Error(`非法源时区：${options.fromZone}（请用 IANA 名，如 Asia/Shanghai）`)
  if (!isValidTimeZone(toZone))
    throw new Error(`非法目标时区：${options.toZone}（请用 IANA 名，如 America/New_York）`)

  const wall = parseWall(input.text)
  const instant = wallToInstant(fromZone, wall)
  const instantDate = new Date(instant)

  const target = wallParts(instantDate, toZone)
  const utc = wallParts(instantDate, 'UTC')

  const fromOff = offsetLabel(zoneOffsetMinutes(fromZone, instantDate))
  const toOff = offsetLabel(zoneOffsetMinutes(toZone, instantDate))

  return [
    `源时间：${fmtWall(wall)}（${fromZone}，UTC${fromOff}）`,
    `目标时间：${fmtWall(target)}（${toZone}，UTC${toOff}）`,
    `UTC 时间：${fmtWall(utc)}`,
    `Unix 秒：${Math.floor(instant / 1000)}`,
  ].join('\n')
}
