import type { ToolMeta } from '@toolbox/catalog'

/**
 * html-entity —— 全局编号 #76
 * 域：encoding（编码 / 加密 / 哈希 / 安全）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'html-entity',
  slug: 'html-entity',
  title: 'HTML 实体编解码',
  description: 'HTML 实体转义与还原，支持命名与数字两种写法',
  titleEn: 'HTML Entity Encode / Decode',
  descriptionEn: 'Escape and unescape HTML entities, named and numeric',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'html', 'entity', 'escape'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['direction', 'mode'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
