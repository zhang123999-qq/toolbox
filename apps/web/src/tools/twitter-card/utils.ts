/**
 * twitter-card —— Twitter Card 标签生成的纯函数层
 *
 * 纯 JS：把卡片类型与表单字段转成 <meta name="twitter:*"> 标签行，
 * 跳过空字段，属性值做 HTML 转义；标题缺失抛中文错。
 * 不触碰任何浏览器 API，可在 node 下被 vitest 完整测试。
 */

/** 允许的卡片类型 */
export const CARD_TYPES = ['summary', 'summary_large_image'] as const
export type CardType = (typeof CARD_TYPES)[number]

/** 表单字段：title 必填；card 默认 summary，其余可选 */
export interface TwitterCardFields {
  readonly title: string
  readonly card?: string
  readonly description?: string
  readonly image?: string
  readonly site?: string
}

/** HTML 属性转义：& < > " */
export function escapeHtmlAttr(raw: string): string {
  return raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** 取字段并去首尾空格，未传视为空字符串 */
function field(value: string | undefined): string {
  return (value ?? '').trim()
}

/**
 * 由表单字段生成 Twitter Card 标签代码。
 * 标题为空抛中文错；卡片类型非法抛中文错；其余空字段整行跳过。
 */
export function buildTwitterCardTags(f: TwitterCardFields): string {
  const title = f.title.trim()
  if (title === '') throw new Error('twitter:title 不能为空')
  const card = field(f.card) === '' ? 'summary' : field(f.card)
  if (!(CARD_TYPES as readonly string[]).includes(card)) {
    throw new Error(`twitter:card 类型非法：${card}`)
  }
  const lines: string[] = [
    `<meta name="twitter:card" content="${card}">`,
    `<meta name="twitter:title" content="${escapeHtmlAttr(title)}">`,
  ]
  const rest: ReadonlyArray<readonly [string, string]> = [
    ['twitter:description', field(f.description)],
    ['twitter:image', field(f.image)],
    ['twitter:site', field(f.site)],
  ]
  for (const [name, value] of rest) {
    if (value !== '') lines.push(`<meta name="${name}" content="${escapeHtmlAttr(value)}">`)
  }
  return lines.join('\n') + '\n'
}
