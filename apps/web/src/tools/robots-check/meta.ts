import type { ToolMeta } from '@toolbox/catalog'

/**
 * robots-check —— 全局编号 #662
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'robots-check',
  slug: 'robots-check',
  title: 'robots 检查',
  description: '解析并验证 robots.txt：分组规则、全站屏蔽风险、Sitemap 声明与规则冲突',
  titleEn: 'Robots Check',
  descriptionEn:
    'Parse and validate robots.txt: groups, site-wide blocks, sitemap and rule conflicts',

  category: 'seo',
  group: 'dev',
  tags: ['robots', 'seo', 'check'],

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
