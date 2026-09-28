/**
 * sitemap-generate —— XML sitemap 生成的纯函数层
 *
 * 纯 JS：把每行一个的 URL 列表转成标准 sitemap XML（urlset），
 * 可选附加 changefreq / priority / lastmod；逐行校验 URL 合法。
 * 不触碰任何浏览器 API，可在 node 下被 vitest 完整测试。
 */

/** 允许的 changefreq 取值（sitemap 协议） */
export const CHANGEFREQS = [
  'always',
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'never',
] as const
export type Changefreq = (typeof CHANGEFREQS)[number]

/** 生成选项：三项均可选 */
export interface SitemapBuildOptions {
  readonly changefreq?: string
  readonly priority?: string
  readonly lastmod?: string
}

/** XML 转义：& < > " ' */
export function escapeXml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** 校验单个 URL 为 http(s)，非法抛中文错（带行号） */
function assertUrl(raw: string, lineNo: number): string {
  const clean = raw.trim()
  let parsed: URL
  try {
    parsed = new URL(clean)
  } catch {
    throw new Error(`第 ${lineNo} 行 URL 不合法：${clean}`)
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`第 ${lineNo} 行 URL 必须以 http:// 或 https:// 开头`)
  }
  return clean
}

/** 校验 priority 为 0.0～1.0 的数字，否则抛中文错 */
function assertPriority(raw: string): string {
  const clean = raw.trim()
  if (!/^(0(\.\d+)?|1(\.0+)?)$/.test(clean)) {
    throw new Error(`Priority 必须是 0.0～1.0 之间的数字，实际为：${raw.trim()}`)
  }
  return clean
}

/** 校验 lastmod 为合法的 YYYY-MM-DD 日期，否则抛中文错 */
function assertLastmod(raw: string): string {
  const clean = raw.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    throw new Error(`Lastmod 日期格式不正确，应为 YYYY-MM-DD，实际为：${raw.trim()}`)
  }
  const [y, m, d] = clean.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    throw new Error(`Lastmod 不是合法日期：${clean}`)
  }
  return clean
}

/**
 * 由 URL 列表生成标准 sitemap XML。
 * 空行忽略；空列表 / 非法 URL / 非法选项均抛中文错。
 */
export function buildSitemapXml(
  urls: readonly string[],
  opts: SitemapBuildOptions = {},
): string {
  const cleaned: string[] = []
  for (let i = 0; i < urls.length; i++) {
    const t = urls[i].trim()
    if (t === '') continue
    cleaned.push(assertUrl(t, i + 1))
  }
  if (cleaned.length === 0) throw new Error('请至少输入一个 URL（每行一个）')

  const changefreq = (opts.changefreq ?? '').trim()
  if (changefreq !== '' && !(CHANGEFREQS as readonly string[]).includes(changefreq)) {
    throw new Error(`Changefreq 取值非法：${changefreq}`)
  }
  const priorityRaw = (opts.priority ?? '').trim()
  const priority = priorityRaw === '' ? '' : assertPriority(priorityRaw)
  const lastmodRaw = (opts.lastmod ?? '').trim()
  const lastmod = lastmodRaw === '' ? '' : assertLastmod(lastmodRaw)

  const out: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ]
  for (const u of cleaned) {
    out.push('  <url>', `    <loc>${escapeXml(u)}</loc>`)
    if (lastmod !== '') out.push(`    <lastmod>${lastmod}</lastmod>`)
    if (changefreq !== '') out.push(`    <changefreq>${changefreq}</changefreq>`)
    if (priority !== '') out.push(`    <priority>${priority}</priority>`)
    out.push('  </url>')
  }
  out.push('</urlset>')
  return out.join('\n') + '\n'
}
