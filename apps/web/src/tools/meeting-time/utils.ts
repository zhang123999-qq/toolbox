/**
 * meeting-time 多时区会议时间：
 * 给定一个墙钟时间 + 源时区，换算到多个参与方时区，并标注工作时间 / 深夜。
 * 全部基于 Intl.DateTimeFormat，不引外部时区库。
 */

export interface ParticipantRow {
  zone: string
  /** 本地时间，如 2026-09-28 周一 14:00 */
  local: string
  /** 当地小时（0-23），用于判断时段 */
  hour: number
  /** 工作时间(9-17) / 深夜(22-06) / 其他 */
  daypart: 'work' | 'late' | 'other'
}

/** 计算某时区在某一刻相对 UTC 的偏移毫秒 */
function offsetMs(tz: string, instant: number): number {
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
  const parts = dtf.formatToParts(new Date(instant))
  const map: Record<string, string> = {}
  for (const p of parts) map[p.type] = p.value
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour) % 24,
    Number(map.minute),
    Number(map.second),
  )
  return asUTC - instant
}

/** 校验 IANA 时区是否合法（非法会抛 RangeError） */
export function assertTimezone(tz: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
  } catch {
    throw new Error('无法识别的时区：' + tz + '（请用 IANA 名，如 Asia/Shanghai）')
  }
}

/**
 * 把「某时区下的墙钟时间」换算成 UTC 毫秒瞬间。
 * 输入形如 YYYY-MM-DD HH:mm（或用 T 分隔）。
 */
export function wallToInstant(text: string, tz: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(text.trim())
  if (!m) {
    throw new Error('时间格式应为 YYYY-MM-DD HH:mm，当前为：' + text)
  }
  const [, ys, mos, ds, hs, mis] = m
  const y = Number(ys)
  const mo = Number(mos)
  const d = Number(ds)
  const h = Number(hs)
  const mi = Number(mis)
  // 区间校验 + 月日存在性回读，避免 2026-02-30 / 25:99 被 Date.UTC 静默进位
  if (mo < 1 || mo > 12 || d < 1 || d > 31) throw new Error(`日期越界：${text.trim()}`)
  if (h > 23 || mi > 59) throw new Error(`时间越界：${text.trim()}`)
  const probe = new Date(Date.UTC(y, mo - 1, d))
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) {
    throw new Error(`日期越界：${text.trim()}`)
  }
  const naive = Date.UTC(y, mo - 1, d, h, mi, 0)
  // 两次迭代收敛 DST 边界
  let inst = naive - offsetMs(tz, naive)
  inst = naive - offsetMs(tz, inst)
  return inst
}

/** 一天中的时段标签 */
export function daypartOf(hour: number): 'work' | 'late' | 'other' {
  if (hour >= 9 && hour < 17) return 'work'
  if (hour >= 22 || hour < 6) return 'late'
  return 'other'
}

export const DARTPART_LABEL: Record<ParticipantRow['daypart'], string> = {
  work: '工作时间',
  late: '深夜',
  other: '其他时段',
}

/** 用某时区把瞬间格式化，同时取出当地小时 */
function formatInTz(instant: number, tz: string): { local: string; hour: number } {
  const dtf = new Intl.DateTimeFormat('zh-CN', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = dtf.formatToParts(new Date(instant))
  const map: Record<string, string> = {}
  for (const p of parts) map[p.type] = p.value
  const hour = Number(map.hour) % 24
  return {
    local: `${map.year}-${map.month}-${map.day} ${map.weekday} ${map.hour}:${map.minute}`,
    hour,
  }
}

/** 解析参与方时区列表（每行一个，去空行去重保序） */
export function parseZoneList(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of text.split(/\r?\n/)) {
    const tz = line.trim()
    if (tz === '') continue
    if (!seen.has(tz)) {
      seen.add(tz)
      out.push(tz)
    }
  }
  return out
}

/** T2 同步入口：空输入返回空串，其余输出各参与方当地时间 */
export function transform(input: { text: string; sourceZone: string; zones: string }): string {
  if (input.text.trim() === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const source = input.sourceZone.trim() || 'Asia/Shanghai'
  assertTimezone(source)
  const instant = wallToInstant(input.text, source)

  const list = parseZoneList(input.zones)
  const rows: ParticipantRow[] = list.map((tz) => {
    assertTimezone(tz)
    const { local, hour } = formatInTz(instant, tz)
    return { zone: tz, local, hour, daypart: daypartOf(hour) }
  })

  const src = formatInTz(instant, source)
  const lines = [
    '源时区 ' + source + '：' + src.local,
    '',
    '参与方当地时间：',
    ...rows.map((r) => '  ' + r.zone + '：' + r.local + ' —— ' + DARTPART_LABEL[r.daypart]),
  ]
  if (rows.length === 0) lines.push('  （未填写参与方时区，每行一个 IANA 名）')
  return lines.join('\n')
}
