/**
 * hreflang —— 多语言标注标签生成的纯函数层（#627）
 *
 * 纯 JS：语言-地区对列表转 <link rel="alternate" hreflang="…"> 标签组。
 * 语言代码须匹配 /^[a-z]{2}(-[A-Z]{2})?$/（如 en、zh-CN），URL 须为 http(s)
 * 绝对地址；列表为空、代码格式错、URL 不合法均抛中文错（带条目序号）。
 * 不触碰任何浏览器 API，可在 node 下被 vitest 完整测试。
 */

/** 下拉框可选的常用 BCP47 语言代码 */
export const LANGUAGES: readonly string[] = [
  'en',
  'en-US',
  'en-GB',
  'zh-CN',
  'zh-TW',
  'ja',
  'ko',
  'fr',
  'de',
  'es',
  'pt',
  'pt-BR',
  'ru',
  'ar',
  'hi',
  'it',
  'nl',
  'pl',
  'tr',
  'vi',
  'th',
  'id',
  'ms',
]

/** 单条语言-地区对 */
export interface HreflangEntry {
  readonly lang: string
  readonly url: string
}

/** HTML 属性转义：& < > " */
export function escapeHtmlAttr(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 语言代码格式：两位小写语言 + 可选的 -两位大写地区 */
export function isLangCode(raw: string): boolean {
  return /^[a-z]{2}(-[A-Z]{2})?$/.test(raw)
}

/** 是否合法的 http(s) 绝对 URL */
export function isHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim())
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * 由语言-地区对列表生成 hreflang 标签组。
 * 列表至少 1 条；逐条校验语言代码与 URL，失败抛中文错（带条目序号）。
 */
export function buildHreflangTags(entries: readonly HreflangEntry[]): string {
  if (entries.length === 0) throw new Error('至少需要 1 条语言-地区对')
  const lines = entries.map((e, i) => {
    const n = i + 1
    const lang = (e.lang ?? '').trim()
    const url = (e.url ?? '').trim()
    if (lang === '') throw new Error(`第 ${n} 条：语言代码不能为空`)
    if (!isLangCode(lang))
      throw new Error(`第 ${n} 条：语言代码「${lang}」格式错误，应为如 en、zh-CN 的 BCP47 格式`)
    if (url === '') throw new Error(`第 ${n} 条：URL 不能为空`)
    if (!isHttpUrl(url)) throw new Error(`第 ${n} 条：URL 不合法，应为 http(s) 绝对地址`)
    return `<link rel="alternate" hreflang="${escapeHtmlAttr(lang)}" href="${escapeHtmlAttr(url)}">`
  })
  return lines.join('\n') + '\n'
}
