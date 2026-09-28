import { MAX_INPUT, MAX_URLS } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class DeadLinkError extends Error {
  readonly kind: 'input' | 'timeout' | 'network'
  constructor(message: string, kind: 'input' | 'timeout' | 'network' = 'input') {
    super(message)
    this.name = 'DeadLinkError'
    this.kind = kind
  }
}

/** 取错误消息（防御性：未知 throw 值转字符串） */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** 可注入的 fetch，便于单测 mock（默认用浏览器原生 fetch）；单测中禁止真实网络请求 */
export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>
const defaultFetch: FetchFn = (url, init) => fetch(url, init)

export interface InvalidUrl {
  readonly line: number
  readonly value: string
  readonly reason: string
}

export interface ParsedList {
  readonly urls: readonly string[]
  readonly invalid: readonly InvalidUrl[]
  readonly duplicates: number
}

/** 解析 URL 列表：每行一个，最多 200 行，去重（纯函数，可单测） */
export function parseUrlList(text: string): ParsedList {
  const trimmed = text.trim()
  if (trimmed === '')
    throw new DeadLinkError('请输入 URL 列表，每行一个，例如 https://example.com/')
  if (trimmed.length > MAX_INPUT) throw new DeadLinkError(`输入超过 ${MAX_INPUT} 字符上限`)
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '')
  if (lines.length > MAX_URLS) {
    throw new DeadLinkError(`URL 数量超过上限：共 ${lines.length} 行，最多支持 ${MAX_URLS} 行`)
  }
  const urls: string[] = []
  const invalid: InvalidUrl[] = []
  const seen = new Set<string>()
  let duplicates = 0
  lines.forEach((line, i) => {
    let url: URL
    try {
      url = new URL(line)
    } catch {
      invalid.push({ line: i + 1, value: line, reason: 'URL 格式不正确' })
      return
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      invalid.push({ line: i + 1, value: line, reason: `不支持的协议：${url.protocol}` })
      return
    }
    const href = url.href
    if (seen.has(href)) {
      duplicates += 1
      return
    }
    seen.add(href)
    urls.push(href)
  })
  return { urls, invalid, duplicates }
}

export type DeadStatus = '存活' | '重定向' | '死链' | '超时' | '错误' | '无效'

export interface DeadLinkResult {
  readonly url: string
  readonly status: DeadStatus
  /** HTTP 状态码；无效 / 超时 / 网络错误时为 null */
  readonly httpStatus: number | null
  readonly alive: boolean
  readonly note: string
  /** 单次检测耗时毫秒 */
  readonly ms: number
}

/** 单次请求：HEAD 优先，405/501 时回退 GET；超时与网络失败抛中文错 */
async function fetchSingle(url: string, fetchFn: FetchFn, timeoutMs: number): Promise<number> {
  const doFetch = async (method: 'HEAD' | 'GET'): Promise<Response> => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetchFn(url, { method, signal: controller.signal })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new DeadLinkError(`请求超时（超过 ${timeoutMs} 毫秒）`, 'timeout')
      }
      throw new DeadLinkError(
        `网络请求失败：${errorMessage(error)}（目标可能不允许跨域访问）`,
        'network',
      )
    } finally {
      clearTimeout(timer)
    }
  }
  const head = await doFetch('HEAD')
  if (head.status === 405 || head.status === 501) {
    const retried = await doFetch('GET')
    return retried.status
  }
  return head.status
}

/** 检测单个 URL（纯逻辑，fetch 可注入，可单测） */
export async function checkUrl(
  url: string,
  fetchFn: FetchFn = defaultFetch,
  timeoutMs = 15000,
): Promise<DeadLinkResult> {
  const started = Date.now()
  try {
    const httpStatus = await fetchSingle(url, fetchFn, timeoutMs)
    if (httpStatus < 300) {
      return {
        url,
        status: '存活',
        httpStatus,
        alive: true,
        note: `HTTP ${httpStatus}`,
        ms: Date.now() - started,
      }
    }
    if (httpStatus < 400) {
      return {
        url,
        status: '重定向',
        httpStatus,
        alive: true,
        note: `HTTP ${httpStatus}`,
        ms: Date.now() - started,
      }
    }
    return {
      url,
      status: '死链',
      httpStatus,
      alive: false,
      note: `HTTP ${httpStatus}`,
      ms: Date.now() - started,
    }
  } catch (error) {
    if (error instanceof DeadLinkError && error.kind === 'timeout') {
      return {
        url,
        status: '超时',
        httpStatus: null,
        alive: false,
        note: error.message,
        ms: Date.now() - started,
      }
    }
    return {
      url,
      status: '错误',
      httpStatus: null,
      alive: false,
      note: errorMessage(error),
      ms: Date.now() - started,
    }
  }
}

export interface CheckBatchOptions {
  readonly concurrency?: number
  readonly timeoutMs?: number
  readonly onProgress?: (done: number, total: number) => void
}

/** 并发批量检测，保持输入顺序（fetch 可注入，可单测） */
export async function checkBatch(
  urls: readonly string[],
  fetchFn: FetchFn = defaultFetch,
  opts: CheckBatchOptions = {},
): Promise<DeadLinkResult[]> {
  const concurrency = Math.max(1, opts.concurrency ?? 5)
  const timeoutMs = opts.timeoutMs ?? 15000
  const results: DeadLinkResult[] = new Array(urls.length)
  let next = 0
  let done = 0
  const worker = async (): Promise<void> => {
    while (next < urls.length) {
      const i = next
      next += 1
      results[i] = await checkUrl(urls[i], fetchFn, timeoutMs)
      done += 1
      opts.onProgress?.(done, urls.length)
    }
  }
  const workers: Promise<void>[] = []
  for (let w = 0; w < Math.min(concurrency, urls.length); w++) workers.push(worker())
  await Promise.all(workers)
  return results
}

export interface DeadLinkSummary {
  readonly total: number
  readonly alive: number
  readonly redirect: number
  readonly dead: number
  readonly timeout: number
  readonly error: number
  readonly invalid: number
  readonly aliveRate: number
}

/** 把格式无效的 URL 转为结果项（不发起检测） */
export function toInvalidResult(item: InvalidUrl): DeadLinkResult {
  return {
    url: item.value,
    status: '无效',
    httpStatus: null,
    alive: false,
    note: `第 ${item.line} 行：${item.reason}`,
    ms: 0,
  }
}

/** 汇总检测结果 */
export function summarize(results: readonly DeadLinkResult[]): DeadLinkSummary {
  const s = {
    total: results.length,
    alive: 0,
    redirect: 0,
    dead: 0,
    timeout: 0,
    error: 0,
    invalid: 0,
  }
  for (const r of results) {
    if (r.status === '存活') s.alive += 1
    else if (r.status === '重定向') s.redirect += 1
    else if (r.status === '死链') s.dead += 1
    else if (r.status === '超时') s.timeout += 1
    else if (r.status === '错误') s.error += 1
    else s.invalid += 1
  }
  const aliveTotal = s.alive + s.redirect
  return { ...s, aliveRate: s.total === 0 ? 1 : aliveTotal / s.total }
}

/** 渲染检测报告文本（复制 / 下载用） */
export function renderReport(results: readonly DeadLinkResult[]): string {
  const s = summarize(results)
  const lines: string[] = []
  lines.push(
    `共 ${s.total} 个 URL：存活 ${s.alive}\u3000重定向 ${s.redirect}\u3000死链 ${s.dead}\u3000超时 ${s.timeout}\u3000错误 ${s.error}\u3000无效 ${s.invalid}\u3000存活率 ${Math.round(s.aliveRate * 100)}%`,
  )
  const dead = results.filter((r) => !r.alive && r.status !== '无效')
  const invalid = results.filter((r) => r.status === '无效')
  if (invalid.length > 0) {
    lines.push('')
    lines.push('格式无效（未检测）：')
    for (const r of invalid) lines.push(`  ${r.url}（${r.note}）`)
  }
  if (dead.length > 0) {
    lines.push('')
    lines.push('死链清单：')
    for (const r of dead) lines.push(`  [${r.status}] ${r.url}（${r.note}）`)
  }
  lines.push('')
  lines.push('明细：')
  for (const r of results) {
    lines.push(`  [${r.status}] ${r.url}${r.httpStatus === null ? '' : ` HTTP ${r.httpStatus}`}`)
  }
  return lines.join('\n')
}
