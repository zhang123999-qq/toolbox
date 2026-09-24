import type { ToolMeta } from '@toolbox/catalog'

/**
 * sort —— 全局编号 #29
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'sort',
  slug: 'sort',
  title: '文本排序',
  description: '按行排序，支持数字、长度、字典序',
  titleEn: 'Sort Lines',
  descriptionEn: 'Sort lines alphabetically, numerically or by length',

  category: 'text',
  group: 'dev',
  tags: ['text', 'sort', 'lines'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['sortBy', 'descending', 'ignoreCase'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
