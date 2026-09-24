import type { ToolMeta } from '@toolbox/catalog'

/**
 * extract-column —— 全局编号 #39
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'extract-column',
  slug: 'extract-column',
  title: '列提取',
  description: '从文本提取指定列',
  titleEn: 'Extract Column',
  descriptionEn: 'Extract specific columns from delimited text',

  category: 'text',
  group: 'dev',
  tags: ['text', 'columns', 'extract'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['delimiter', 'columns', 'joiner', 'skipMissing'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
