import type { OgPreviewInput, OgPreviewOptions } from './schema'

/** 从 HTML 里提取出的 Open Graph / Twitter Card 标签 */
export interface OgTags {
  title?: string
  description?: string
  image?: string
  type?: string
  url?: string
  siteName?: string
  twitterCard?: string
  twitterTitle?: string
  twitterDescription?: string
  twitterImage?: string
  favicon?: string
}

const META_TAG_RE = /<meta\b[^>]*>/gi
const LINK_TAG_RE = /<link\b[^>]*>/gi
/** 属性名 = 值；值支持双引号、单引号或无引号 */
const ATTR_RE = /([\w-]+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi
const TITLE_RE = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i
const FETCH_TIMEOUT_MS = 15000
const NOT_SET = '（未设置）'

/** 把 HTML 标签上的属性解析成小写键名的 Map；引号值去引号 */
function parseAttrs(tag: string): Map<string, string> {
  const attrs = new Map<string, string>()
  for (const attr of tag.matchAll(ATTR_RE)) {
    const raw = attr[2]
    const quote = raw.charAt(0)
    attrs.set(attr[1].toLowerCase(), quote === '"' || quote === "'" ? raw.slice(1, -1) : raw)
  }
  return attrs
}

/**
 * 纯正则解析所有 <meta> 标签，取 property 或 name（小写化）与 content。
 * 属性支持单/双引号、无引号、任意顺序、大小写不敏感；无 content 的跳过。
 */
export function extractMetaTags(html: string): Array<{ key: string; content: string }> {
  const found: Array<{ key: string; content: string }> = []
  for (const tag of html.matchAll(META_TAG_RE)) {
    const attrs = parseAttrs(tag[0])
    const key = (attrs.get('property') ?? attrs.get('name') ?? '').toLowerCase()
    const content = attrs.get('content')
    if (key !== '' && content !== undefined) {
      found.push({ key, content })
    }
  }
  return found
}

/** 从 <link> 标签里找 favicon：rel 含 icon 即算（兼容 shortcut icon） */
function extractFavicon(html: string): string | undefined {
  for (const tag of html.matchAll(LINK_TAG_RE)) {
    const attrs = parseAttrs(tag[0])
    const rel = (attrs.get('rel') ?? '').toLowerCase()
    if (!rel.split(/\s+/).includes('icon')) continue
    const href = attrs.get('href')
    if (href) return href
  }
  return undefined
}

/**
 * 从 extractMetaTags 结果映射出 og/twitter 标签。
 * title 缺失时回退到 <title> 文本，description 缺失时回退到 meta[name=description]。
 */
export function extractOgTags(html: string): OgTags {
  const tags = extractMetaTags(html)
  const get = (key: string): string | undefined => tags.find((t) => t.key === key)?.content
  const out: OgTags = {
    title: get('og:title'),
    description: get('og:description'),
    image: get('og:image'),
    type: get('og:type'),
    url: get('og:url'),
    siteName: get('og:site_name'),
    twitterCard: get('twitter:card'),
    twitterTitle: get('twitter:title'),
    twitterDescription: get('twitter:description'),
    twitterImage: get('twitter:image'),
  }
  if (out.title === undefined) {
    const m = TITLE_RE.exec(html)
    if (m) out.title = m[1].trim()
  }
  if (out.description === undefined) {
    out.description = get('description')
  }
  const favicon = extractFavicon(html)
  if (favicon !== undefined) out.favicon = favicon
  return out
}

/** 缺 og:title / og:description / og:image / twitter:card 时返回中文补充建议；全齐返回 [] */
export function getMissingSuggestions(tags: OgTags): string[] {
  const suggestions: string[] = []
  if (!tags.title) {
    suggestions.push('缺少 og:title，分享时将回退显示 <title> 或 URL，建议补充与正文一致的标题')
  }
  if (!tags.description) {
    suggestions.push('缺少 og:description，分享时无摘要文字，建议补充 80–160 字的页面描述')
  }
  if (!tags.image) {
    suggestions.push('缺少 og:image，分享时无法显示大图，建议补充 1200×630 图片')
  }
  if (!tags.twitterCard) {
    suggestions.push('缺少 twitter:card，建议补充（如 summary_large_image），否则 X 可能降级显示')
  }
  return suggestions
}

/** 相对 og:image 转绝对 URL；解析失败返回原值 */
export function resolveUrl(base: string, maybeRelative: string): string {
  try {
    return new URL(maybeRelative, base).toString()
  } catch {
    return maybeRelative
  }
}

/** 校验 URL 为 http(s) */
function assertHttpUrl(url: string): string {
  const trimmed = url.trim()
  if (trimmed === '') throw new Error('请输入要抓取的页面 URL，例如 https://example.com')
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error('URL 格式不正确，请输入完整的 http(s) 地址')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('只支持 http / https 协议的 URL')
  }
  return trimmed
}

/**
 * 抓取页面 HTML：校验 http(s)、15 秒 AbortController 超时、非 2xx 抛错、
 * content-type 非 html 抛错；网络异常中文错注明 CORS 限制、建议改用粘贴模式。
 * fetch 经 fetchFn 注入，默认用全局 fetch。
 */
export async function fetchHtml(
  url: string,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<string> {
  const target = assertHttpUrl(url)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetchFn(target, { signal: controller.signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('抓取超时（超过 15 秒），目标服务器响应太慢或不可达', { cause: error })
    }
    throw new Error(
      '网络请求失败：' +
        (error instanceof Error ? error.message : String(error)) +
        '。可能是目标站未开放 CORS，改用「粘贴 HTML」模式',
      { cause: error },
    )
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) throw new Error(`目标服务器返回 HTTP ${res.status}`)
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('html')) {
    throw new Error(
      `目标返回的不是 HTML（Content-Type: ${contentType === '' ? '未知' : contentType}）`,
    )
  }
  try {
    return await res.text()
  } catch (error) {
    throw new Error(
      '读取响应正文失败：' + (error instanceof Error ? error.message : String(error)),
      {
        cause: error,
      },
    )
  }
}

/** 纯文本摘要：供输出区 / 复制 / 下载；缺失字段标「（未设置）」 */
export function renderSummary(tags: OgTags): string {
  const line = (label: string, value: string | undefined): string => `${label}：${value ?? NOT_SET}`
  return [
    line('og:title', tags.title),
    line('og:description', tags.description),
    line('og:image', tags.image),
    line('og:type', tags.type),
    line('og:url', tags.url),
    line('og:site_name', tags.siteName),
    line('twitter:card', tags.twitterCard),
    line('twitter:title', tags.twitterTitle),
    line('twitter:description', tags.twitterDescription),
    line('twitter:image', tags.twitterImage),
  ].join('\n')
}

/** 入口：fetch 模式抓取后提取，paste 模式直接提取；空输入抛错 */
export async function transform(
  input: OgPreviewInput,
  options: OgPreviewOptions,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<string> {
  const text = input.text.trim()
  if (text === '') throw new Error('请输入页面 URL 或粘贴页面 HTML')
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const html = options.mode === 'fetch' ? await fetchHtml(text, fetchFn) : text
  return renderSummary(extractOgTags(html))
}
