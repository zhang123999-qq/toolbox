/**
 * http-assert（#748）纯函数：断言规则校验、请求执行（fetch 可注入）、断言求值、报告生成。
 * D 级工具：浏览器内发起真实请求，受目标 CORS 策略限制。
 */

/** 提取错误信息（保留非 Error 兜底） */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export type FetchImpl = typeof fetch

export interface HttpRequest {
  url: string
  method: string
  headers: Record<string, string>
  body: string
}

export type Assertion =
  | { type: 'status'; expected: number }
  | { type: 'statusRange'; min: number; max: number }
  | { type: 'header'; name: string; expected?: string }
  | { type: 'bodyContains'; text: string }
  | { type: 'bodyJsonPath'; path: string; expected: unknown }
  | { type: 'timeLt'; ms: number }

export interface AssertionResult {
  pass: boolean
  message: string
}

export interface AssertReport {
  ok: boolean
  passed: number
  total: number
  status: number
  durationMs: number
  results: AssertionResult[]
  error?: string
}

export interface AssertContext {
  status: number
  /** 键已小写的响应头 */
  headers: Record<string, string>
  bodyText: string
  /** 非 JSON 响应体时为 undefined */
  bodyJson: unknown
  durationMs: number
}

export const DEFAULT_ASSERTIONS_JSON = `[
  { "type": "status", "expected": 200 },
  { "type": "header", "name": "content-type" },
  { "type": "bodyContains", "text": "ok" },
  { "type": "timeLt", "ms": 3000 }
]`

/** 把多行 `Key: Value` 解析成对象 */
export function parseHeaders(raw: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    const idx = trimmed.indexOf(':')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    if (key !== '') out[key] = trimmed.slice(idx + 1).trim()
  }
  return out
}

/** 校验 URL */
export function assertUrl(url: string): void {
  const trimmed = url.trim()
  if (trimmed === '') throw new Error('请输入请求 URL，如 https://api.example.com/health')
  if (!/^https?:\/\//i.test(trimmed)) throw new Error('URL 必须以 http:// 或 https:// 开头')
}

/** 按点路径取值，支持数组下标；取不到返回 undefined */
export function getJsonPath(obj: unknown, path: string): unknown {
  if (path.trim() === '') return undefined
  let cur: unknown = obj
  for (const seg of path.split('.')) {
    if (cur === null || cur === undefined) return undefined
    if (Array.isArray(cur)) {
      if (!/^\d+$/.test(seg)) return undefined
      cur = cur[Number(seg)]
    } else if (typeof cur === 'object') {
      cur = (cur as Record<string, unknown>)[seg]
    } else {
      return undefined
    }
  }
  return cur
}

/** 深度相等（对象 / 数组 / 原始值） */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (typeof a !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false
    if (a.length !== b.length) return false
    return a.every((v, i) => deepEqual(v, (b as unknown[])[i]))
  }
  const aObj = a as Record<string, unknown>
  const bObj = b as Record<string, unknown>
  const ka = Object.keys(aObj)
  const kb = Object.keys(bObj)
  if (ka.length !== kb.length) return false
  return ka.every((k) => deepEqual(aObj[k], bObj[k]))
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function intField(item: Record<string, unknown>, label: string, field: string): number {
  const v = item[field]
  if (typeof v !== 'number' || !Number.isInteger(v)) {
    throw new Error(`${label}的 ${field} 必须是整数`)
  }
  return v
}

/** 校验断言规则 JSON，返回归一化断言数组；非法时抛中文错 */
export function parseAssertions(raw: string): Assertion[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    throw new Error('断言规则不是合法 JSON：' + errorMessage(e), { cause: e })
  }
  if (!Array.isArray(parsed)) throw new Error('断言规则必须是数组')
  if (parsed.length === 0) throw new Error('请至少定义一条断言')
  return parsed.map((item, i) => {
    const label = `第 ${i + 1} 条断言`
    if (!isRecord(item)) throw new Error(`${label}必须是对象`)
    switch (item.type) {
      case 'status':
        return { type: 'status', expected: intField(item, label, 'expected') } as Assertion
      case 'statusRange': {
        const min = intField(item, label, 'min')
        const max = intField(item, label, 'max')
        if (min > max) throw new Error(`${label}的 min 不能大于 max`)
        return { type: 'statusRange', min, max } as Assertion
      }
      case 'header': {
        if (typeof item.name !== 'string' || item.name.trim() === '') {
          throw new Error(`${label}的 name 必须是非空字符串`)
        }
        if (item.expected !== undefined && typeof item.expected !== 'string') {
          throw new Error(`${label}的 expected 必须是字符串`)
        }
        return {
          type: 'header',
          name: item.name.trim(),
          ...(item.expected === undefined ? {} : { expected: item.expected }),
        } as Assertion
      }
      case 'bodyContains': {
        if (typeof item.text !== 'string' || item.text === '') {
          throw new Error(`${label}的 text 必须是非空字符串`)
        }
        return { type: 'bodyContains', text: item.text } as Assertion
      }
      case 'bodyJsonPath': {
        if (typeof item.path !== 'string' || item.path.trim() === '') {
          throw new Error(`${label}的 path 必须是非空字符串`)
        }
        return { type: 'bodyJsonPath', path: item.path.trim(), expected: item.expected } as Assertion
      }
      case 'timeLt': {
        const ms = item.ms
        if (typeof ms !== 'number' || ms <= 0) throw new Error(`${label}的 ms 必须是正数`)
        return { type: 'timeLt', ms } as Assertion
      }
      default:
        throw new Error(`${label}的 type 非法：${String(item.type)}`)
    }
  })
}

/** 对单条断言求值（纯函数） */
export function checkAssertion(a: Assertion, ctx: AssertContext): AssertionResult {
  switch (a.type) {
    case 'status': {
      const pass = ctx.status === a.expected
      return {
        pass,
        message: pass
          ? `状态码为 ${a.expected}，通过`
          : `状态码断言失败：期望 ${a.expected}，实际 ${ctx.status}`,
      }
    }
    case 'statusRange': {
      const pass = ctx.status >= a.min && ctx.status <= a.max
      return {
        pass,
        message: pass
          ? `状态码 ${ctx.status} 在区间 [${a.min}, ${a.max}] 内，通过`
          : `状态码断言失败：期望区间 [${a.min}, ${a.max}]，实际 ${ctx.status}`,
      }
    }
    case 'header': {
      const actual = ctx.headers[a.name.toLowerCase()]
      if (actual === undefined) return { pass: false, message: `响应头断言失败：缺少 ${a.name}` }
      if (a.expected === undefined) return { pass: true, message: `响应头 ${a.name} 存在，通过` }
      const pass = actual === a.expected
      return {
        pass,
        message: pass
          ? `响应头 ${a.name} 为 ${a.expected}，通过`
          : `响应头断言失败：${a.name} 期望 ${a.expected}，实际 ${actual}`,
      }
    }
    case 'bodyContains': {
      const pass = ctx.bodyText.includes(a.text)
      return {
        pass,
        message: pass
          ? `响应体包含 "${a.text}"，通过`
          : `响应体断言失败：不包含 "${a.text}"`,
      }
    }
    case 'bodyJsonPath': {
      if (ctx.bodyJson === undefined) {
        return { pass: false, message: 'JSON 路径断言失败：响应体不是合法 JSON' }
      }
      const actual = getJsonPath(ctx.bodyJson, a.path)
      if (actual === undefined) {
        return { pass: false, message: `JSON 路径断言失败：路径 ${a.path} 不存在` }
      }
      const pass = deepEqual(actual, a.expected)
      return {
        pass,
        message: pass
          ? `JSON 路径 ${a.path} 匹配，通过`
          : `JSON 路径断言失败：${a.path} 期望 ${JSON.stringify(a.expected)}，实际 ${JSON.stringify(actual)}`,
      }
    }
    case 'timeLt': {
      const pass = ctx.durationMs < a.ms
      return {
        pass,
        message: pass
          ? `响应耗时 ${ctx.durationMs}ms < ${a.ms}ms，通过`
          : `耗时断言失败：${ctx.durationMs}ms 不小于 ${a.ms}ms`,
      }
    }
    default:
      return { pass: false, message: `未知断言类型：${(a as Assertion).type}` }
  }
}

/** 把响应头（Headers 实例或普通对象）转为小写键对象 */
function toHeaderObject(h: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (h !== null && typeof h === 'object' && typeof (h as Headers).forEach === 'function') {
    ;(h as Headers).forEach((value, key) => {
      out[key.toLowerCase()] = value
    })
    return out
  }
  if (isRecord(h)) {
    for (const [k, v] of Object.entries(h)) out[k.toLowerCase()] = String(v)
  }
  return out
}

/**
 * 执行请求并逐条断言。
 * fetchImpl 可注入（测试用 mock）；默认用全局 fetch。
 * 网络/CORS 错误返回带中文 error 的报告，不抛错。
 */
export async function runHttpAssertions(
  req: HttpRequest,
  assertions: Assertion[],
  fetchImpl: FetchImpl = globalThis.fetch,
): Promise<AssertReport> {
  assertUrl(req.url)
  const init: RequestInit = { method: req.method, headers: req.headers }
  if (!['GET', 'HEAD'].includes(req.method) && req.body.trim() !== '') {
    init.body = req.body
  }
  const started = Date.now()
  let res: Response
  try {
    res = await fetchImpl(req.url.trim(), init)
  } catch (error) {
    return {
      ok: false,
      passed: 0,
      total: assertions.length,
      status: 0,
      durationMs: Date.now() - started,
      results: [],
      error:
        '请求失败：' +
        errorMessage(error) +
        '（常见原因：目标未允许 CORS、地址不通）',
    }
  }
  const bodyText = await res.text()
  let bodyJson: unknown
  try {
    bodyJson = JSON.parse(bodyText)
  } catch {
    bodyJson = undefined
  }
  const durationMs = Date.now() - started
  const ctx: AssertContext = {
    status: res.status,
    headers: toHeaderObject((res as unknown as { headers: unknown }).headers),
    bodyText,
    bodyJson,
    durationMs,
  }
  const results = assertions.map((a) => checkAssertion(a, ctx))
  const passed = results.filter((r) => r.pass).length
  return {
    ok: passed === results.length,
    passed,
    total: results.length,
    status: res.status,
    durationMs,
    results,
  }
}

/** 把测试报告格式化为文本 */
export function formatReport(report: AssertReport): string {
  if (report.error !== undefined) return report.error
  const lines = [
    `测试${report.ok ? '通过' : '未通过'}：${report.passed}/${report.total} 条断言通过`,
    `状态码：${report.status}，耗时：${report.durationMs}ms`,
    '',
  ]
  report.results.forEach((r, i) => {
    lines.push(`${r.pass ? '✓' : '✗'} 断言 ${i + 1}：${r.message}`)
  })
  return lines.join('\n')
}
