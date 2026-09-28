/**
 * canonical —— 规范链接标签生成的纯函数层（#626）
 *
 * 纯 JS：页面 URL 与规范 URL 均须为 http(s) 绝对地址，任一不合法抛中文错；
 * 属性值做 HTML 转义后输出 <link rel="canonical" href="…">。
 * 不触碰任何浏览器 API，可在 node 下被 vitest 完整测试。
 */

/** HTML 属性转义：& < > " */
export function escapeHtmlAttr(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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
 * 由页面 URL 与规范 URL 生成 canonical 标签代码。
 * 任一为空或不合法抛中文错。
 */
export function buildCanonicalTag(pageUrl: string, canonicalUrl: string): string {
  const page = (pageUrl ?? '').trim()
  const canonical = (canonicalUrl ?? '').trim()
  if (page === '') throw new Error('页面 URL 不能为空')
  if (!isHttpUrl(page)) throw new Error('页面 URL 不合法，应为 http(s) 绝对地址')
  if (canonical === '') throw new Error('规范 URL 不能为空')
  if (!isHttpUrl(canonical)) throw new Error('规范 URL 不合法，应为 http(s) 绝对地址')
  return `<link rel="canonical" href="${escapeHtmlAttr(canonical)}">\n`
}
