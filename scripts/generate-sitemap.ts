/**
 * 生成站点级 SEO 文件：sitemap.xml + robots.txt
 * 用法：pnpm generate:sitemap
 *
 * 两者都写进 `apps/web/public/`，由 Vite 在构建时拷进 `dist/`。
 * 都必须**在客户端构建之前**生成——顺序反了产物里就是旧内容或没有。
 *
 * 为什么 robots.txt 也在这里生成：
 * 它的 `Sitemap:` 指令必须是绝对地址，而主机名只有 SITE_ORIGIN 知道。
 * 之前它是一份手写的静态文件，于是站点域名换了它还在指 example.com——
 * 这正是「同一个事实存了两份」的经典漂移。
 *
 * 注意：本脚本只读 SITE_ORIGIN 环境变量（构建期），不依赖 catalog 的浏览器侧代码。
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { CATEGORIES, GROUPS, SITE_ORIGIN as DEFAULT_ORIGIN, TOOL_ROUTES } from '@toolbox/catalog'

// 默认取 catalog 里的正式域名；预发 / 临时环境用 SITE_ORIGIN 覆盖
const SITE_ORIGIN = (process.env['SITE_ORIGIN'] ?? DEFAULT_ORIGIN).replace(/\/$/, '')

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

const robots = `# 站点尚未上线，见 docs/guide/getting-started.md
User-agent: *
Allow: /

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`

const publicDir = path.resolve('apps/web/public')
mkdirSync(publicDir, { recursive: true })

for (const [name, content] of [
  ['sitemap.xml', xml],
  ['robots.txt', robots],
] as const) {
  writeFileSync(path.join(publicDir, name), content, 'utf8')
}

console.log(`[generate:sitemap] ${SITE_ORIGIN} → sitemap.xml（${urls.length} 条）+ robots.txt`)
