/**
 * edge-redirect（#817）工具函数：Cloudflare Bulk Redirects 规则生成与校验。
 * 纯函数，无 DOM / 网络依赖。
 */

export type RedirectStatus = 301 | 302 | 307 | 308

export interface RedirectRule {
  readonly from: string
  readonly to: string
  readonly status: RedirectStatus
}

const VALID_STATUSES: readonly RedirectStatus[] = [301, 302, 307, 308]

export const EXAMPLE_RULE: RedirectRule = {
  from: 'https://old.example.com/*',
  to: 'https://new.example.com/',
  status: 301,
}

/** 校验来源模式：允许路径式（/old/*）或完整 URL 式（含可选通配符 *） */
export function validateFromPattern(from: string): string | null {
  const value = from.trim()
  if (value === '') return '来源地址不能为空'
  if (value.startsWith('/')) {
    if (value.includes(' ')) return '来源路径不能包含空格'
    return null
  }
  if (value.includes(' ')) return '来源地址不能包含空格'
  const stripped = value.replaceAll('*', '')
  if (stripped === '') return '来源地址格式非法'
  try {
    const url = new URL(stripped)
    if (url.protocol !== 'http:' && url.protocol !== 'https:')
      return '来源地址须为 http/https 或以 / 开头的路径'
    return null
  } catch {
    return '来源地址格式非法'
  }
}

/** 校验目标：须为完整 http/https URL */
export function validateToUrl(to: string): string | null {
  const value = to.trim()
  if (value === '') return '目标地址不能为空'
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '目标地址须为 http/https URL'
    return null
  } catch {
    return '目标地址格式非法'
  }
}

/** 校验单条规则，返回中文错误信息，无错返回 null */
export function validateRedirectRule(rule: RedirectRule): string | null {
  if (!VALID_STATUSES.includes(rule.status)) return '重定向状态码须为 301/302/307/308'
  const fromError = validateFromPattern(rule.from)
  if (fromError) return fromError
  return validateToUrl(rule.to)
}

/** 生成 Cloudflare Bulk Redirects 列表 JSON；任一规则非法即抛中文错误 */
export function buildRedirectRules(rules: readonly RedirectRule[]): string {
  for (const rule of rules) {
    const error = validateRedirectRule(rule)
    if (error) throw new Error(error)
  }
  const list = rules.map((rule) => ({
    source_url: rule.from.trim(),
    target_url: rule.to.trim(),
    status_code: rule.status,
    include_subdomains: false,
    subpath_matching: true,
    preserve_query_string: false,
  }))
  return JSON.stringify({ redirects: list }, null, 2)
}

/** 解析用户粘贴的 JSON（数组或 {redirects} 包裹），非法即抛中文错误 */
export function parseRedirectRulesJson(text: string): RedirectRule[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('输入不是合法 JSON')
  }
  const raw: unknown = Array.isArray(parsed)
    ? parsed
    : (parsed as { redirects?: unknown }).redirects
  if (!Array.isArray(raw)) throw new Error('JSON 须为规则数组或 {redirects: [...]} 结构')
  return raw.map((item, index) => {
    const obj = item as Record<string, unknown>
    const status = Number(obj.status ?? obj.status_code)
    const rule: RedirectRule = {
      from: String(obj.from ?? obj.source_url ?? ''),
      to: String(obj.to ?? obj.target_url ?? ''),
      status: status as RedirectStatus,
    }
    const error = validateRedirectRule(rule)
    if (error) throw new Error(`第 ${index + 1} 条规则：${error}`)
    return rule
  })
}

/** 人类可读的规则摘要 */
export function describeRules(rules: readonly RedirectRule[]): string {
  if (rules.length === 0) return '暂无规则'
  return rules
    .map((rule, index) => `${index + 1}. ${rule.from} → ${rule.to}（${rule.status}）`)
    .join('\n')
}
