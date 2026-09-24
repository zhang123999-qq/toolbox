/**
 * 生成 sitemap.xml（含全部工具页 + 大组页 + 分类页）
 * 用法：pnpm generate:sitemap
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { CATEGORIES, GROUPS, TOOL_ROUTES } from '@toolbox/catalog'

const SITE_ORIGIN = process.env['SITE_ORIGIN'] ?? 'https://example.com'

const urls: string[] = [
  '/',
  '/tools',
  ...GROUPS.map((g) => `/c/${g.id}`),
  ...CATEGORIES.map((c) => `/c/${c.group}/${c.id}`),
  ...TOOL_ROUTES.map((r) => r.path),
]

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${SITE_ORIGIN}${u}</loc>
    <changefreq>weekly</changefreq>
    <priority>${u === '/' ? '1.0' : u.startsWith('/tools/') ? '0.8' : '0.6'}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`

const output = path.resolve('apps/web/public/sitemap.xml')
mkdirSync(path.dirname(output), { recursive: true })
writeFileSync(output, xml, 'utf8')
console.log(`[generate:sitemap] 已生成 ${urls.length} 条 → apps/web/public/sitemap.xml`)
