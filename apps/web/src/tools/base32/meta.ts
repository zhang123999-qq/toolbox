import type { ToolMeta } from '@toolbox/catalog'

/**
 * base32 —— 全局编号 #72
 * 域：encoding（编码 / 加密 / 哈希 / 安全）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'base32',
  slug: 'base32',
  title: 'Base32 编解码',
  description: 'RFC 4648 Base32 编解码，大小写不敏感',
  titleEn: 'Base32 Encode / Decode',
  descriptionEn: 'RFC 4648 Base32 encode and decode, case-insensitive',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'base32', 'codec'],

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
