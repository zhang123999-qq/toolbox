/**
 * utm —— UTM 生成的纯函数层
 *
 * 纯 JS：在基 URL 上拼接 utm_source / utm_medium / utm_campaign
 *（可选 utm_term / utm_content），并校验基 URL 合法。
 * 不触碰任何浏览器 API，可在 node 下被 vitest 完整测试。
 */

/** UTM 参数（source/medium/campaign 必填，term/content 可选） */
export interface UtmParams {
  readonly source: string
  readonly medium: string
  readonly campaign: string
  readonly term?: string
  readonly content?: string
}

/**
 * 拼出带 UTM 参数的 URL。
 * 基 URL 为空 / 非法 / 非 http(s) 抛中文错；source/medium/campaign 为空抛中文错。
 */
export function buildUtmUrl(base: string, params: UtmParams): string {
  const clean = base.trim()
  if (clean === '') throw new Error('基 URL 不能为空')
  let url: URL
  try {
    url = new URL(clean)
  } catch {
    throw new Error('基 URL 不合法，请输入包含协议的完整 URL（如 https://example.com）')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('基 URL 必须以 http:// 或 https:// 开头')
  }
  const source = params.source.trim()
  const medium = params.medium.trim()
  const campaign = params.campaign.trim()
  if (source === '') throw new Error('utm_source 不能为空')
  if (medium === '') throw new Error('utm_medium 不能为空')
  if (campaign === '') throw new Error('utm_campaign 不能为空')
  url.searchParams.set('utm_source', source)
  url.searchParams.set('utm_medium', medium)
  url.searchParams.set('utm_campaign', campaign)
  const term = params.term?.trim() ?? ''
  const content = params.content?.trim() ?? ''
  if (term !== '') url.searchParams.set('utm_term', term)
  if (content !== '') url.searchParams.set('utm_content', content)
  return url.toString()
}
