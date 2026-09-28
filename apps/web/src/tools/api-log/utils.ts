/**
 * api-log（#765）纯函数：Apache / Nginx 访问日志解析与统计。
 * A 级工具：纯前端本地计算，无网络、无第三方 API。
 */

export interface LogEntry {
  ip: string
  /** 时间戳毫秒 */
  time: number
  method: string
  path: string
  status: number
  bytes: number
  /** 耗时毫秒（日志含耗时字段时） */
  ms?: number
}

export interface ParseLogResult {
  entries: LogEntry[]
  /** 跳过的非法行数 */
  skipped: number
}

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
}

const TIME_RE =
  /^(\d{2})\/([A-Za-z]{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-])(\d{2})(\d{2})$/

/** 解析 "10/Oct/2000:13:55:36 -0700"（非法抛中文错） */
export function parseLogTime(s: string): number {
  const m = TIME_RE.exec(s)
  if (!m) throw new Error('时间格式非法：' + s)
  const month = MONTHS[m[2].toLowerCase()]
  if (month === undefined) throw new Error('未知月份：' + m[2])
  const utc = Date.UTC(Number(m[3]), month, Number(m[1]), Number(m[4]), Number(m[5]), Number(m[6]))
  const offsetMs = (Number(m[8]) * 60 + Number(m[9])) * 60000 * (m[7] === '+' ? 1 : -1)
  return utc - offsetMs
}

// combined 格式，尾部可选 request_time（秒，nginx $request_time）
const LOG_RE =
  /^(\S+) \S+ \S+ \[([^\]]+)\] "([A-Z]+) (\S+)(?: \S+)?" (\d{3}) (\S+)(?: "([^"]*)" "([^"]*)")?(?: (\d+(?:\.\d+)?))?\s*$/

function parseLogLine(line: string): LogEntry | null {
  const m = LOG_RE.exec(line)
  if (!m) return null
  let time: number
  try {
    time = parseLogTime(m[2])
  } catch {
    return null
  }
  const status = Number(m[5])
  const bytes = m[6] === '-' ? 0 : Number(m[6])
  if (!Number.isFinite(bytes)) return null
  const entry: LogEntry = { ip: m[1], time, method: m[3], path: m[4], status, bytes }
  if (m[9] !== undefined) entry.ms = Math.round(Number(m[9]) * 1000)
  return entry
}

/** 解析访问日志文本（非法行跳过并计数） */
export function parseAccessLog(text: string): ParseLogResult {
  const entries: LogEntry[] = []
  let skipped = 0
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (line === '') continue
    const e = parseLogLine(line)
    if (e) entries.push(e)
    else skipped++
  }
  return { entries, skipped }
}

export interface PathStat {
  path: string
  count: number
  avgMs: number | null
  errors: number
}

export interface LogStats {
  total: number
  /** 如 { '2xx': 90, '5xx': 3 } */
  statusDist: Record<string, number>
  errorRate: number
  topPaths: PathStat[]
  peakHour: { hour: string; count: number } | null
  /** 是否有耗时字段 */
  hasTiming: boolean
}

interface PathAgg {
  count: number
  msSum: number
  msCount: number
  errors: number
}

/** 统计日志条目 */
export function analyzeLogs(entries: LogEntry[]): LogStats {
  const statusDist: Record<string, number> = {}
  const byPath = new Map<string, PathAgg>()
  const byHour = new Map<string, number>()
  let errors = 0
  let hasTiming = false
  for (const e of entries) {
    const cls = Math.floor(e.status / 100) + 'xx'
    statusDist[cls] = (statusDist[cls] ?? 0) + 1
    if (e.status >= 500) errors++
    const agg = byPath.get(e.path) ?? { count: 0, msSum: 0, msCount: 0, errors: 0 }
    agg.count++
    if (e.status >= 500) agg.errors++
    if (e.ms !== undefined) {
      agg.msSum += e.ms
      agg.msCount++
      hasTiming = true
    }
    byPath.set(e.path, agg)
    const hour = new Date(e.time).toISOString().slice(0, 13) + ':00'
    byHour.set(hour, (byHour.get(hour) ?? 0) + 1)
  }
  const topPaths: PathStat[] = [...byPath.entries()]
    .map(([path, s]) => ({
      path,
      count: s.count,
      avgMs: s.msCount > 0 ? Math.round(s.msSum / s.msCount) : null,
      errors: s.errors,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
  let peakHour: { hour: string; count: number } | null = null
  for (const [hour, count] of byHour) {
    if (!peakHour || count > peakHour.count) peakHour = { hour, count }
  }
  return {
    total: entries.length,
    statusDist,
    errorRate: entries.length === 0 ? 0 : errors / entries.length,
    topPaths,
    peakHour,
    hasTiming,
  }
}

/** 示例日志 */
export const EXAMPLE_LOG = [
  '127.0.0.1 - - [10/Oct/2000:13:55:36 -0700] "GET /api/users HTTP/1.1" 200 2326 "-" "curl/8.0" 0.012',
  '127.0.0.1 - - [10/Oct/2000:13:55:37 -0700] "POST /api/orders HTTP/1.1" 201 512 "-" "curl/8.0" 0.105',
  '127.0.0.1 - - [10/Oct/2000:13:56:01 -0700] "GET /api/users HTTP/1.1" 500 128 "-" "curl/8.0" 1.204',
  '这是一行非法日志，会被跳过',
  '127.0.0.1 - - [10/Oct/2000:14:02:11 -0700] "GET /health HTTP/1.1" 200 16 "-" "curl/8.0" 0.003',
].join('\n')
