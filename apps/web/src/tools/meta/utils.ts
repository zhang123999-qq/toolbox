/**
 * meta —— HTML meta 标签生成的纯函数层
 *
 * 纯 JS：把表单字段转成 <title> 与 <meta> 标签行，跳过空字段，
 * 属性值与文本内容做 HTML 转义；标题缺失抛中文错。
 * 不触碰任何浏览器 API，可在 node 下被 vitest 完整测试。
 */

/** 表单字段：title 必填，其余可选 */
export interface MetaFields {
  readonly title: string
  readonly description?: string
  readonly keywords?: string
  readonly author?: string
  readonly viewport?: string
  readonly charset?: string
  readonly themeColor?: string
}

/** HTML 转义：& < > "（用于属性值与元素文本） */
export function escapeHtml(raw: string): string {
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
 * 由表单字段生成 meta 标签代码。
 * title 为空抛中文错；其余空字段整行跳过。
 */
export function buildMetaTags(f: MetaFields): string {
  const title = f.title.trim()
  if (title === '') throw new Error('页面标题（title）不能为空')
  const lines: string[] = [`<title>${escapeHtml(title)}</title>`]

  const named: ReadonlyArray<readonly [string, string]> = [
    ['description', field(f.description)],
    ['keywords', field(f.keywords)],
    ['author', field(f.author)],
    ['viewport', field(f.viewport)],
  ]
  for (const [name, value] of named) {
    if (value !== '') lines.push(`<meta name="${name}" content="${escapeHtml(value)}">`)
  }
  const charset = field(f.charset)
  if (charset !== '') lines.push(`<meta charset="${escapeHtml(charset)}">`)
  const themeColor = field(f.themeColor)
  if (themeColor !== '') lines.push(`<meta name="theme-color" content="${escapeHtml(themeColor)}">`)
  return lines.join('\n') + '\n'
}
