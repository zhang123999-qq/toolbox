import type { ToolMeta } from '@toolbox/catalog'

/**
 * escape —— 全局编号 #16
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'escape',
  slug: 'escape',
  title: '转义反转义',
  description: 'JS、HTML、CSS、JSON、SQL 转义',
  titleEn: 'Escape / Unescape',
  descriptionEn: 'Escape and unescape for JS, HTML, CSS, JSON and SQL',

  category: 'text',
  group: 'dev',
  tags: ['text', 'escape', 'code'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['type', 'mode'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
