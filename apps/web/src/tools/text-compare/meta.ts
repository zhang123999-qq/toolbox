import type { ToolMeta } from '@toolbox/catalog'

/**
 * text-compare —— 全局编号 #65
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'text-compare',
  slug: 'text-compare',
  title: '文本比较',
  description: '相似度、编辑距离',
  titleEn: 'Text Compare',
  descriptionEn: 'Similarity and edit distance',

  category: 'text',
  group: 'dev',
  tags: ['text', 'compare', 'diff'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text', 'textB'],
  outputs: ['text'],
  options: ['mode'],

  deps: ['diff'],
  worker: false,
  wasm: false,
  api: false,
}
