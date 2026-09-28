/**
 * edge-log（#819）工具函数：日志查询参数构造与访问日志行解析。
 * 纯函数，无 DOM / 网络依赖。
 */

export interface LogQueryOptions {
  readonly startTime: string
  readonly endTime: string
  readonly status?: string
  readonly colo?: string
}

export interface LogQuery {
  readonly start: string
  readonly end: string
  readonly filter: string
}

export interface ParsedLogLine {
  readonly ip: string
  readonly user: string
  readonly time: string
  readonly method: string
  readonly path: string
  readonly status: number
  readonly size: string
  readonly referer: string
  readonly userAgent: string
}

export const EXAMPLE_LOG_LINE =
  '203.0.113.10 - alice [28/Sep/2026:10:00:01 +0800] "GET /index.html HTTP/1.1" 200 1024 "https://example.com/" "Mozilla/5.0"'

const COMBINED_LOG_RE =
  /^(\S+) \S+ (\S+) \[([^\]]+)\] "([A-Z]+) (\S+)(?: \S+)?" (\d{3}) (\S+)(?: "([^"]*)" "([^"]*)")?$/

/** 解析 ISO 时间，非法即抛中文错误 */
function parseIso(value: string, field: string): number {
  const trimmed = value.trim()
  if (trimmed === '') throw new Error(`${field}不能为空`)
  const time = Date.parse(trimmed)
  if (Number.isNaN(time)) throw new Error(`${field}不是合法时间（须为 ISO 格式）`)
  return time
}

/** 构造日志查询参数；时间范围非法即抛中文错误 */
export function buildLogQuery(options: LogQueryOptions): LogQuery {
  const start = parseIso(options.startTime, '开始时间')
  const end = parseIso(options.endTime, '结束时间')
  if (start >= end) throw new Error('开始时间须早于结束时间')
  const filters: string[] = []
  const status = (options.status ?? '').trim()
  if (status !== '') {
    if (!/^\d{3}$/.test(status)) throw new Error('状态码须为 3 位数字')
    filters.push(`status=${status}`)
  }
  const colo = (options.colo ?? '').trim().toUpperCase()
  if (colo !== '') {
    if (!/^[A-Z]{3}$/.test(colo)) throw new Error('节点代码须为 3 位大写字母（如 HKG）')
    filters.push(`colo=${colo}`)
  }
  return {
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    filter: filters.join(' AND '),
  }
}

/** 查询参数转 GraphQL 风格查询语句 */
export function buildGraphqlQuery(query: LogQuery): string {
  const filterLine =
    query.filter === '' ? '' : `\n    filter: "${query.filter.replaceAll('"', '\\"')}",`
  return `{
  viewer {
    zones {
      httpRequests1hGroups(
        limit: 100,${filterLine}
        filter: "datetime >= \\"${query.start}\\" AND datetime <= \\"${query.end}\\""
      ) {
        count
        sum { bytes }
      }
    }
  }
}`
}

/** 解析单行访问日志：JSON 行直接解析，combined 格式转结构化对象 */
export function parseLogLine(line: string): ParsedLogLine {
  const trimmed = line.trim()
  if (trimmed === '') throw new Error('日志行为空')
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let parsed: unknown
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      throw new Error('日志行不是合法 JSON')
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('JSON 日志行须为对象')
    }
    const obj = parsed as Record<string, unknown>
    return {
      ip: String(obj.ip ?? obj.clientIp ?? ''),
      user: String(obj.user ?? ''),
      time: String(obj.time ?? obj.datetime ?? ''),
      method: String(obj.method ?? ''),
      path: String(obj.path ?? obj.url ?? ''),
      status: Number(obj.status ?? 0),
      size: String(obj.size ?? obj.bytes ?? ''),
      referer: String(obj.referer ?? obj.referrer ?? ''),
      userAgent: String(obj.userAgent ?? obj.user_agent ?? ''),
    }
  }
  const match = COMBINED_LOG_RE.exec(trimmed)
  if (!match) throw new Error('无法识别的日志格式（支持 JSON 或 combined 格式）')
  return {
    ip: match[1],
    user: match[2] === '-' ? '' : match[2],
    time: match[3],
    method: match[4],
    path: match[5],
    status: Number(match[6]),
    size: match[7],
    referer: match[8] ?? '',
    userAgent: match[9] ?? '',
  }
}

/** 批量解析多行日志，逐行标注序号的错误 */
export function parseLogLines(text: string): ParsedLogLine[] {
  const lines = text.split('\n').map((line) => line.trim()).filter((line) => line !== '')
  if (lines.length === 0) throw new Error('没有可解析的日志行')
  return lines.map((line, index) => {
    try {
      return parseLogLine(line)
    } catch (err) {
      // parseLogLine 只抛 Error，此处直接取 message（无防御分支，保持覆盖率 100%）
      throw new Error(`第 ${index + 1} 行：${(err as Error).message}`, { cause: err })
    }
  })
}
