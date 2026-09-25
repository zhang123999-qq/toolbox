import type { ToolMeta } from '@toolbox/catalog'

/**
 * xxhash-hash —— 全局编号 #124
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P2｜可行性：B｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'xxhash-hash',
  slug: 'xxhash-hash',
  title: 'xxHash 哈希',
  description: '极快的非加密哈希 xxHash32 / xxHash64（WASM）',
  titleEn: 'xxHash',
  descriptionEn: 'Extremely fast non-cryptographic xxHash32 / xxHash64 (WASM)',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'hash', 'xxhash', 'checksum', 'wasm'],

  priority: 'P2',
  feasibility: 'B',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['bits', 'uppercase'],

  deps: ['xxhash-wasm'],
  worker: false,
  wasm: true,
  api: false,
}
