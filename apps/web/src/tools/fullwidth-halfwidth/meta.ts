import type { ToolMeta } from '@toolbox/catalog'

/**
 * fullwidth-halfwidth —— 全局编号 #11
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'fullwidth-halfwidth',
  slug: 'fullwidth-halfwidth',
  title: '全角半角',
  description: '全角与半角字符互相转换',
  titleEn: 'Fullwidth / Halfwidth',
  descriptionEn: 'Convert between fullwidth and halfwidth characters',

  category: 'text',
  group: 'dev',
  tags: ['text', 'fullwidth', 'convert'],

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
