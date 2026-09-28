import type { SeoAuditInput, SeoAuditOptions } from './schema'

export type CheckStatus = '通过' | '警告' | '问题'

export interface AuditItem {
  check: string
  status: CheckStatus
  detail: string
}

export interface AuditResult {
  score: number
  items: AuditItem[]
}

/** 取指定标签的全部开标签（属性串一并带出），标签名大小写不敏感 */
function findTags(html: string, tag: string): string[] {
  return html.match(new RegExp(`<${tag}\\b[^>]*>`, 'gi')) ?? []
}

/**
 * 从开标签属性串里取属性值。
 * 属性名大小写不敏感、顺序任意；属性值支持双引号 / 单引号 / 无引号三种写法。
 * 找不到返回 null。
 */
function getAttr(tag: string, name: string): string | null {
  const m = new RegExp(`\\b${name}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, 'i').exec(tag)
  if (!m) return null
  const raw = m[1]
  const first = raw[0]
  if (first === '"' || first === "'") return raw.slice(1, -1).trim()
  return raw.trim()
}

/** 取 <meta name|property="X"> 的 content；name 大小写不敏感；不存在返回 null */
function metaContent(html: string, name: string): string | null {
  for (const tag of findTags(html, 'meta')) {
    const attrName = getAttr(tag, 'name') ?? getAttr(tag, 'property')
    if (attrName !== null && attrName.toLowerCase() === name) {
      return getAttr(tag, 'content') ?? ''
    }
  }
  return null
}

/** 取 <link rel="X"> 的 href（属性顺序任意、大小写不敏感）；不存在返回 null */
function linkHref(html: string, rel: string): string | null {
  for (const tag of findTags(html, 'link')) {
    const relValue = getAttr(tag, 'rel')
    if (relValue === null || relValue.toLowerCase() !== rel) continue
    const href = getAttr(tag, 'href')
    if (href !== null) return href
  }
  return null
}

/** 对 HTML 源码做 11 项 SEO 审计（纯正则解析，不依赖 DOM）。pageUrl 仅用于丰富 canonical 缺失时的提示。 */
export function auditHtml(html: string, pageUrl?: string): AuditResult {
  const items: AuditItem[] = []
  const push = (check: string, status: CheckStatus, detail: string): void => {
    items.push({ check, status, detail })
  }

  // 1. <title> 存在性与长度（去空白后字符数）
  const titleMatch = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(html)
  if (titleMatch === null) {
    push('title 标签', '问题', '缺少 <title> 标签')
  } else {
    const len = titleMatch[1].replace(/\s+/g, '').length
    if (len < 10) {
      push('title 标签', '问题', `title 过短（${len} 个字符，去空白后计），建议 10–60 个字符`)
    } else if (len > 60) {
      push('title 标签', '警告', `title 过长（${len} 个字符，去空白后计），建议不超过 60 个字符`)
    } else {
      push('title 标签', '通过', `title 长度合适（${len} 个字符，去空白后计）`)
    }
  }

  // 2. meta description 存在性与长度
  const description = metaContent(html, 'description')
  if (description === null) {
    push('meta description', '问题', '缺少 meta description')
  } else {
    const descLen = description.replace(/\s+/g, '').length
    if (descLen > 160) {
      push(
        'meta description',
        '警告',
        `meta description 过长（${descLen} 个字符，去空白后计），建议不超过 160 个字符`,
      )
    } else {
      push('meta description', '通过', 'meta description 存在且长度合适')
    }
  }

  // 3. canonical link 存在性
  const canonical = linkHref(html, 'canonical')
  if (canonical === null) {
    push(
      'canonical 链接',
      '警告',
      pageUrl ? `缺少 canonical 链接（页面：${pageUrl}）` : '缺少 canonical 链接',
    )
  } else {
    push('canonical 链接', '通过', `canonical 指向 ${canonical}`)
  }

  // 4. Open Graph 标签
  const ogNames = ['og:title', 'og:description', 'og:image'] as const
  const ogMissing = ogNames.filter((name) => metaContent(html, name) === null)
  if (ogMissing.length === 0) {
    push('Open Graph 标签', '通过', 'og:title / og:description / og:image 齐全')
  } else {
    push('Open Graph 标签', '警告', `缺少 ${ogMissing.join('、')}`)
  }

  // 5. twitter:card
  if (metaContent(html, 'twitter:card') === null) {
    push('Twitter Card', '警告', '缺少 twitter:card')
  } else {
    push('Twitter Card', '通过', 'twitter:card 已设置')
  }

  // 6. hreflang link（多语言站才需要，缺失为警告而非问题）
  let hreflangValue: string | null = null
  for (const tag of findTags(html, 'link')) {
    const relValue = getAttr(tag, 'rel')
    if (relValue !== null && relValue.toLowerCase() === 'alternate') {
      const langValue = getAttr(tag, 'hreflang')
      if (langValue !== null) {
        hreflangValue = langValue
        break
      }
    }
  }
  if (hreflangValue === null) {
    push('hreflang 链接', '警告', '缺少 hreflang 链接（多语言站才需要，故为警告）')
  } else {
    push('hreflang 链接', '通过', `hreflang 指向语言版本：${hreflangValue}`)
  }

  // 7. h1 数量
  const h1Count = findTags(html, 'h1').length
  if (h1Count === 0) {
    push('h1 标题', '问题', '页面缺少 <h1> 标签')
  } else if (h1Count === 1) {
    push('h1 标题', '通过', '页面有且仅有 1 个 <h1>')
  } else {
    push('h1 标题', '警告', `页面有 ${h1Count} 个 <h1>，建议只保留 1 个`)
  }

  // 8. img 缺 alt（无 alt 或 alt 为空都算缺失）
  const imgTags = findTags(html, 'img')
  const imgMissingAlt = imgTags.filter((tag) => {
    const alt = getAttr(tag, 'alt')
    return alt === null || alt === ''
  }).length
  if (imgTags.length === 0) {
    push('图片 alt', '通过', '页面没有 <img> 标签')
  } else if (imgMissingAlt === 0) {
    push('图片 alt', '通过', `${imgTags.length} 张图片均设置了 alt`)
  } else {
    push(
      '图片 alt',
      '警告',
      `${imgTags.length} 张图片中有 ${imgMissingAlt} 张缺少 alt（无 alt 或 alt 为空）`,
    )
  }

  // 9. viewport meta（移动端必需）
  if (metaContent(html, 'viewport') === null) {
    push('viewport meta', '问题', '缺少 viewport meta（移动端必需）')
  } else {
    push('viewport meta', '通过', 'viewport meta 已设置')
  }

  // 10. JSON-LD 结构化数据
  const hasJsonLd = findTags(html, 'script').some((tag) => {
    const type = getAttr(tag, 'type')
    return type !== null && type.toLowerCase() === 'application/ld+json'
  })
  if (!hasJsonLd) {
    push('JSON-LD 结构化数据', '警告', '缺少 application/ld+json 结构化数据')
  } else {
    push('JSON-LD 结构化数据', '通过', '存在 JSON-LD 结构化数据')
  }

  // 11. <html lang> 属性
  const htmlTags = findTags(html, 'html')
  const lang = htmlTags.length === 0 ? null : getAttr(htmlTags[0], 'lang')
  if (lang === null || lang === '') {
    push('<html lang>', '警告', '缺少 <html lang> 属性')
  } else {
    push('<html lang>', '通过', `<html lang="${lang}">`)
  }

  return { score: scoreAudit(items), items }
}

/** 评分：通过=1 分、警告=0.5 分、问题=0 分；空数组返回 0 */
export function scoreAudit(items: AuditItem[]): number {
  if (items.length === 0) return 0
  let pass = 0
  let warn = 0
  for (const item of items) {
    if (item.status === '通过') {
      pass += 1
    } else if (item.status === '警告') {
      warn += 1
    }
  }
  return Math.round((100 * (pass + 0.5 * warn)) / items.length)
}

const FETCH_TIMEOUT_MS = 15_000

/**
 * 抓取页面 HTML。
 * fetch 经 fetchFn 参数注入（默认 globalThis.fetch），便于单测 mock，绝不发真实请求。
 * 非法 URL / 非 2xx / 非 HTML content-type / 超时 / 网络异常一律抛中文错。
 */
export async function fetchHtml(
  url: string,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<string> {
  const trimmed = url.trim()
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error('URL 不合法：必须以 http:// 或 https:// 开头')
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetchFn(trimmed, { signal: controller.signal })
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('抓取超时（15 秒），目标站响应过慢或不可达', { cause: error })
    }
    throw new Error(
      '抓取失败：' +
        (error instanceof Error ? error.message : String(error)) +
        '（可能是目标站未开放 CORS，改用粘贴 HTML 模式）',
      { cause: error },
    )
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok) throw new Error(`抓取失败：HTTP ${res.status}`)
  const contentType = res.headers.get('content-type') ?? ''
  if (!/html/i.test(contentType)) {
    throw new Error(`目标不是 HTML 页面（content-type: ${contentType || '未知'}），无法审计`)
  }
  return res.text()
}

/** 把审计结果渲染成纯文本报告（供输出区 / 复制 / 下载） */
export function renderResult(result: AuditResult): string {
  const lines = [`总分：${result.score}/100`]
  for (const item of result.items) {
    lines.push(`[${item.status}] ${item.check}：${item.detail}`)
  }
  return lines.join('\n')
}

/** 工具入口：fetch 模式先抓取再审计，paste 模式直接审计；空输入抛中文错 */
export async function transform(
  input: SeoAuditInput,
  options: SeoAuditOptions,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<string> {
  const text = input.text.trim()
  if (text === '') throw new Error('请输入要审计的页面 URL，或粘贴 HTML 源码')
  if (options.mode === 'fetch') {
    const html = await fetchHtml(text, fetchFn)
    return renderResult(auditHtml(html, text))
  }
  return renderResult(auditHtml(input.text))
}
