import type { ToolMeta } from '@toolbox/catalog'

/**
 * utm —— 全局编号 #618
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'utm',
  slug: 'utm',
  title: 'UTM 生成',
  description: '基 URL 拼接 utm_source/medium/campaign 等参数，生成可追踪的推广链接',
  titleEn: 'UTM Builder',
  descriptionEn: 'Append utm_source/medium/campaign parameters to a base URL for campaign tracking',

  category: 'seo',
  group: 'dev',
  tags: ['url', 'utm', 'seo', 'marketing'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
