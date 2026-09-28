import type { ToolMeta } from '@toolbox/catalog'

/**
 * canonical-check —— 全局编号 #663
 * 域：seo（网络 / SEO / 网站）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'canonical-check',
  slug: 'canonical-check',
  title: '规范链接检查',
  description: '检查页面 canonical 标签：缺失、重复、非绝对 URL 与是否自指',
  titleEn: 'Canonical Check',
  descriptionEn:
    'Check page canonical tags: missing, duplicates, non-absolute URLs and self-reference',

  category: 'seo',
  group: 'dev',
  tags: ['canonical', 'seo', 'html', 'check'],

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
