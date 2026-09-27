import type { TsConvertInput, TsConvertOptions } from './schema'

function pad2(n: number): string {
  return n < 10 ? '0' + String(n) : String(n)
}

/** 秒 / 毫秒识别阈值：绝对值 >= 1e12 视为毫秒，否则视为秒 */
export const MS_THRESHOLD = 1e12

/** 判断输入是否为整数时间戳（允许负号） */
export function isTimestamp(text: string): boolean {
  return /^-?\d+$/.test(text.trim())
}

/** 按阈值判定时间戳单位：'s' | 'ms' */
export function detectUnit(value: number): 's' | 'ms' {
  return Math.abs(value) >= MS_THRESHOLD ? 'ms' : 's'
}

/** 日期串 → Date。带 Z/偏移按 UTC，否则按本地时区；解析不了抛中文错误 */
export function parseDate(text: string): Date {
  const t = text.trim()
  const m = t.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.(\d{1,3}))?)?)?(Z|[+-]\d{2}:?\d{2})?$/,
  )
  if (m) {
    const [, y, mo, d, h = '0', mi = '0', s = '0', ms = '0', tz] = m
    const Y = Number(y)
    const Mo = Number(mo)
    const D = Number(d)
    const H = Number(h)
    const Mi = Number(mi)
    const S = Number(s)
    const Ms = Number(ms)
    // 区间校验 + 月日存在性回读，避免 2026-02-30 / 25:99:99 被静默进位
    if (Mo < 1 || Mo > 12 || D < 1 || D > 31) throw new Error(`日期越界：${text}`)
    if (H > 23 || Mi > 59 || S > 59) throw new Error(`时间越界：${text}`)
    if (tz) {
      const offset = tz === 'Z' ? 'Z' : tz.includes(':') ? tz : tz.slice(0, 3) + ':' + tz.slice(3)
      const iso = `${y}-${pad2(Mo)}-${pad2(D)}T${pad2(H)}:${pad2(Mi)}:${pad2(S)}.${String(Ms).padEnd(3, '0')}${offset}`
      const parsed = new Date(iso)
      if (!Number.isNaN(parsed.getTime())) {
        if (
          parsed.getUTCFullYear() === Y &&
          parsed.getUTCMonth() === Mo - 1 &&
          parsed.getUTCDate() === D
        ) {
          return parsed
        }
      }
      throw new Error(`非法日期：${text}`)
    }
    const local = new Date(Y, Mo - 1, D, H, Mi, S, Ms)
    if (
      !Number.isNaN(local.getTime()) &&
      local.getFullYear() === Y &&
      local.getMonth() === Mo - 1 &&
      local.getDate() === D
    ) {
      return local
    }
    throw new Error(`非法日期：${text}`)
  }
  const direct = new Date(t)
  if (!Number.isNaN(direct.getTime())) return direct
  throw new Error(`无法解析的日期：${text}（示例：2026-09-27 15:30:00）`)
}

function fmt(d: Date, utc: boolean): string {
  const y = utc ? d.getUTCFullYear() : d.getFullYear()
  const mo = utc ? d.getUTCMonth() + 1 : d.getMonth() + 1
  const day = utc ? d.getUTCDate() : d.getDate()
  const h = utc ? d.getUTCHours() : d.getHours()
  const mi = utc ? d.getUTCMinutes() : d.getMinutes()
  const s = utc ? d.getUTCSeconds() : d.getSeconds()
  return `${y}-${pad2(mo)}-${pad2(day)} ${pad2(h)}:${pad2(mi)}:${pad2(s)}`
}

function localOffsetLabel(d: Date): string {
  const off = -d.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  const abs = Math.abs(off)
  return `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`
}

/** Date → 展示行（时间戳 → 日期方向） */
function fromDate(d: Date): string[] {
  const ms = d.getTime()
  if (Number.isNaN(ms)) throw new Error('时间超出可表示范围')
  return [
    `识别方向：日期 → 时间戳`,
    `Unix 秒：${Math.floor(ms / 1000)}`,
    `Unix 毫秒：${ms}`,
    `UTC：${fmt(d, true)}`,
    `本地：${fmt(d, false)}（UTC${localOffsetLabel(d)}）`,
  ]
}

/** 时间戳 → Date 展示行 */
function fromTimestamp(raw: number): string[] {
  const unit = detectUnit(raw)
  const ms = unit === 'ms' ? raw : raw * 1000
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) throw new Error('时间戳超出可表示范围')
  return [
    `识别方向：时间戳 → 日期（按${unit === 'ms' ? '毫秒' : '秒'}识别，阈值 1e12）`,
    `Unix 秒：${Math.floor(ms / 1000)}`,
    `Unix 毫秒：${ms}`,
    `UTC：${fmt(d, true)}`,
    `本地：${fmt(d, false)}（UTC${localOffsetLabel(d)}）`,
  ]
}

/** T2 同步入口 */
export function transform(input: TsConvertInput, _options: TsConvertOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const t = input.text.trim()
  if (isTimestamp(t)) {
    return fromTimestamp(Number(t)).join('\n')
  }
  return fromDate(parseDate(t)).join('\n')
}
