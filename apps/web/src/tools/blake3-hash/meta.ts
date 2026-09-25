import type { ToolMeta } from '@toolbox/catalog'

/**
 * blake3-hash —— 全局编号 #123
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P3｜可行性：B｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'blake3-hash',
  slug: 'blake3-hash',
  title: 'BLAKE3 哈希',
  description: 'BLAKE3 摘要，支持任意输出长度（WASM 按需加载）',
  titleEn: 'BLAKE3 Hash',
  descriptionEn: 'BLAKE3 digest with extendable output (WASM, lazy loaded)',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'hash', 'blake3', 'xof', 'wasm'],

  priority: 'P3',
  feasibility: 'B',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['length', 'uppercase'],

  deps: ['blake3-wasm'],
  worker: false,
  wasm: true,
  api: false,
}
