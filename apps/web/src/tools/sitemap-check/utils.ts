/**
 * sitemap XML 规范性检查：纯函数实现，不依赖 DOM，浏览器 / Node 均可运行。
 */

/** 输入非法时抛出，由 UI 捕获展示 */
export class SitemapError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SitemapError'
  }
}

export interface SitemapEntry {
  readonly loc: string
  readonly lastmod?: string
  readonly changefreq?: string
  readonly priority?: string
}

export type IssueLevel = 'error' | 'warning' | 'info'

export interface SitemapIssue {
  readonly level: IssueLevel
  readonly message: string
}

export interface SitemapCheckResult {
  /** 是否为 sitemap 索引文件（<sitemapindex>） */
  readonly isIndex: boolean
  readonly entries: readonly SitemapEntry[]
  readonly issues: readonly SitemapIssue[]
  /** 通过率：0–1，按条目数扣减错误数 */
  readonly passRate: number
}

/** sitemap 协议：单个文件最多 50,000 个 URL */
const MAX_URLS = 50_000

const VALID_CHANGEFREQ = new Set([
  'always',
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'never',
])

/** 是否合法的 http(s) 绝对 URL */
export function isHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/** lastmod 合法格式：YYYY-MM-DD 或完整 ISO 8601 日期时间 */
export function isValidSitemapDate(raw: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(raw)) {
    return false
  }
  return !Number.isNaN(Date.parse(raw))
}

/** 取 XML 块中首个 <tag>…</tag> 的文本；缺失或空白返回 undefined */
function tagContent(block: string, tag: string): string | undefined {
  const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'))
  const raw = m?.[1].trim()
  return raw === undefined || raw === '' ? undefined : raw
}

/**
 * 解析 sitemap XML，提取条目。
 * 索引文件（<sitemapindex>）解析 <sitemap> 条目，其余解析 <url> 条目。
 */
export function parseSitemap(xml: string): { isIndex: boolean; entries: SitemapEntry[] } {
  if (xml.trim() === '') throw new SitemapError('请输入 sitemap XML 内容')
  const isIndex = /<sitemapindex[\s>]/.test(xml)
  const blockTag = isIndex ? 'sitemap' : 'url'
  const entries: SitemapEntry[] = []
  const re = new RegExp(`<${blockTag}[\\s>]([\\s\\S]*?)</${blockTag}>`, 'gi')
  for (const m of xml.matchAll(re)) {
    const body = m[1]
    entries.push({
      loc: tagContent(body, 'loc') ?? '',
      lastmod: tagContent(body, 'lastmod'),
      changefreq: tagContent(body, 'changefreq'),
      priority: tagContent(body, 'priority'),
    })
  }
  return { isIndex, entries }
}

/** 校验 sitemap 规范性，返回条目、问题列表与通过率 */
export function checkSitemap(xml: string): SitemapCheckResult {
  const issues: SitemapIssue[] = []
  if (!/^\s*<\?xml/i.test(xml)) {
    issues.push({
      level: 'warning',
      message: '缺少 XML 声明（<?xml version="1.0" encoding="UTF-8"?>），建议补上',
    })
  }
  const { isIndex, entries } = parseSitemap(xml)
  if (isIndex) {
    issues.push({
      level: 'info',
      message: '这是 sitemap 索引文件：其 <sitemap> 指向的子文件需分别可访问且符合规范',
    })
  }
  const kind = isIndex ? 'sitemap' : 'url'
  if (entries.length === 0) {
    issues.push({ level: 'error', message: `未解析到任何 <${kind}> 条目` })
  }
  if (entries.length > MAX_URLS) {
    issues.push({
      level: 'warning',
      message: `条目数 ${entries.length} 超过单文件 50000 上限，请拆分为 sitemap 索引`,
    })
  }
  const seen = new Set<string>()
  entries.forEach((entry, index) => {
    const n = index + 1
    if (entry.loc === '') {
      issues.push({ level: 'error', message: `第 ${n} 条：缺少 <loc>` })
    } else if (!isHttpUrl(entry.loc)) {
      issues.push({ level: 'error', message: `第 ${n} 条：<loc> 不是合法的 http(s) 绝对 URL：${entry.loc}` })
    } else if (seen.has(entry.loc)) {
      issues.push({ level: 'error', message: `第 ${n} 条：<loc> 重复：${entry.loc}` })
    } else {
      seen.add(entry.loc)
    }
    if (entry.lastmod !== undefined && !isValidSitemapDate(entry.lastmod)) {
      issues.push({ level: 'warning', message: `第 ${n} 条：<lastmod> 日期格式不合法：${entry.lastmod}` })
    }
    if (entry.changefreq !== undefined && !VALID_CHANGEFREQ.has(entry.changefreq.toLowerCase())) {
      issues.push({ level: 'warning', message: `第 ${n} 条：<changefreq> 取值不合法：${entry.changefreq}` })
    }
    if (entry.priority !== undefined) {
      const p = Number(entry.priority)
      if (!Number.isFinite(p) || p < 0 || p > 1) {
        issues.push({ level: 'warning', message: `第 ${n} 条：<priority> 应为 0.0–1.0 的数字：${entry.priority}` })
      }
    }
  })
  const errors = issues.filter((i) => i.level === 'error').length
  const passRate = entries.length === 0 ? 0 : Math.max(0, (entries.length - errors) / entries.length)
  return { isIndex, entries, issues, passRate }
}

/** 渲染 Markdown 报告（供复制 / 下载） */
export function renderReport(result: SitemapCheckResult): string {
  const lines = [
    '# Sitemap 检查报告',
    '',
    `- 类型：${result.isIndex ? 'sitemap 索引' : 'urlset'}`,
    `- 条目数：${result.entries.length}`,
    `- 通过率：${Math.round(result.passRate * 100)}%`,
    `- 问题数：${result.issues.length}`,
    '',
  ]
  if (result.issues.length === 0) {
    lines.push('未发现问题，sitemap 符合规范。')
  } else {
    lines.push('## 问题列表')
    for (const issue of result.issues) {
      const mark = issue.level === 'error' ? '❌' : issue.level === 'warning' ? '⚠️' : 'ℹ️'
      lines.push(`- ${mark} ${issue.message}`)
    }
  }
  return lines.join('\n')
}
