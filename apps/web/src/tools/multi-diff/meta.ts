import type { ToolMeta } from '@toolbox/catalog'

/**
 * multi-diff —— 全局编号 #36
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'multi-diff',
  slug: 'multi-diff',
  title: '多文件 Diff',
  description: '多个文本文件差异对比',
  titleEn: 'Multi-file Diff',
  descriptionEn: 'Compare several text files against a base file',

  category: 'text',
  group: 'dev',
  tags: ['text', 'diff', 'compare'],

  priority: 'P1',
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
