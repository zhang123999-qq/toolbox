import type { ToolMeta } from '@toolbox/catalog'

/**
 * symbols —— 全局编号 #55
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'symbols',
  slug: 'symbols',
  title: '特殊符号',
  description: '数学、箭头、货币等符号',
  titleEn: 'Special Symbols',
  descriptionEn: 'Math, arrow, currency and other symbols',

  category: 'text',
  group: 'dev',
  tags: ['text', 'symbol', 'picker'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['category'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
