/**
 * edge-route（#812）核心逻辑：Workers 路由规则解析与匹配。
 * 纯函数，无 DOM / 网络依赖，可在 Node 下单测。
 *
 * 路由写法（Cloudflare Workers 风格，匹配「主机名 + 路径」）：
 *   精确   example.com/api/users
 *   前缀   example.com/static/*        （仅末尾一个 *）
 *   通配符 *.example.com/*            （* 出现在中间）
 * 优先级：精确 > 前缀 > 通配符；同级中更长的规则更优先，再相同取靠前的。
 */

export interface RouteRule {
  pattern: string
  target: string
}

type PatternKind = 'exact' | 'prefix' | 'wildcard'

function classifyPattern(pattern: string): PatternKind {
  if (!pattern.includes('*')) return 'exact'
  if (pattern.endsWith('*') && pattern.indexOf('*') === pattern.length - 1) return 'prefix'
  return 'wildcard'
}

/** 校验单条路由规则，返回错误信息；合法返回 null */
export function checkPattern(pattern: string): string | null {
  if (pattern.trim() === '') return '路由规则不能为空'
  if (/\s/.test(pattern)) return `路由规则不能包含空白字符：${pattern}`
  if (pattern === '*') return '路由规则不能仅为 *'
  return null
}

/** 校验单条路由规则，非法时中文抛错 */
export function validatePattern(pattern: string): void {
  const error = checkPattern(pattern)
  if (error !== null) throw new Error(error)
}

/**
 * 解析路由文本：每行「pattern => target」，空行与 # 注释跳过；
 * 格式非法或规则非法时中文抛错（带行号）。
 */
export function parseRoutesText(text: string): RouteRule[] {
  const rules: RouteRule[] = []
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line === '' || line.startsWith('#')) continue
    const sep = line.indexOf('=>')
    if (sep <= 0) throw new Error(`第 ${i + 1} 行格式非法，应为「pattern => target」`)
    const pattern = line.slice(0, sep).trim()
    const target = line.slice(sep + 2).trim()
    const patternError = checkPattern(pattern)
    if (patternError !== null) throw new Error(`第 ${i + 1} 行${patternError}`)
    if (target === '') throw new Error(`第 ${i + 1} 行 target 不能为空`)
    rules.push({ pattern, target })
  }
  return rules
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function ruleMatches(kind: PatternKind, pattern: string, hostPath: string): boolean {
  if (kind === 'exact') return pattern === hostPath
  if (kind === 'prefix') return hostPath.startsWith(pattern.slice(0, -1))
  const regex = new RegExp('^' + pattern.split('*').map(escapeRegExp).join('.*') + '$')
  return regex.test(hostPath)
}

/** 匹配命中的路由规则；无命中返回 null；URL 非法时中文抛错 */
export function matchRoute(rules: readonly RouteRule[], url: string): RouteRule | null {
  let urlObj: URL
  try {
    urlObj = new URL(url.trim())
  } catch {
    throw new Error(`URL 格式非法：${url}`)
  }
  const hostPath = urlObj.hostname + urlObj.pathname
  const scored = rules
    .map((rule, index) => ({ rule, index, kind: classifyPattern(rule.pattern) }))
    .filter(({ rule, kind }) => ruleMatches(kind, rule.pattern, hostPath))
    .map(({ rule, index, kind }) => ({
      rule,
      index,
      score: kind === 'exact' ? 3 : kind === 'prefix' ? 2 : 1,
    }))
  if (scored.length === 0) return null
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (b.rule.pattern.length !== a.rule.pattern.length)
      return b.rule.pattern.length - a.rule.pattern.length
    return a.index - b.index
  })
  return scored[0].rule
}

export const EXAMPLE_ROUTES = [
  '# 每行「pattern => target」，# 开头为注释',
  'example.com/api/users => users-api',
  'example.com/static/* => static-assets',
  '*.example.com/* => wildcard-catchall',
  'example.com/* => site-root',
].join('\n')

export const EXAMPLE_URL = 'https://example.com/static/app.js'
