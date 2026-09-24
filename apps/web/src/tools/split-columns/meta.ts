import type { ToolMeta } from '@toolbox/catalog'

/**
 * split-columns —— 全局编号 #38
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'split-columns',
  slug: 'split-columns',
  title: '文本分列',
  description: '按分隔符分列，提取指定列',
  titleEn: 'Split Columns',
  descriptionEn: 'Split each line into columns by a delimiter',

  category: 'text',
  group: 'dev',
  tags: ['text', 'columns', 'split'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['delimiter', 'mode'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
