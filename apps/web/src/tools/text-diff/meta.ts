import type { ToolMeta } from '@toolbox/catalog'

/**
 * text-diff —— 全局编号 #35
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'text-diff',
  slug: 'text-diff',
  title: '文本 Diff',
  description: '两段文本差异对比，行级/字符级',
  titleEn: 'Text Diff',
  descriptionEn: 'Compare two texts and show differences at line or character level',

  category: 'text',
  group: 'dev',
  tags: ['text', 'diff', 'compare'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode'],

  deps: ['diff'],
  worker: false,
  wasm: false,
  api: false,
}
