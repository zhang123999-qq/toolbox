import type { ToolMeta } from '@toolbox/catalog'

/**
 * case-convert —— 全局编号 #9
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'case-convert',
  slug: 'case-convert',
  title: '大小写转换',
  description: '大写、小写、首字母大写、标题化',
  titleEn: 'Case Convert',
  descriptionEn: 'Upper, lower, capitalize and title case',

  category: 'text',
  group: 'dev',
  tags: ['text', 'case', 'convert'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
