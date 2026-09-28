import type { ToolMeta } from '@toolbox/catalog'

/**
 * pagination-seo —— 全局编号 #664
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'pagination-seo',
  slug: 'pagination-seo',
  title: '分页 SEO',
  description: '检查分页页面的 rel prev/next、canonical 自指与分页 URL 一致性',
  titleEn: 'Pagination SEO',
  descriptionEn: 'Check paginated pages: rel prev/next, canonical self-reference and URL consistency',

  category: 'seo',
  group: 'dev',
  tags: ['pagination', 'seo', 'html', 'check'],

  priority: 'P2',
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
