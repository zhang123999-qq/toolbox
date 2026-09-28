import type { ToolMeta } from '@toolbox/catalog'

/**
 * robots —— 全局编号 #620
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'robots',
  slug: 'robots',
  title: 'robots.txt 生成',
  description: '多条 User-agent 允许 / 禁止规则、Sitemap 与 Crawl-delay，生成标准 robots.txt',
  titleEn: 'robots.txt Generator',
  descriptionEn:
    'Generate a standard robots.txt from User-agent allow/disallow rules, sitemap and crawl-delay',

  category: 'seo',
  group: 'dev',
  tags: ['seo', 'robots', 'crawler', 'sitemap'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['sitemap', 'crawl-delay'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
