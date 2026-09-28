/**
 * 分页 SEO 检查：纯函数实现，正则提取 rel="prev"/"next" 与 canonical。
 */

/** 输入非法时抛出，由 UI 捕获展示 */
export class PaginationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PaginationError'
  }
}

export type IssueLevel = 'error' | 'warning' | 'info'

export interface PaginationIssue {
  readonly level: IssueLevel
  readonly message: string
}

export interface PaginationLinks {
  readonly prev: readonly string[]
  readonly next: readonly string[]
}

export interface PaginationCheckResult {
  /** 从页面 URL 识别出的页码；无法识别时为 null */
  readonly page: number | null
  readonly prev: readonly string[]
  readonly next: readonly string[]
  readonly canonical: readonly string[]
  readonly issues: readonly PaginationIssue[]
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

/** 相对 URL 相对 base 解析；失败返回空字符串 */
function resolveUrl(base: string, href: string): string {
  try {
    return new URL(href, base).href
  } catch {
    return ''
  }
}

/** 提取 <link rel="prev"|"next"> 的 href（无 href 记为空字符串） */
export function extractPaginationLinks(html: string): PaginationLinks {
  const prev: string[] = []
  const next: string[] = []
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0]
    const rel = tag.match(/\brel\s*=\s*["']?([^"'\s>]+)/i)
    if (rel === null) continue
    const r = rel[1].toLowerCase()
    if (r !== 'prev' && r !== 'next') continue
    const href = tag.match(/\bhref\s*=\s*["']([^"']*)["']/i)
    const h = href === null ? '' : href[1]
    if (r === 'prev') prev.push(h)
    else next.push(h)
  }
  return { prev, next }
}

/** 提取 <link rel="canonical"> 的 href（本工具自包含，不依赖其他工具） */
function extractCanonicalHrefs(html: string): string[] {
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

/**
 * 从 URL 识别分页页码：支持 ?page=N 查询参数与 /page/N/ 路径两种形式。
 * 无法识别时返回 null。
 */
export function getPageNumber(pageUrl: string): number | null {
  let u: URL
  try {
    u = new URL(pageUrl)
  } catch {
    return null
  }
  const q = u.searchParams.get('page')
  if (q !== null) {
    const n = Number(q)
    return Number.isInteger(n) && n > 0 ? n : null
  }
  const m = u.pathname.match(/\/page\/(\d+)\/?$/)
  if (m === null) return null
  const n = Number(m[1])
  return n > 0 ? n : null
}

/** 校验单个 prev/next 链接是否指向期望的相邻页 */
function checkNeighbor(
  kind: 'prev' | 'next',
  hrefs: readonly string[],
  page: number,
  base: string,
  issues: PaginationIssue[],
): void {
  if (hrefs.length !== 1) return
  const expected = kind === 'prev' ? page - 1 : page + 1
  const dir = kind === 'prev' ? '上' : '下'
  const h = hrefs[0].trim()
  if (h === '') {
    issues.push({ level: 'warning', message: `rel="${kind}" 的 href 为空` })
    return
  }
  const target = getPageNumber(resolveUrl(base, h))
  if (target === null) {
    issues.push({ level: 'info', message: `rel="${kind}" 的 href 无法识别为分页 URL` })
  } else if (target !== expected) {
    issues.push({
      level: 'warning',
      message: `rel="${kind}" 未指向${dir}页（期望第 ${expected} 页）`,
    })
  }
}

/** 检查分页 SEO：prev/next 存在性与指向、canonical 自指 */
export function checkPagination(html: string, pageUrl: string): PaginationCheckResult {
  if (html.trim() === '') throw new PaginationError('请粘贴页面 HTML')
  const issues: PaginationIssue[] = []
  const { prev, next } = extractPaginationLinks(html)
  const canonical = extractCanonicalHrefs(html)
  const trimmed = pageUrl.trim()
  const page = trimmed === '' ? null : getPageNumber(trimmed)

  if (prev.length > 1) {
    issues.push({ level: 'error', message: `发现 ${prev.length} 个 rel="prev"，最多应为 1 个` })
  }
  if (next.length > 1) {
    issues.push({ level: 'error', message: `发现 ${next.length} 个 rel="next"，最多应为 1 个` })
  }

  if (page === null) {
    issues.push({
      level: 'info',
      message: '未能从页面 URL 识别分页页码（支持 ?page=N 或 /page/N/），仅做通用检查',
    })
  } else if (page === 1) {
    if (prev.length > 0) {
      issues.push({ level: 'warning', message: '第一页不应出现 rel="prev"' })
    }
    if (next.length === 0) {
      issues.push({ level: 'info', message: '第一页未发现 rel="next"，若有第 2 页建议加上' })
    }
  } else {
    if (prev.length === 0) {
      issues.push({ level: 'warning', message: `第 ${page} 页缺少 rel="prev"` })
    }
    if (next.length === 0) {
      issues.push({ level: 'info', message: `第 ${page} 页缺少 rel="next"（若为最后一页可忽略）` })
    }
  }

  if (page !== null && page > 1) {
    checkNeighbor('prev', prev, page, trimmed, issues)
  }
  if (page !== null) {
    checkNeighbor('next', next, page, trimmed, issues)
  }

  if (canonical.length === 0) {
    issues.push({ level: 'warning', message: '缺少 canonical，分页页的 canonical 建议自指' })
  } else if (canonical.length === 1 && trimmed !== '') {
    const c = canonical[0]
    if (
      c !== '' &&
      isHttpUrl(c) &&
      isHttpUrl(trimmed) &&
      new URL(c).href !== new URL(trimmed).href
    ) {
      issues.push({ level: 'info', message: 'canonical 与当前页 URL 不一致，分页页建议自指' })
    }
  }
  return { page, prev, next, canonical, issues }
}

/** 渲染 Markdown 报告（供复制 / 下载） */
export function renderReport(result: PaginationCheckResult): string {
  const lines = [
    '# 分页 SEO 检查报告',
    '',
    `- 识别页码：${result.page === null ? '（未能识别）' : `第 ${result.page} 页`}`,
    `- rel="prev"：${result.prev.length === 0 ? '无' : result.prev.join(', ')}`,
    `- rel="next"：${result.next.length === 0 ? '无' : result.next.join(', ')}`,
    `- canonical：${result.canonical.length === 0 ? '无' : result.canonical.join(', ')}`,
    `- 问题数：${result.issues.length}`,
    '',
  ]
  if (result.issues.length === 0) {
    lines.push('未发现问题，分页 SEO 设置正确。')
  } else {
    lines.push('## 问题列表')
    for (const issue of result.issues) {
      const mark = issue.level === 'error' ? '❌' : issue.level === 'warning' ? '⚠️' : 'ℹ️'
      lines.push(`- ${mark} ${issue.message}`)
    }
  }
  return lines.join('\n')
}
