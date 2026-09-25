import type { ToolMeta } from '@toolbox/catalog'

/**
 * sha3-hash —— 全局编号 #120
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P2｜可行性：C｜模板：T2
 * 依赖：WebCrypto（优先 crypto.subtle.digest，浏览器不支持时回落到内置 Keccak 实现）
 */
export const meta: ToolMeta = {
  id: 'sha3-hash',
  slug: 'sha3-hash',
  title: 'SHA-3 哈希',
  description: '计算文本的 SHA3-256 / SHA3-384 / SHA3-512 摘要',
  titleEn: 'SHA-3 Hash',
  descriptionEn: 'Compute the SHA3-256, SHA3-384 or SHA3-512 digest of a piece of text',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'sha3', 'hash'],

  priority: 'P2',
  feasibility: 'C',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['algorithm', 'format'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
