import type { ToolMeta } from '@toolbox/catalog'

/**
 * keyword-density —— 全局编号 #6
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'keyword-density',
  slug: 'keyword-density',
  title: '关键词密度',
  description: '计算关键词占比，SEO 参考',
  titleEn: 'Keyword Density',
  descriptionEn: 'Compute keyword share of text, for SEO reference',

  category: 'text',
  group: 'dev',
  tags: ['text', 'seo', 'keyword'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['topN'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
