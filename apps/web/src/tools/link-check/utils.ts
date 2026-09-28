/** 链接检查：提取页面链接并检测存活 */

/** 输入非法或检测失败时抛出，由 UI 捕获展示 */
export class LinkCheckError extends Error {
  readonly kind: 'input' | 'timeout' | 'network'
  constructor(message: string, kind: 'input' | 'timeout' | 'network' = 'input') {
    super(message)
    this.name = 'LinkCheckError'
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

/** 校验 URL 为 http(s)，返回规范化后的 href */
export function validateUrl(input: string): string {
  const trimmed = input.trim()
  if (trimmed === '') throw new LinkCheckError('请输入 URL，例如 https://example.com')
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new LinkCheckError('URL 格式不正确，请输入以 http:// 或 https:// 开头的完整地址')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new LinkCheckError('只支持 http:// 与 https:// 协议')
  }
  return url.href
}

export type LinkCategory = '站内' | '站外' | '跳过'

export interface PageLink {
  readonly url: string
  readonly text: string
  readonly category: LinkCategory
  /** category 为跳过时的原因 */
  readonly skipReason: string
}

/** 取标签属性值（支持双引号 / 单引号 / 无引号），缺失返回 null */
function getAttr(tag: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')
  const m = re.exec(tag)
  if (!m) return null
  return m[1] ?? m[2] ?? (m[3] as string)
}

/** 去掉标签、压缩空白 */
function cleanText(innerHtml: string): string {
  return innerHtml.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

/** 按文档顺序提取 a[href]：去重、转绝对地址、分类（纯函数，可单测） */
export function extractLinks(html: string, baseUrl: string): PageLink[] {
  const base = validateUrl(baseUrl)
  const baseOrigin = new URL(base).origin
  const links: PageLink[] = []
  const seen = new Set<string>()
  const re = /<a\b[^>]*>([\s\S]*?)<\/a\s*>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const rawHref = getAttr(m[0], 'href')
    const text = cleanText(m[1])
    const push = (url: string, category: LinkCategory, skipReason: string): void => {
      if (seen.has(url)) return
      seen.add(url)
      links.push({ url, text, category, skipReason })
    }
    if (rawHref === null || rawHref.trim() === '') {
      push(`#skip-${links.length}`, '跳过', '空 href')
      continue
    }
    const href = rawHref.trim()
    const lower = href.toLowerCase()
    if (lower.startsWith('mailto:') || lower.startsWith('tel:')) {
      push(href, '跳过', 'mailto:/tel: 链接不检测')
      continue
    }
    if (lower.startsWith('javascript:')) {
      push(href, '跳过', 'javascript: 伪协议不检测')
      continue
    }
    if (href.startsWith('#')) {
      push(href, '跳过', '页面内锚点不检测')
      continue
    }
    let resolved: URL
    try {
      resolved = new URL(href, base)
    } catch {
      push(href, '跳过', '非法 URL')
      continue
    }
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
      push(href, '跳过', `不支持的协议：${resolved.protocol}`)
      continue
    }
    const absolute = resolved.href
    push(absolute, resolved.origin === baseOrigin ? '站内' : '站外', '')
  }
  return links
}

export type LinkStatus = '正常' | '重定向' | '死链' | '超时' | '错误' | '跳过'

export interface LinkCheckResult {
  readonly url: string
  readonly text: string
  readonly category: LinkCategory
  readonly status: LinkStatus
  /** HTTP 状态码；跳过 / 超时 / 网络错误时为 null */
  readonly httpStatus: number | null
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
        throw new LinkCheckError(`请求超时（超过 ${timeoutMs} 毫秒）`, 'timeout')
      }
      throw new LinkCheckError(
        `网络请求失败：${error instanceof Error ? error.message : String(error)}（目标可能不允许跨域访问）`,
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

function classifyStatus(httpStatus: number): LinkStatus {
  if (httpStatus < 300) return '正常'
  if (httpStatus < 400) return '重定向'
  return '死链'
}

/** 检测单个链接（纯逻辑，fetch 可注入，可单测） */
export async function checkLink(
  link: PageLink,
  fetchFn: FetchFn = defaultFetch,
  timeoutMs = 15000,
): Promise<LinkCheckResult> {
  const base = { url: link.url, text: link.text, category: link.category }
  if (link.category === '跳过') {
    return { ...base, status: '跳过', httpStatus: null, note: link.skipReason, ms: 0 }
  }
  const started = Date.now()
  try {
    const httpStatus = await fetchSingle(link.url, fetchFn, timeoutMs)
    return {
      ...base,
      status: classifyStatus(httpStatus),
      httpStatus,
      note: `HTTP ${httpStatus}`,
      ms: Date.now() - started,
    }
  } catch (error) {
    if (error instanceof LinkCheckError && error.kind === 'timeout') {
      return { ...base, status: '超时', httpStatus: null, note: error.message, ms: Date.now() - started }
    }
    return {
      ...base,
      status: '错误',
      httpStatus: null,
      note: errorMessage(error),
      ms: Date.now() - started,
    }
  }
}

export interface CheckLinksOptions {
  readonly concurrency?: number
  readonly timeoutMs?: number
  readonly onProgress?: (done: number, total: number) => void
}

/** 并发检测一批链接，保持输入顺序（fetch 可注入，可单测） */
export async function checkLinks(
  links: readonly PageLink[],
  fetchFn: FetchFn = defaultFetch,
  opts: CheckLinksOptions = {},
): Promise<LinkCheckResult[]> {
  const concurrency = Math.max(1, opts.concurrency ?? 5)
  const timeoutMs = opts.timeoutMs ?? 15000
  const results: LinkCheckResult[] = new Array(links.length)
  let next = 0
  let done = 0
  const worker = async (): Promise<void> => {
    while (next < links.length) {
      const i = next
      next += 1
      results[i] = await checkLink(links[i], fetchFn, timeoutMs)
      done += 1
      opts.onProgress?.(done, links.length)
    }
  }
  const workers: Promise<void>[] = []
  for (let w = 0; w < Math.min(concurrency, links.length); w++) workers.push(worker())
  await Promise.all(workers)
  return results
}

/** 抓取页面 HTML（抓取模式用，fetch 可注入） */
export async function fetchPageHtml(
  pageUrl: string,
  fetchFn: FetchFn = defaultFetch,
  timeoutMs = 15000,
): Promise<string> {
  const url = validateUrl(pageUrl)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetchFn(url, { signal: controller.signal })
    if (!res.ok) throw new LinkCheckError(`抓取页面失败：HTTP ${res.status}`)
    return await res.text()
  } catch (error) {
    if (error instanceof LinkCheckError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new LinkCheckError(`抓取页面超时（超过 ${timeoutMs} 毫秒）`, 'timeout')
    }
    throw new LinkCheckError(
      `抓取页面失败：${error instanceof Error ? error.message : String(error)}（目标可能不允许跨域访问，请改用「粘贴HTML」模式）`,
      'network',
    )
  } finally {
    clearTimeout(timer)
  }
}

export interface LinkCheckSummary {
  readonly total: number
  readonly ok: number
  readonly redirect: number
  readonly dead: number
  readonly timeout: number
  readonly error: number
  readonly skipped: number
}

/** 汇总检测结果 */
export function summarize(results: readonly LinkCheckResult[]): LinkCheckSummary {
  const counts = { ok: 0, redirect: 0, dead: 0, timeout: 0, error: 0, skipped: 0 }
  for (const r of results) {
    if (r.status === '正常') counts.ok += 1
    else if (r.status === '重定向') counts.redirect += 1
    else if (r.status === '死链') counts.dead += 1
    else if (r.status === '超时') counts.timeout += 1
    else if (r.status === '错误') counts.error += 1
    else counts.skipped += 1
  }
  return { total: results.length, ...counts }
}

/** 渲染检测报告文本（复制 / 下载用） */
export function renderReport(results: readonly LinkCheckResult[]): string {
  const s = summarize(results)
  const lines: string[] = []
  lines.push(
    `共 ${s.total} 个链接：正常 ${s.ok}\u3000重定向 ${s.redirect}\u3000死链 ${s.dead}\u3000超时 ${s.timeout}\u3000错误 ${s.error}\u3000跳过 ${s.skipped}`,
  )
  const bad = results.filter((r) => r.status === '死链' || r.status === '超时' || r.status === '错误')
  if (bad.length > 0) {
    lines.push('')
    lines.push('需处理：')
    for (const r of bad) lines.push(`  [${r.status}] ${r.url}（${r.note}）`)
  }
  lines.push('')
  lines.push('明细：')
  for (const r of results) {
    lines.push(`  [${r.status}] [${r.category}] ${r.url}${r.httpStatus === null ? '' : ` HTTP ${r.httpStatus}`}`)
  }
  return lines.join('\n')
}
