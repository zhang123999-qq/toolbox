import type { ToolMeta } from '@toolbox/catalog'

/**
 * indent —— 全局编号 #30
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'indent',
  slug: 'indent',
  title: '缩进转换',
  description: 'Tab 与空格互转，增减缩进',
  titleEn: 'Indent Converter',
  descriptionEn: 'Convert between tabs and spaces, and shift indentation',

  category: 'text',
  group: 'dev',
  tags: ['text', 'indent', 'code'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode', 'width'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
