import type { TimestampInput, TimestampOptions } from './schema'

function pad2(n: number): string {
  return n < 10 ? '0' + String(n) : String(n)
}

/** 本地时间 `YYYY-MM-DD HH:mm:ss` */
function local(d: Date): string {
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
    `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  )
}

/**
 * 把用户输入的日期字符串解析为 Date。
 * 支持：
 * - ISO 8601（带 T / Z，交给原生 Date）
 * - `YYYY-MM-DD[ HH:mm[:ss]]`、`YYYY/MM/DD[ HH:mm[:ss]]`（按本地时区）
 * 解析失败抛中文错误。
 */
export function parseDate(text: string): Date {
  const t = text.trim()
  // 标准 ISO 直接交给原生
  if (/^\d{4}-\d{2}-\d{2}T/.test(t) || /Z$/.test(t)) {
    const d = new Date(t)
    if (!Number.isNaN(d.getTime())) return d
  }
  // 手动解析 `YYYY-MM-DD[ HH:mm[:ss]]`（避免各引擎对空格分隔串的时区解释不一致）
  const m = t.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
  )
  if (m) {
    const [, y, mo, da, h = '0', mi = '0', s = '0'] = m
    const d = new Date(Number(y), Number(mo) - 1, Number(da), Number(h), Number(mi), Number(s))
    if (!Number.isNaN(d.getTime())) return d
  }
  throw new Error('无法解析的日期格式：' + t)
}

/** 数字输入 → 时间戳；否则按日期串 */
function looksLikeTimestamp(text: string): boolean {
  return /^-?\d+$/.test(text.trim())
}

/** 由选项 + 数字推断毫秒时间戳 */
function toMillis(n: number, unit: 'auto' | 's' | 'ms'): number {
  if (unit === 's') return n * 1000
  if (unit === 'ms') return n
  // 自动：绝对值超过 1e12 视为毫秒（约公元 33658 年以后的秒数不可能这么大）
  return Math.abs(n) >= 1e12 ? n : n * 1000
}

/** T2 同步入口 */
export function transform(input: TimestampInput, options: TimestampOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  if (looksLikeTimestamp(text)) {
    const n = Number(text)
    if (!Number.isFinite(n)) throw new Error('时间戳数值非法：' + text)
    const ms = toMillis(n, options.unit)
    const d = new Date(ms)
    if (Number.isNaN(d.getTime())) throw new Error('时间戳超出可表示范围')
    return [
      `Unix 时间戳（秒）：${Math.floor(ms / 1000)}`,
      `Unix 时间戳（毫秒）：${ms}`,
      `本地时间：${local(d)}`,
      `UTC 时间：${d
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d{3}Z$/, '')}`,
    ].join('\n')
  }

  const d = parseDate(text)
  return [
    `Unix 时间戳（秒）：${Math.floor(d.getTime() / 1000)}`,
    `Unix 时间戳（毫秒）：${d.getTime()}`,
    `ISO 8601：${d.toISOString()}`,
    `本地时间：${local(d)}`,
  ].join('\n')
}
