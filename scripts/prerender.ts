/**
 * SSG 预渲染：把每个路由渲染成静态 HTML（DEVELOPMENT.md §12）
 *
 * 用法：pnpm prerender           （须先跑 pnpm build）
 *
 * 产物：apps/web/dist/<route>/index.html，另附 404.html
 * 路由集合与 generate-sitemap.ts 保持一致，均来自 catalog（红线第 1 条）。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  CATEGORIES,
  GROUPS,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_ORIGIN as DEFAULT_ORIGIN,
  SITE_TITLE,
  TOOL_ROUTES,
  getCategory,
  getGroup,
  getTool,
} from '@toolbox/catalog'

const DIST = path.resolve('apps/web/dist')
const SSR_ENTRY = path.resolve('apps/web/dist-ssr/entry-server.js')
// 默认取 catalog 里的正式域名；预发 / 临时环境用 SITE_ORIGIN 覆盖
const SITE_ORIGIN = (process.env['SITE_ORIGIN'] ?? DEFAULT_ORIGIN).replace(/\/$/, '')

interface PageMeta {
  readonly title: string
  readonly description: string
  /** 工具页额外输出 SoftwareApplication JSON-LD */
  readonly jsonLd?: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function metaFor(route: string): PageMeta {
  if (route === '/') return { title: SITE_TITLE, description: SITE_DESCRIPTION }
  if (route === '/tools') return { title: `全部工具 · ${SITE_NAME}`, description: SITE_DESCRIPTION }

  const groupMatch = /^\/c\/([^/]+)$/.exec(route)
  if (groupMatch?.[1]) {
    const group = getGroup(groupMatch[1])
    return {
      title: `${group.name}工具 · ${SITE_NAME}`,
      description: `${group.name}类在线工具，纯本地处理，数据不上传。`,
    }
  }

  const categoryMatch = /^\/c\/[^/]+\/([^/]+)$/.exec(route)
  if (categoryMatch?.[1]) {
    const category = getCategory(categoryMatch[1])
    return {
      title: `${category.name} · ${SITE_NAME}`,
      description: `${category.name}在线工具合集，纯前端运行，数据不上传。`,
    }
  }

  const slug = route.replace(/^\/tools\//, '')
  const tool = getTool(slug)
  if (tool) {
    return {
      title: `${tool.title} · ${SITE_NAME}`,
      description: tool.description,
      jsonLd: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: tool.title,
        description: tool.description,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Web',
        // 红线第 5 条：纯本地处理是本项目立身之本，结构化数据里也要体现
        featureList: ['纯前端运行', '数据不上传'],
        url: `${SITE_ORIGIN}${route}`,
      }),
    }
  }

  return { title: SITE_NAME, description: SITE_DESCRIPTION }
}

/** 与 generate-sitemap.ts 同源，避免两处路由集合漂移 */
function allRoutes(): string[] {
  return [
    '/',
    '/tools',
    ...GROUPS.map((g) => `/c/${g.id}`),
    ...CATEGORIES.map((c) => `/c/${c.group}/${c.id}`),
    ...TOOL_ROUTES.map((r) => r.path),
  ]
}

/**
 * 该路由的面包屑层级（首页 → 大组 → 域 → 工具）。
 * 仅用于生成 BreadcrumbList 结构化数据；返回 null 表示无层级（首页）。
 */
function breadcrumbsFor(route: string): { readonly name: string; readonly path: string }[] | null {
  const home = { name: '首页', path: '/' }
  if (route === '/' || route === '/404') return null

  if (route === '/tools') return [home, { name: '全部工具', path: '/tools' }]

  const groupMatch = /^\/c\/([^/]+)$/.exec(route)
  if (groupMatch) {
    const group = getGroup(groupMatch[1])
    return group ? [home, { name: group.name, path: `/c/${group.id}` }] : null
  }

  const categoryMatch = /^\/c\/([^/]+)\/([^/]+)$/.exec(route)
  if (categoryMatch) {
    const group = getGroup(categoryMatch[1])
    const category = getCategory(categoryMatch[2])
    if (!group || !category) return null
    return [
      home,
      { name: group.name, path: `/c/${group.id}` },
      { name: category.name, path: `/c/${group.id}/${category.id}` },
    ]
  }

  const tool = getTool(route.replace(/^\/tools\//, ''))
  if (tool) {
    const group = getGroup(tool.group)
    const category = getCategory(tool.category)
    const crumbs = [home]
    if (group) crumbs.push({ name: group.name, path: `/c/${group.id}` })
    if (group && category) {
      crumbs.push({ name: category.name, path: `/c/${group.id}/${category.id}` })
    }
    crumbs.push({ name: tool.title, path: route })
    return crumbs
  }

  return null
}

/** 把面包屑层级序列化为 BreadcrumbList JSON-LD */
function breadcrumbJsonLd(crumbs: { readonly name: string; readonly path: string }[]): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: `${SITE_ORIGIN}${crumb.path}`,
    })),
  })
}

/**
 * 每页独立的 head 标签（独立路由 SEO + 社交分享卡片）：
 * canonical、Open Graph、Twitter Card。无站点分享图素材，故 twitter:card
 * 用 `summary`（纯标题卡片），不用会请求一张不存在大图的 `summary_large_image`。
 */
function socialHead(route: string, meta: PageMeta): string {
  const url = `${SITE_ORIGIN}${route}`
  const title = escapeHtml(meta.title)
  const description = escapeHtml(meta.description)
  return [
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:locale" content="zh_CN" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
  ].join('\n    ')
}

function applyMeta(template: string, route: string, body: string, meta: PageMeta): string {
  // 结构化数据：工具页的 SoftwareApplication（metaFor 已构建）+ 全站面包屑
  const ldBlocks = [meta.jsonLd]
  const crumbs = breadcrumbsFor(route)
  if (crumbs) ldBlocks.push(breadcrumbJsonLd(crumbs))
  const jsonLdTags = ldBlocks
    .filter((block): block is string => Boolean(block))
    .map((block) => `<script type="application/ld+json">${escapeHtml(block)}</script>`)
    .join('\n    ')

  const head = [socialHead(route, meta), jsonLdTags].filter(Boolean).join('\n    ')

  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(meta.title)}</title>\n    ${head}`)
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/,
      `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    )
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`)
}

function outputPath(route: string): string {
  if (route === '/') return path.join(DIST, 'index.html')
  return path.join(DIST, route.replace(/^\//, ''), 'index.html')
}

function main(): void {
  if (!existsSync(SSR_ENTRY)) {
    throw new Error(
      `[prerender] 未找到 SSR 产物 ${SSR_ENTRY}\n先执行：pnpm --filter @toolbox/web build:ssr`,
    )
  }
  if (!existsSync(path.join(DIST, 'index.html'))) {
    throw new Error(
      `[prerender] 未找到客户端产物 ${path.join(DIST, 'index.html')}\n先执行：pnpm build`,
    )
  }

  const template = readFileSync(path.join(DIST, 'index.html'), 'utf8')
  const routes = allRoutes()

  void (async () => {
    const mod: { render(url: string): Promise<{ html: string }> } = await import(
      pathToFileURL(SSR_ENTRY).href
    )

    let count = 0
    for (const route of routes) {
      const { html } = await mod.render(route)
      const meta = metaFor(route)
      const out = applyMeta(template, route, html, meta)
      const file = outputPath(route)
      mkdirSync(path.dirname(file), { recursive: true })
      writeFileSync(file, out, 'utf8')
      count += 1
    }

    // 静态托管（Cloudflare Pages 等）可直接用的 404 页
    const notFound = await mod.render('/this-route-does-not-exist')
    writeFileSync(
      path.join(DIST, '404.html'),
      applyMeta(template, '/404', notFound.html, {
        title: `页面不存在 · ${SITE_NAME}`,
        description: SITE_DESCRIPTION,
      }),
      'utf8',
    )

    console.log(`[prerender] 已生成 ${count} 个静态页 + 404.html → apps/web/dist`)
  })()
}

main()
