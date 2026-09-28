/**
 * json-ld —— JSON-LD 结构化数据生成的纯函数层（#625）
 *
 * 纯 JS：按类型把表单字段组装成 schema.org 对象，JSON.stringify（缩进 2 格）
 * 后包一层 <script type="application/ld+json"> 输出。
 * 必填缺失、多行文本格式错误抛中文错；输出前做 JSON 回环校验，
 * 并转义 </script 防止标签被提前闭合。
 * 不触碰任何浏览器 API，可在 node 下被 vitest 完整测试。
 */

/** 支持的结构化数据类型 */
export type JsonLdType = 'Article' | 'Product' | 'FAQPage' | 'BreadcrumbList' | 'Organization'

/** 各类型的表单字段（UI 按类型只展示相关项） */
export interface JsonLdFields {
  readonly headline?: string
  readonly name?: string
  readonly description?: string
  readonly author?: string
  readonly datePublished?: string
  readonly image?: string
  readonly url?: string
  readonly brand?: string
  readonly price?: string
  readonly priceCurrency?: string
  /** FAQPage：多行文本，每行「问题 || 答案」 */
  readonly questions?: string
  /** BreadcrumbList：多行文本，每行「名称 || URL」 */
  readonly breadcrumbs?: string
  readonly logo?: string
  /** Organization：多行文本，每行一个 URL */
  readonly sameAs?: string
}

export interface FaqItem {
  readonly question: string
  readonly answer: string
}

export interface BreadcrumbItem {
  readonly name: string
  readonly url: string
}

/** 去首尾空格，未传视为空字符串 */
function field(value: string | undefined): string {
  return (value ?? '').trim()
}

/** 是否合法的 http(s) 绝对 URL */
function isHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * 解析 FAQ 多行文本：每行「问题 || 答案」。
 * 空行跳过；缺分隔符或任一侧为空抛中文错（带行号）。
 */
export function parseFaqLines(text: string | undefined): FaqItem[] {
  const items: FaqItem[] = []
  const lines = (text ?? '').split('\n')
  lines.forEach((line, i) => {
    const t = line.trim()
    if (t === '') return
    const parts = t.split('||')
    if (parts.length !== 2 || parts[0].trim() === '' || parts[1].trim() === '') {
      throw new Error(`第 ${i + 1} 行格式错误，应为「问题 || 答案」`)
    }
    items.push({ question: parts[0].trim(), answer: parts[1].trim() })
  })
  return items
}

/**
 * 解析面包屑多行文本：每行「名称 || URL」。
 * URL 须为 http(s) 绝对地址，否则抛中文错（带行号）。
 */
export function parseBreadcrumbLines(text: string | undefined): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = []
  const lines = (text ?? '').split('\n')
  lines.forEach((line, i) => {
    const t = line.trim()
    if (t === '') return
    const parts = t.split('||')
    if (parts.length !== 2 || parts[0].trim() === '' || parts[1].trim() === '') {
      throw new Error(`第 ${i + 1} 行格式错误，应为「名称 || URL」`)
    }
    const url = parts[1].trim()
    if (!isHttpUrl(url)) {
      throw new Error(`第 ${i + 1} 行 URL 不合法，应为 http(s) 绝对地址`)
    }
    items.push({ name: parts[0].trim(), url })
  })
  return items
}

/** 解析多行 URL 文本：空行跳过，非 http(s) 地址抛中文错（带行号） */
export function parseUrlLines(text: string | undefined): string[] {
  const urls: string[] = []
  const lines = (text ?? '').split('\n')
  lines.forEach((line, i) => {
    const t = line.trim()
    if (t === '') return
    if (!isHttpUrl(t)) {
      throw new Error(`第 ${i + 1} 行 URL 不合法，应为 http(s) 绝对地址`)
    }
    urls.push(t)
  })
  return urls
}

/** 可选字段：非空才写入对象 */
function put(obj: Record<string, unknown>, key: string, value: string | undefined): void {
  const v = field(value)
  if (v !== '') obj[key] = v
}

function buildArticle(f: JsonLdFields): Record<string, unknown> {
  const headline = field(f.headline)
  if (headline === '') throw new Error('Article 的 headline（标题）不能为空')
  const obj: Record<string, unknown> = { '@context': 'https://schema.org', '@type': 'Article', headline }
  put(obj, 'description', f.description)
  const author = field(f.author)
  if (author !== '') obj.author = { '@type': 'Person', name: author }
  put(obj, 'datePublished', f.datePublished)
  put(obj, 'image', f.image)
  put(obj, 'url', f.url)
  return obj
}

function buildProduct(f: JsonLdFields): Record<string, unknown> {
  const name = field(f.name)
  if (name === '') throw new Error('Product 的 name（商品名）不能为空')
  const obj: Record<string, unknown> = { '@context': 'https://schema.org', '@type': 'Product', name }
  put(obj, 'description', f.description)
  put(obj, 'image', f.image)
  put(obj, 'url', f.url)
  const brand = field(f.brand)
  if (brand !== '') obj.brand = { '@type': 'Brand', name: brand }
  const price = field(f.price)
  const currency = field(f.priceCurrency)
  if (price !== '' || currency !== '') {
    const offers: Record<string, unknown> = { '@type': 'Offer' }
    if (price !== '') offers.price = price
    if (currency !== '') offers.priceCurrency = currency
    obj.offers = offers
  }
  return obj
}

function buildFaqPage(f: JsonLdFields): Record<string, unknown> {
  const items = parseFaqLines(f.questions)
  if (items.length === 0) throw new Error('FAQPage 至少需要 1 条问答')
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.question,
      acceptedAnswer: { '@type': 'Answer', text: it.answer },
    })),
  }
}

function buildBreadcrumbList(f: JsonLdFields): Record<string, unknown> {
  const items = parseBreadcrumbLines(f.breadcrumbs)
  if (items.length === 0) throw new Error('BreadcrumbList 至少需要 1 条面包屑')
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  }
}

function buildOrganization(f: JsonLdFields): Record<string, unknown> {
  const name = field(f.name)
  if (name === '') throw new Error('Organization 的 name（组织名）不能为空')
  const obj: Record<string, unknown> = { '@context': 'https://schema.org', '@type': 'Organization', name }
  put(obj, 'url', f.url)
  put(obj, 'logo', f.logo)
  put(obj, 'description', f.description)
  const sameAs = parseUrlLines(f.sameAs)
  if (sameAs.length > 0) obj.sameAs = sameAs
  return obj
}

/**
 * 由类型与表单字段生成 JSON-LD script 代码。
 * 必填缺失抛中文错；输出前做 JSON 回环校验保证合法；
 * `</script` 转义为 `<\/script`，防止内容提前闭合标签。
 */
export function buildJsonLd(type: JsonLdType, fields: JsonLdFields): string {
  let obj: Record<string, unknown>
  switch (type) {
    case 'Article':
      obj = buildArticle(fields)
      break
    case 'Product':
      obj = buildProduct(fields)
      break
    case 'FAQPage':
      obj = buildFaqPage(fields)
      break
    case 'BreadcrumbList':
      obj = buildBreadcrumbList(fields)
      break
    case 'Organization':
      obj = buildOrganization(fields)
      break
  }
  const json = JSON.stringify(obj, null, 2)
  // 回环校验：保证输出是合法 JSON
  JSON.parse(json)
  const safe = json.replace(/<\/script/gi, '<\\/script')
  return `<script type="application/ld+json">\n${safe}\n</script>\n`
}
