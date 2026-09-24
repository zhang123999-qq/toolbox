import type { ToolMeta } from '@toolbox/catalog'

/**
 * readability —— 全局编号 #4
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'readability',
  slug: 'readability',
  title: '可读性分析',
  description: 'Flesch、Gunning Fog 等可读性评分',
  titleEn: 'Readability',
  descriptionEn: 'Flesch, Gunning Fog and other readability scores',

  category: 'text',
  group: 'dev',
  tags: ['text', 'readability', 'analysis'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
