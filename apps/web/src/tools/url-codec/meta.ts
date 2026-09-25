import type { ToolMeta } from '@toolbox/catalog'

/**
 * url-codec —— 全局编号 #75
 * 域：encoding（编码 / 加密 / 哈希 / 安全）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'url-codec',
  slug: 'url-codec',
  title: 'URL 编解码',
  description: 'URL 百分号编码与解码，区分组件与整串两种口径',
  titleEn: 'URL Encode / Decode',
  descriptionEn: 'Percent-encoding and decoding for URL components and whole URLs',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'url', 'uri', 'percent', 'codec'],

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
