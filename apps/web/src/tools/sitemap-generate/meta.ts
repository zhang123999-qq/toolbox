import type { ToolMeta } from '@toolbox/catalog'

/**
 * sitemap-generate —— 全局编号 #621
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'sitemap-generate',
  slug: 'sitemap-generate',
  title: 'Sitemap 生成',
  description: 'URL 列表批量生成标准 XML sitemap，支持 changefreq / priority / lastmod',
  titleEn: 'Sitemap Generator',
  descriptionEn:
    'Generate a standard XML sitemap from a URL list, with changefreq / priority / lastmod',

  category: 'seo',
  group: 'dev',
  tags: ['seo', 'sitemap', 'xml', 'crawler'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['changefreq', 'priority', 'lastmod'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
