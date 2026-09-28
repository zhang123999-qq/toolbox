/**
 * robots —— robots.txt 生成的纯函数层
 *
 * 纯 JS：把「User-agent 指令 路径」格式的规则文本解析成规则数组，
 * 再按 User-agent 分组生成标准 robots.txt，可选附加 Sitemap 与 Crawl-delay。
 * 不触碰任何浏览器 API，可在 node 下被 vitest 完整测试。
 */

/** 单条规则：哪个爬虫、对哪个路径允许还是禁止 */
export interface RobotRule {
  readonly agent: string
  readonly directive: 'allow' | 'disallow'
  readonly path: string
}

/** 生成选项：Sitemap URL 与 Crawl-delay（秒），均可选 */
export interface RobotsBuildOptions {
  readonly sitemap?: string
  readonly crawlDelay?: string
}

/**
 * 解析规则文本：每行「User-agent 指令 路径」，例如 `* disallow /private`。
 * 空行与 # 开头的注释行会被忽略；格式不对抛中文错（带行号）。
 */
export function parseRobotRules(text: string): RobotRule[] {
  const rules: RobotRule[] = []
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const n = i + 1
    const t = lines[i].trim()
    if (t === '' || t.startsWith('#')) continue
    const parts = t.split(/\s+/)
    if (parts.length !== 3) {
      throw new Error(
        `第 ${n} 行格式不正确，应为「User-agent 指令 路径」，例如：* disallow /private`,
      )
    }
    const [agent, directiveRaw, path] = parts
    const directive = directiveRaw.toLowerCase()
    if (directive !== 'allow' && directive !== 'disallow') {
      throw new Error(`第 ${n} 行指令必须是 allow 或 disallow，实际为：${directiveRaw}`)
    }
    if (!path.startsWith('/')) {
      throw new Error(`第 ${n} 行路径必须以 / 开头，实际为：${path}`)
    }
    rules.push({ agent, directive, path })
  }
  return rules
}

/** 规则数组为空抛中文错的守卫 */
function assertNotEmpty(rules: readonly RobotRule[]): void {
  if (rules.length === 0) {
    throw new Error('请至少添加一条规则（每行格式：User-agent 指令 路径）')
  }
}

/** Sitemap URL 校验：非空时必须为 http(s) URL，否则抛中文错 */
function assertSitemap(sitemap: string): void {
  let parsed: URL
  try {
    parsed = new URL(sitemap)
  } catch {
    throw new Error(`Sitemap URL 不合法：${sitemap}`)
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Sitemap URL 必须以 http:// 或 https:// 开头')
  }
}

/**
 * 由规则数组生成 robots.txt 文本。
 * 同一 User-agent 的规则合并为一组（保持首次出现顺序），组之间空行分隔；
 * 末尾依次附加 Sitemap 与 Crawl-delay。
 */
export function buildRobotsTxt(rules: readonly RobotRule[], opts: RobotsBuildOptions = {}): string {
  assertNotEmpty(rules)
  const sitemap = (opts.sitemap ?? '').trim()
  if (sitemap !== '') assertSitemap(sitemap)
  const crawlDelay = (opts.crawlDelay ?? '').trim()
  if (crawlDelay !== '' && !/^\d+$/.test(crawlDelay)) {
    throw new Error('Crawl-delay 必须是非负整数（单位：秒）')
  }

  const lines: string[] = []
  const seen = new Set<string>()
  for (const r of rules) {
    if (!seen.has(r.agent)) {
      if (lines.length > 0) lines.push('')
      lines.push(`User-agent: ${r.agent}`)
      seen.add(r.agent)
    }
    lines.push(`${r.directive === 'allow' ? 'Allow' : 'Disallow'}: ${r.path}`)
  }
  if (sitemap !== '') lines.push('', `Sitemap: ${sitemap}`)
  if (crawlDelay !== '') lines.push('', `Crawl-delay: ${crawlDelay}`)
  return lines.join('\n') + '\n'
}
