import type { ToolMeta } from '@toolbox/catalog'

/**
 * base58 —— 全局编号 #73
 * 域：encoding（编码 / 加密 / 哈希 / 安全）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'base58',
  slug: 'base58',
  title: 'Base58 编解码',
  description: '比特币常用 Base58，提供 Bitcoin 与 Flickr 两套字母表',
  titleEn: 'Base58 Encode / Decode',
  descriptionEn: 'Base58 with the Bitcoin and Flickr alphabets',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'base58', 'bitcoin', 'codec'],

  priority: 'P1',
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
