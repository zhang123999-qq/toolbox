import type { IsoInput, IsoOptions } from './schema'

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function pad2(n: number): string {
  return n < 10 ? '0' + String(n) : String(n)
}

/** 把各种输入解析成 Date：纯数字按时间戳，否则按日期串（含 ISO） */
export function parseAny(text: string): Date {
  const t = text.trim()
  if (/^-?\d+$/.test(t)) {
    const n = Number(t)
    const ms = Math.abs(n) >= 1e12 ? n : n * 1000
    const d = new Date(ms)
    if (Number.isNaN(d.getTime())) throw new Error('时间戳超出可表示范围')
    return d
  }
  const m = t.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.(\d{1,3}))?)?)?(Z|[+-]\d{2}:?\d{2})?$/,
  )
  if (m) {
    const [, y, mo, d, h = '0', mi = '0', s = '0', ms = '0', tz] = m
    if (tz) {
      // 带时区偏移：交给原生 Date（已含 T 的形式）。Z 原样保留，否则给 ±HHMM 补冒号
      const offset = tz === 'Z' ? 'Z' : tz.includes(':') ? tz : tz.slice(0, 3) + ':' + tz.slice(3)
      const iso = `${y}-${pad2(Number(mo))}-${pad2(Number(d))}T${pad2(Number(h))}:${pad2(Number(mi))}:${pad2(Number(s))}.${ms.padEnd(3, '0')}${offset}`
      const parsed = new Date(iso)
      if (!Number.isNaN(parsed.getTime())) return parsed
    } else {
      const local = new Date(
        Number(y),
        Number(mo) - 1,
        Number(d),
        Number(h),
        Number(mi),
        Number(s),
        Number(ms),
      )
      if (!Number.isNaN(local.getTime())) return local
    }
  }
  // 兜底：原生 Date 直接解析
  const direct = new Date(t)
  if (!Number.isNaN(direct.getTime())) return direct
  throw new Error('无法解析的日期：' + t)
}

/** 本地时区偏移串，如 +08:00 / -05:00 */
function offsetString(d: Date): string {
  const offsetMin = -d.getTimezoneOffset()
  const sign = offsetMin >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMin)
  return `${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`
}

/** T2 同步入口 */
export function transform(input: IsoInput, _options: IsoOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const d = parseAny(text)
  return [
    `ISO 8601（UTC，带 Z）：${d.toISOString()}`,
    `ISO 8601（本地偏移）：` +
      `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
      `T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}${offsetString(d)}`,
    '',
    `年：${d.getFullYear()}`,
    `月：${d.getMonth() + 1}`,
    `日：${d.getDate()}`,
    `时：${pad2(d.getHours())}`,
    `分：${pad2(d.getMinutes())}`,
    `秒：${pad2(d.getSeconds())}`,
    `周：${WEEKDAYS[d.getDay()]}`,
    `Unix 秒：${Math.floor(d.getTime() / 1000)}`,
    `Unix 毫秒：${d.getTime()}`,
  ].join('\n')
}
