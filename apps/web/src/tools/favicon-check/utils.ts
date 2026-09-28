import type { FaviconCheckInput, FaviconCheckOptions } from './schema'

/** 图标声明：href 已相对页面 URL 解析为绝对地址 */
export interface IconLink {
  href: string
  rel: string
  sizes?: string
  type?: string
}

/** 单个候选地址的检查结果（单点失败不抛错，由调用方汇总展示） */
export interface CheckResult {
  url: string
  ok: boolean
  status: number | null
  contentType: string | null
  note: string
}

/** HEAD 请求超时（毫秒） */
export const CHECK_TIMEOUT_MS = 15000

const LINK_TAG_RE = /<link\b[^>]*>/gi

/** rel 命中即视为图标声明：token 为 icon / 以 -icon 结尾 / apple-touch-icon-precomposed（大小写不敏感） */
function isIconRel(rel: string): boolean {
  return rel.split(/\s+/).some((token) => {
    const t = token.toLowerCase()
    return t === 'icon' || t.endsWith('-icon') || t === 'apple-touch-icon-precomposed'
  })
}

/** 从单个 <link> 标签里取指定属性的值（双引号 / 单引号 / 无引号都认） */
function attrValue(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, 'i'))
  if (!m) return undefined
  return m[1]!.replace(/^['"]|['"]$/g, '')
}

/**
 * 纯正则解析 HTML 中的 <link> 图标声明。
 * rel 含 icon / shortcut icon / apple-touch-icon / apple-touch-icon-precomposed /
 * mask-icon（大小写不敏感）即收录；href 相对 baseUrl 解析，解析失败或非 http(s) 则跳过该条。
 */
export function parseIconLinks(html: string, baseUrl: string): IconLink[] {
  const icons: IconLink[] = []
  if (html.trim() === '') return icons
  for (const m of html.matchAll(LINK_TAG_RE)) {
    const tag = m[0]
    const rel = attrValue(tag, 'rel')
    if (rel === undefined || !isIconRel(rel)) continue
    const rawHref = attrValue(tag, 'href')
    if (rawHref === undefined || rawHref.trim() === '') continue
    let href: string
    try {
      href = new URL(rawHref.trim(), baseUrl).href
    } catch {
      continue
    }
    if (!/^https?:\/\//i.test(href)) continue
    const icon: IconLink = { href, rel: rel.trim().replace(/\s+/g, ' ') }
    const sizes = attrValue(tag, 'sizes')
    if (sizes !== undefined && sizes !== '') icon.sizes = sizes
    const type = attrValue(tag, 'type')
    if (type !== undefined && type !== '') icon.type = type
    icons.push(icon)
  }
  return icons
}

/** 校验站点 URL（必须 http(s)），返回规范化后的地址；非法则抛中文错 */
export function assertPageUrl(pageUrl: string): string {
  const url = pageUrl.trim()
  if (url === '') throw new Error('请输入站点 URL，例如 https://example.com')
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('站点 URL 无效：请填写以 http:// 或 https:// 开头的完整地址')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('站点 URL 无效：仅支持 http:// 或 https:// 开头的地址')
  }
  return parsed.href
}

/** 默认候选：站点根目录的 /favicon.ico；pageUrl 非法则抛中文错 */
export function defaultCandidates(pageUrl: string): string[] {
  const normalized = assertPageUrl(pageUrl)
  return [`${new URL(normalized).origin}/favicon.ico`]
}

/**
 * 检查单个候选地址：先 HEAD（15 秒超时），405 / 501 时回退 GET。
 * ok = 状态码 2xx；网络异常 / 超时不抛错，返回 ok=false 的结果。
 * fetch 经 fetchFn 注入，便于测试。
 */
export async function checkUrl(
  url: string,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<CheckResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS)
  try {
    let res = await fetchFn(url, { method: 'HEAD', signal: controller.signal })
    if (res.status === 405 || res.status === 501) {
      res = await fetchFn(url, { method: 'GET', signal: controller.signal })
    }
    const ok = res.status >= 200 && res.status < 300
    return {
      url,
      ok,
      status: res.status,
      contentType: res.headers.get('content-type'),
      note: ok ? '可访问' : `HTTP ${res.status}`,
    }
  } catch (err) {
    const reason =
      err instanceof DOMException && err.name === 'AbortError'
        ? `请求超时（超过 ${CHECK_TIMEOUT_MS / 1000} 秒）`
        : err instanceof Error
          ? err.message
          : String(err)
    return { url, ok: false, status: null, contentType: null, note: `请求失败：${reason}` }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 完整检查：pageUrl 校验 http(s)；候选 = 声明 href 去重 + 默认地址去重
 * （已在声明中的 favicon.ico 不重复）；并发检查，声明的在前、默认的在后。
 */
export async function checkFavicon(
  pageUrl: string,
  html: string,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<CheckResult[]> {
  const normalized = assertPageUrl(pageUrl)
  const seen = new Set<string>()
  const candidates: string[] = []
  for (const icon of parseIconLinks(html, normalized)) {
    if (seen.has(icon.href)) continue
    seen.add(icon.href)
    candidates.push(icon.href)
  }
  for (const fallback of defaultCandidates(normalized)) {
    if (seen.has(fallback)) continue
    seen.add(fallback)
    candidates.push(fallback)
  }
  return Promise.all(candidates.map((candidate) => checkUrl(candidate, fetchFn)))
}

/** 结果表格「来源」列的文案：声明（rel/sizes/type）或默认地址 */
export function sourceLabel(url: string, icons: IconLink[]): string {
  const icon = icons.find((item) => item.href === url)
  if (!icon) return '默认地址'
  const detail = [`rel="${icon.rel}"`]
  if (icon.sizes) detail.push(`sizes="${icon.sizes}"`)
  if (icon.type) detail.push(`type="${icon.type}"`)
  return `声明：${detail.join(' ')}`
}

/** 按检查结果生成建议（报告与 UI 共用） */
export function buildSuggestions(results: CheckResult[], icons: IconLink[]): string[] {
  const tips: string[] = []
  if (icons.length === 0) {
    tips.push(
      '未发现任何图标声明：建议在页面 <head> 中添加 <link rel="icon" href="/favicon.ico">。',
    )
  } else if (!icons.some((icon) => icon.rel.toLowerCase().includes('apple-touch-icon'))) {
    tips.push(
      '缺少 apple-touch-icon：建议补充 180×180 的苹果触控图标，提升「添加到主屏幕」的体验。',
    )
  }
  const failed = results.filter((r) => !r.ok).length
  if (failed > 0) {
    tips.push(
      `${failed} 个地址检查失败：浏览器跨域 HEAD 请求可能被目标站点的 CORS 策略拦截导致误报，请结合上方的声明清单人工确认。`,
    )
  }
  if (tips.length === 0) tips.push('各项检查均通过：图标声明完整且地址可访问。')
  return tips
}

export interface RenderReportOptions {
  /** 是否提供了页面 HTML；未提供时注明「仅检查默认地址」 */
  htmlProvided?: boolean
}

/** 纯文本报告：声明清单 + 检查结果 + 建议 */
export function renderReport(
  results: CheckResult[],
  icons: IconLink[],
  options: RenderReportOptions = {},
): string {
  const unique: IconLink[] = []
  const seen = new Set<string>()
  for (const icon of icons) {
    if (seen.has(icon.href)) continue
    seen.add(icon.href)
    unique.push(icon)
  }
  const lines: string[] = ['Favicon 检查报告', '']
  if (!options.htmlProvided) {
    lines.push('说明：未提供页面 HTML，仅检查默认地址。', '')
  }
  lines.push(`声明的图标（${unique.length}）：`)
  if (unique.length === 0) {
    lines.push('（无）')
  } else {
    unique.forEach((icon, index) => {
      const detail = [`rel="${icon.rel}"`]
      if (icon.sizes) detail.push(`sizes="${icon.sizes}"`)
      if (icon.type) detail.push(`type="${icon.type}"`)
      lines.push(`  ${index + 1}. ${detail.join(' ')}`)
      lines.push(`     ${icon.href}`)
    })
  }
  lines.push('', `检查结果（${results.length}）：`)
  for (const r of results) {
    if (r.ok) {
      lines.push(`[OK] ${r.url} (${r.status}, ${r.contentType ?? '未知类型'})`)
    } else {
      lines.push(`[失败] ${r.url}（${r.status ?? '无响应'}，${r.note}）`)
    }
  }
  lines.push('', '建议：')
  for (const tip of buildSuggestions(results, unique)) {
    lines.push(`- ${tip}`)
  }
  return lines.join('\n')
}

/** 入口：空 URL 抛错；html 为空时只检查默认地址；返回纯文本报告 */
export async function transform(
  input: FaviconCheckInput,
  options: FaviconCheckOptions,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<string> {
  const url = input.text.trim()
  if (url === '') throw new Error('请输入站点 URL，例如 https://example.com')
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const html = options.html ?? ''
  const normalized = assertPageUrl(url)
  const results = await checkFavicon(normalized, html, fetchFn)
  const icons = parseIconLinks(html, normalized)
  return renderReport(results, icons, { htmlProvided: html.trim() !== '' })
}
