import type { ToolMeta } from '@toolbox/catalog'

/**
 * prefix-suffix —— 全局编号 #32
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'prefix-suffix',
  slug: 'prefix-suffix',
  title: '前后缀添加',
  description: '批量给每行加前后缀',
  titleEn: 'Add Prefix / Suffix',
  descriptionEn: 'Add a prefix and/or suffix to every line',

  category: 'text',
  group: 'dev',
  tags: ['text', 'lines', 'batch'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['prefix', 'suffix', 'skipEmpty'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
