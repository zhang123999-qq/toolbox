import type { ToolMeta } from '@toolbox/catalog'

/**
 * text-align —— 全局编号 #61
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'text-align',
  slug: 'text-align',
  title: '文本对齐',
  description: '左对齐、右对齐、居中、填充',
  titleEn: 'Text Align',
  descriptionEn: 'Left, right, center and justified alignment',

  category: 'text',
  group: 'dev',
  tags: ['text', 'align', 'format'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode', 'width', 'filler'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
