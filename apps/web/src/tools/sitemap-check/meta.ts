import type { ToolMeta } from '@toolbox/catalog'

/**
 * sitemap-check —— 全局编号 #661
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'sitemap-check',
  slug: 'sitemap-check',
  title: '网站地图检查',
  description: '校验 sitemap XML 规范性：loc、lastmod、changefreq、priority 与条目数量',
  titleEn: 'Sitemap Check',
  descriptionEn: 'Validate sitemap XML: loc, lastmod, changefreq, priority and entry count',

  category: 'seo',
  group: 'dev',
  tags: ['sitemap', 'seo', 'xml', 'check'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
