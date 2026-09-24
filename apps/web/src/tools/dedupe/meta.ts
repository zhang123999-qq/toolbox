import type { ToolMeta } from '@toolbox/catalog'

/**
 * dedupe —— 全局编号 #28
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'dedupe',
  slug: 'dedupe',
  title: '文本去重',
  description: '按行去重，保留顺序',
  titleEn: 'Remove Duplicate Lines',
  descriptionEn: 'Remove duplicate lines while preserving order',

  category: 'text',
  group: 'dev',
  tags: ['text', 'dedupe', 'lines'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['ignoreCase', 'trimLines', 'keepEmpty'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
