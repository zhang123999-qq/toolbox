/**
 * 页面 canonical 标签检查：纯函数实现，正则提取 <link rel="canonical">。
 */

/** 输入非法时抛出，由 UI 捕获展示 */
export class CanonicalCheckError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CanonicalCheckError'
  }
}

export type IssueLevel = 'error' | 'warning' | 'info'

export interface CanonicalIssue {
  readonly level: IssueLevel
  readonly message: string
}

export interface CanonicalCheckResult {
  readonly links: readonly string[]
  readonly issues: readonly CanonicalIssue[]
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

/** 归一化 URL，用于比较是否自指 */
function normalizeUrl(raw: string): string {
  return new URL(raw).href
}

/** 提取页面中所有 <link rel="canonical"> 的 href（无 href 时记为空字符串） */
export function extractCanonical(html: string): string[] {
  const hrefs: string[] = []
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0]
    const rel = tag.match(/\brel\s*=\s*["']?([^"'\s>]+)/i)
    if (rel === null || rel[1].toLowerCase() !== 'canonical') continue
    const href = tag.match(/\bhref\s*=\s*["']([^"']*)["']/i)
    hrefs.push(href === null ? '' : href[1])
  }
  return hrefs
}

/** 检查 canonical 规范性；pageUrl 为空时跳过自指判断 */
export function checkCanonical(html: string, pageUrl: string): CanonicalCheckResult {
  if (html.trim() === '') throw new CanonicalCheckError('请粘贴页面 HTML')
  const issues: CanonicalIssue[] = []
  const links = extractCanonical(html)
  if (links.length === 0) {
    issues.push({
      level: 'warning',
      message: '未找到 <link rel="canonical">，建议为页面指定规范链接',
    })
  }
  if (links.length > 1) {
    issues.push({ level: 'error', message: `发现 ${links.length} 个 canonical，页面只应保留 1 个` })
  }
  for (const href of links) {
    if (href.trim() === '') {
      issues.push({ level: 'error', message: 'canonical 的 href 为空' })
    } else if (!isHttpUrl(href)) {
      issues.push({ level: 'error', message: `canonical 不是合法的 http(s) 绝对 URL：${href}` })
    }
  }
  const page = pageUrl.trim()
  if (page === '') {
    issues.push({ level: 'info', message: '未填写页面 URL，无法判断 canonical 是否自指' })
  } else if (!isHttpUrl(page)) {
    issues.push({ level: 'error', message: '页面 URL 不是合法的 http(s) 绝对 URL' })
  } else if (
    links.length === 1 &&
    isHttpUrl(links[0]) &&
    normalizeUrl(links[0]) !== normalizeUrl(page)
  ) {
    issues.push({
      level: 'info',
      message: 'canonical 与页面 URL 不一致（非自指）。分页 / 带参页面属正常，其他页面建议自指',
    })
  }
  return { links, issues }
}

/** 渲染 Markdown 报告（供复制 / 下载） */
export function renderReport(result: CanonicalCheckResult): string {
  const lines = [
    '# Canonical 检查报告',
    '',
    `- 发现 canonical：${result.links.length} 个`,
    `- 问题数：${result.issues.length}`,
    '',
  ]
  result.links.forEach((href, i) => {
    lines.push(`- [${i + 1}] ${href === '' ? '（空 href）' : href}`)
  })
  if (result.links.length > 0) lines.push('')
  if (result.issues.length === 0) {
    lines.push('未发现问题，canonical 设置正确。')
  } else {
    lines.push('## 问题列表')
    for (const issue of result.issues) {
      const mark = issue.level === 'error' ? '❌' : issue.level === 'warning' ? '⚠️' : 'ℹ️'
      lines.push(`- ${mark} ${issue.message}`)
    }
  }
  return lines.join('\n')
}
