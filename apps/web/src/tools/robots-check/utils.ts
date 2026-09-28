/**
 * robots.txt 解析与规则验证：纯函数实现，无 DOM 依赖。
 */

/** 输入非法时抛出，由 UI 捕获展示 */
export class RobotsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RobotsError'
  }
}

export interface RobotRule {
  readonly directive: 'allow' | 'disallow'
  readonly path: string
}

export interface RobotGroup {
  readonly userAgents: readonly string[]
  readonly rules: readonly RobotRule[]
  /** 原始文本值；未填时为 undefined，合法性由检查函数判定 */
  readonly crawlDelay?: string
}

export interface RobotsData {
  readonly groups: readonly RobotGroup[]
  readonly sitemaps: readonly string[]
}

export type IssueLevel = 'error' | 'warning' | 'info'

export interface RobotsIssue {
  readonly level: IssueLevel
  readonly message: string
}

export interface RobotsCheckResult {
  readonly groups: readonly RobotGroup[]
  readonly sitemaps: readonly string[]
  readonly issues: readonly RobotsIssue[]
}

interface MutableGroup {
  userAgents: string[]
  rules: RobotRule[]
  crawlDelay?: string
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

/**
 * 解析 robots.txt：按 User-agent 分组，收集 Allow/Disallow 规则、
 * Crawl-delay 与 Sitemap。行内 `#` 后视为注释。
 */
export function parseRobots(text: string): RobotsData {
  if (text.trim() === '') throw new RobotsError('请输入 robots.txt 内容')
  const groups: MutableGroup[] = []
  const sitemaps: string[] = []
  let current: MutableGroup | null = null

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split('#')[0].trim()
    if (line === '') continue
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const field = line.slice(0, idx).trim().toLowerCase()
    const value = line.slice(idx + 1).trim()
    if (field === 'user-agent') {
      if (current === null || current.rules.length > 0 || current.crawlDelay !== undefined) {
        current = { userAgents: [], rules: [] }
        groups.push(current)
      }
      current.userAgents.push(value)
    } else if (field === 'allow' || field === 'disallow') {
      if (current === null) {
        current = { userAgents: [], rules: [] }
        groups.push(current)
      }
      current.rules.push({ directive: field, path: value })
    } else if (field === 'sitemap') {
      sitemaps.push(value)
    } else if (field === 'crawl-delay') {
      if (current === null) {
        current = { userAgents: [], rules: [] }
        groups.push(current)
      }
      current.crawlDelay = value
    }
    // 其他未知指令忽略
  }
  return { groups, sitemaps }
}

/** 验证解析结果，返回问题列表 */
export function checkRobots(data: RobotsData): RobotsCheckResult {
  const issues: RobotsIssue[] = []
  if (data.groups.length === 0) {
    issues.push({ level: 'error', message: '未解析到任何 User-agent 分组' })
  }
  data.groups.forEach((group, index) => {
    const n = index + 1
    if (group.userAgents.length === 0) {
      issues.push({
        level: 'error',
        message: `第 ${n} 组：缺少 User-agent（规则出现在 User-agent 之前）`,
      })
    } else if (group.userAgents.some((a) => a === '')) {
      issues.push({ level: 'error', message: `第 ${n} 组：User-agent 为空` })
    }
    const blocksAll =
      group.rules.some((r) => r.directive === 'disallow' && r.path === '/') &&
      !group.rules.some((r) => r.directive === 'allow')
    if (blocksAll) {
      issues.push({
        level: 'warning',
        message: `第 ${n} 组：Disallow: / 且无 Allow 例外，将禁止抓取全站，请确认是否为有意`,
      })
    }
    const allows = new Set(group.rules.filter((r) => r.directive === 'allow').map((r) => r.path))
    for (const r of group.rules) {
      if (r.directive === 'disallow' && allows.has(r.path)) {
        issues.push({
          level: 'warning',
          message: `第 ${n} 组：Allow 与 Disallow 对同一路径「${r.path}」冲突`,
        })
      }
    }
    if (group.crawlDelay !== undefined) {
      const d = Number(group.crawlDelay)
      if (!Number.isFinite(d) || d < 0) {
        issues.push({
          level: 'warning',
          message: `第 ${n} 组：Crawl-delay 不是合法数字：${group.crawlDelay}`,
        })
      }
    }
  })
  if (data.sitemaps.length === 0) {
    issues.push({ level: 'info', message: '未声明 Sitemap，建议添加 sitemap 绝对地址以帮助收录' })
  }
  const seenSitemap = new Set<string>()
  for (const s of data.sitemaps) {
    if (!isHttpUrl(s)) {
      issues.push({ level: 'error', message: `Sitemap 不是合法的 http(s) 绝对 URL：${s}` })
    } else if (seenSitemap.has(s)) {
      issues.push({ level: 'warning', message: `Sitemap 重复声明：${s}` })
    } else {
      seenSitemap.add(s)
    }
  }
  return { groups: data.groups, sitemaps: data.sitemaps, issues }
}

/** 渲染 Markdown 报告（供复制 / 下载） */
export function renderReport(result: RobotsCheckResult): string {
  const lines = [
    '# robots.txt 检查报告',
    '',
    `- 分组数：${result.groups.length}`,
    `- Sitemap 数：${result.sitemaps.length}`,
    `- 问题数：${result.issues.length}`,
    '',
  ]
  result.groups.forEach((g, i) => {
    lines.push(`## 分组 ${i + 1}`)
    lines.push(`- User-agent: ${g.userAgents.length === 0 ? '（缺失）' : g.userAgents.join(', ')}`)
    for (const r of g.rules) {
      lines.push(`- ${r.directive === 'allow' ? 'Allow' : 'Disallow'}: ${r.path}`)
    }
    if (g.crawlDelay !== undefined) lines.push(`- Crawl-delay: ${g.crawlDelay}`)
    lines.push('')
  })
  if (result.sitemaps.length > 0) {
    lines.push('## Sitemap')
    for (const s of result.sitemaps) lines.push(`- ${s}`)
    lines.push('')
  }
  if (result.issues.length === 0) {
    lines.push('未发现问题，robots.txt 符合规范。')
  } else {
    lines.push('## 问题列表')
    for (const issue of result.issues) {
      const mark = issue.level === 'error' ? '❌' : issue.level === 'warning' ? '⚠️' : 'ℹ️'
      lines.push(`- ${mark} ${issue.message}`)
    }
  }
  return lines.join('\n')
}
