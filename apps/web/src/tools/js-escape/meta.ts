import type { ToolMeta } from '@toolbox/catalog'

/**
 * js-escape —— 全局编号 #78
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'js-escape',
  slug: 'js-escape',
  title: 'JS 转义',
  description: '文本与 JavaScript 字符串转义序列互转，支持单双引号',
  titleEn: 'JavaScript Escape',
  descriptionEn: 'Escape text to and from JavaScript string literal escapes',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'javascript', 'escape'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['direction', 'quote'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
