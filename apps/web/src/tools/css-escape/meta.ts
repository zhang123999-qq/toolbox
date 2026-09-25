import type { ToolMeta } from '@toolbox/catalog'

/**
 * css-escape —— 全局编号 #79
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'css-escape',
  slug: 'css-escape',
  title: 'CSS 转义',
  description: 'CSS 标识符与字符串转义及还原，按十六进制码点消歧',
  titleEn: 'CSS Escape',
  descriptionEn: 'Escape text to and from CSS identifier and string escapes',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'css', 'escape'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['direction'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
