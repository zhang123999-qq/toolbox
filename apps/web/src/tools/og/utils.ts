/**
 * og —— Open Graph 标签生成的纯函数层
 *
 * 纯 JS：把表单字段转成 <meta property="og:*"> 标签行，跳过空字段，
 * 属性值做 HTML 转义；og:title 缺失抛中文错。
 * 不触碰任何浏览器 API，可在 node 下被 vitest 完整测试。
 */

/** 表单字段：title 必填；type 默认 website，其余可选 */
export interface OgFields {
  readonly title: string
  readonly description?: string
  readonly image?: string
  readonly url?: string
  readonly type?: string
  readonly siteName?: string
}

/** HTML 属性转义：& < > " */
export function escapeHtmlAttr(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 取字段并去首尾空格，未传视为空字符串 */
function field(value: string | undefined): string {
  return (value ?? '').trim()
}

/**
 * 由表单字段生成 OG 标签代码。
 * og:title 为空抛中文错；其余空字段整行跳过。
 */
export function buildOgTags(f: OgFields): string {
  const title = f.title.trim()
  if (title === '') throw new Error('og:title 不能为空')
  const type = field(f.type) === '' ? 'website' : field(f.type)
  const lines: string[] = [
    `<meta property="og:title" content="${escapeHtmlAttr(title)}">`,
    `<meta property="og:type" content="${escapeHtmlAttr(type)}">`,
  ]
  const rest: ReadonlyArray<readonly [string, string]> = [
    ['og:description', field(f.description)],
    ['og:image', field(f.image)],
    ['og:url', field(f.url)],
    ['og:site_name', field(f.siteName)],
  ]
  for (const [prop, value] of rest) {
    if (value !== '') lines.push(`<meta property="${prop}" content="${escapeHtmlAttr(value)}">`)
  }
  return lines.join('\n') + '\n'
}
