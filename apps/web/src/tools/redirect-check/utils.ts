import type { RedirectCheckInput, RedirectCheckOptions } from './schema'

/** 输入非法或跟踪失败时抛出，由 UI 捕获展示 */
export class RedirectCheckError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RedirectCheckError'
  }
}

/** 可注入的 fetch，便于单测 mock（默认用浏览器原生 fetch） */
export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>
const defaultFetch: FetchFn = (url, init) => fetch(url, init)

/** 校验 URL 为 http(s)，返回规范化后的 href */
export function validateUrl(input: string): string {
  const trimmed = input.trim()
  if (trimmed === '') throw new RedirectCheckError('请输入要检测的 URL，例如 https://example.com')
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new RedirectCheckError('URL 格式不正确，请输入以 http:// 或 https:// 开头的完整地址')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new RedirectCheckError('只支持 http:// 与 https:// 协议')
  }
  return url.href
}

/** 是否为重定向状态码 */
export function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308
}

export interface StatusLine {
  readonly version: string
  readonly status: number
  readonly reason: string
}

/** 解析 HTTP 状态行，非法返回 null */
export function parseStatusLine(line: string): StatusLine | null {
  const m = /^(HTTP\/\S+)\s+(\d{3})(?:\s+(.*))?$/.exec(line.trim())
  if (!m) return null
  return { version: m[1], status: Number(m[2]), reason: (m[3] ?? '').trim() }
}

/** 解析原始 HTTP 响应头：跳过状态行与空行，同名头逗号合并，键统一小写 */
export function parseHeaders(text: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line === '' || /^HTTP\//i.test(line)) continue
    const index = line.indexOf(':')
    if (index === -1) continue
    const name = line.slice(0, index).trim().toLowerCase()
    const value = line.slice(index + 1).trim()
    if (name === '') continue
    const existing = map.get(name)
    map.set(name, existing === undefined ? value : `${existing}, ${value}`)
  }
  return map
}

/** 把 Location 解析为绝对 URL（支持相对路径与 //host 协议相对） */
export function resolveTarget(base: string, location: string): string {
  const target = location.trim()
  if (target === '') throw new RedirectCheckError('响应头中的 Location 为空，无法确定跳转目标')
  try {
    return new URL(target, base).href
  } catch {
    throw new RedirectCheckError(`Location 不是合法 URL：${target}`)
  }
}

export interface RedirectHop {
  readonly url: string
  /** 跨域 opaque 时读不到状态码，为 null */
  readonly status: number | null
  /** 跨域 opaque 时读不到 Location，为 null */
  readonly location: string | null
}

export type Termination = 'ok' | 'loop' | 'maxHops' | 'opaque' | 'error'

export interface TraceResult {
  readonly hops: readonly RedirectHop[]
  readonly finalUrl: string
  readonly terminated: Termination
  readonly message: string
}

interface SingleResult {
  readonly status: number
  readonly location: string | null
  readonly opaque: boolean
}

/** 单次请求：HEAD 优先，405/501 时回退 GET；超时与网络失败抛中文错 */
async function fetchSingle(
  url: string,
  fetchFn: FetchFn,
  timeoutMs: number,
): Promise<SingleResult> {
  const doFetch = async (method: 'HEAD' | 'GET'): Promise<Response> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetchFn(url, { method, redirect: 'manual', signal: controller.signal })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new RedirectCheckError(
          `请求超时（超过 ${timeoutMs} 毫秒），目标服务器响应太慢或不可达`,
        )
      }
      throw new RedirectCheckError(
        `网络请求失败：${error instanceof Error ? error.message : String(error)}`,
      )
    } finally {
      clearTimeout(timer)
    }
  }
  const head = await doFetch('HEAD')
  if (head.type === 'opaqueredirect') return { status: 0, location: null, opaque: true }
  if ((head.status === 405 || head.status === 501) && head.headers.get('location') === null) {
    const retried = await doFetch('GET')
    if (retried.type === 'opaqueredirect') return { status: 0, location: null, opaque: true }
    return { status: retried.status, location: retried.headers.get('location'), opaque: false }
  }
  return { status: head.status, location: head.headers.get('location'), opaque: false }
}

export interface TraceOptions {
  readonly maxHops?: number
  readonly timeoutMs?: number
}

/** 手动跟随 Location 跟踪重定向链 */
export async function traceRedirects(
  startUrl: string,
  fetchFn: FetchFn = defaultFetch,
  opts: TraceOptions = {},
): Promise<TraceResult> {
  const maxHops = opts.maxHops ?? 10
  const timeoutMs = opts.timeoutMs ?? 15000
  const first = validateUrl(startUrl)
  const visited = new Set<string>([first])
  const hops: RedirectHop[] = []
  let current = first
  for (let n = 0; n <= maxHops; n++) {
    const single = await fetchSingle(current, fetchFn, timeoutMs)
    if (single.opaque) {
      hops.push({ url: current, status: null, location: null })
      return {
        hops,
        finalUrl: current,
        terminated: 'opaque',
        message:
          '检测到重定向，但目标跨域且浏览器禁止读取跳转地址（opaque redirect）；同源 URL 可完整跟踪',
      }
    }
    hops.push({ url: current, status: single.status, location: single.location })
    if (isRedirectStatus(single.status) && single.location !== null) {
      let next: string
      try {
        next = resolveTarget(current, single.location)
      } catch (error) {
        return { hops, finalUrl: current, terminated: 'error', message: (error as Error).message }
      }
      if (visited.has(next)) {
        return { hops, finalUrl: current, terminated: 'loop', message: `检测到重定向循环：${next}` }
      }
      visited.add(next)
      current = next
      continue
    }
    const note =
      isRedirectStatus(single.status) && single.location === null
        ? '（服务器返回重定向状态码但未带 Location 头，无法继续跟踪）'
        : ''
    return {
      hops,
      finalUrl: current,
      terminated: 'ok',
      message: `跟踪结束：最终状态 ${single.status}${note}`,
    }
  }
  return {
    hops,
    finalUrl: current,
    terminated: 'maxHops',
    message: `超过最大跟踪跳数（${maxHops}），可能存在过长跳转链`,
  }
}

export interface PastedAnalysis {
  readonly status: number | null
  readonly isRedirect: boolean
  readonly location: string | null
  readonly resolvedTarget: string | null
  readonly error: string | null
}

/** 离线解析粘贴的原始 HTTP 响应文本 */
export function analyzePastedResponse(text: string, baseUrl?: string): PastedAnalysis {
  const blank: PastedAnalysis = {
    status: null,
    isRedirect: false,
    location: null,
    resolvedTarget: null,
    error: null,
  }
  if (text.trim() === '') return { ...blank, error: '请粘贴 HTTP 响应文本（含状态行与响应头）' }
  const lines = text.split(/\r?\n/)
  const firstLine = lines[0]
  const statusLine = parseStatusLine(firstLine)
  if (!statusLine) return { ...blank, error: `首行不是合法的 HTTP 状态行：${firstLine}` }
  const headers = parseHeaders(text)
  const location = headers.get('location') ?? null
  let resolvedTarget: string | null = null
  if (location) {
    try {
      resolvedTarget = new URL(location, baseUrl ?? location).href
    } catch {
      resolvedTarget = null
    }
  }
  return {
    status: statusLine.status,
    isRedirect: isRedirectStatus(statusLine.status),
    location,
    resolvedTarget,
    error: null,
  }
}

/** 渲染跟踪结果为文本 */
export function renderTrace(result: TraceResult): string {
  const lines: string[] = []
  lines.push(`起始 URL：${result.hops[0].url}`)
  lines.push(`跳转次数：${Math.max(0, result.hops.length - 1)}`)
  lines.push(`最终 URL：${result.finalUrl}`)
  lines.push(`结论：${result.message}`)
  lines.push('')
  lines.push('跳转链：')
  result.hops.forEach((hop, i) => {
    const status = hop.status === null ? '未知（跨域）' : String(hop.status)
    const target = hop.location === null ? '（跨域不可读）' : hop.location
    lines.push(`  [${i}] ${status} ${hop.url} → ${target}`)
  })
  return lines.join('\n')
}

/** 渲染粘贴分析结果为文本 */
export function renderPasted(a: PastedAnalysis): string {
  if (a.error) throw new RedirectCheckError(a.error)
  const lines: string[] = []
  lines.push(`状态码：${a.status}`)
  lines.push(`是否重定向：${a.isRedirect ? '是' : '否'}`)
  lines.push(`Location：${a.location ?? '（无）'}`)
  lines.push(`解析后目标：${a.resolvedTarget ?? '（无 / 相对地址需提供基准 URL）'}`)
  return lines.join('\n')
}

export async function transform(
  input: RedirectCheckInput,
  options: RedirectCheckOptions,
  fetchFn: FetchFn = defaultFetch,
): Promise<string> {
  if (input.text.trim() === '') return ''
  if (input.text.length > 200000) throw new RedirectCheckError('输入超过 200,000 字符上限')
  if (options.mode === '粘贴分析') return renderPasted(analyzePastedResponse(input.text))
  const result = await traceRedirects(input.text, fetchFn)
  return renderTrace(result)
}
