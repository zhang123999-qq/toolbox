import type { ToolMeta } from '@toolbox/catalog'

/**
 * favicon-check —— 全局编号 #654
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P1｜可行性：D｜模板：T3
 *
 * 解析页面 <link> 图标声明并逐个 HEAD 检查可达性，附带默认 /favicon.ico 兜底检查。
 */
export const meta: ToolMeta = {
  id: 'favicon-check',
  slug: 'favicon-check',
  title: 'Favicon 检查',
  description: '解析站点的图标声明并逐个检查可达性，含默认 /favicon.ico 兜底',
  titleEn: 'Favicon Check',
  descriptionEn:
    "Parse a site's icon link declarations and check each URL for reachability, with a default /favicon.ico fallback",

  category: 'seo',
  group: 'dev',
  tags: ['favicon', 'icon', 'seo', 'check'],

  priority: 'P1',
  feasibility: 'D',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['html'],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}
