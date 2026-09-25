import type { ToolMeta } from '@toolbox/catalog'

/**
 * sha256-hash —— 全局编号 #119
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P0｜可行性：C｜模板：T2
 * 依赖：WebCrypto（crypto.subtle.digest）
 */
export const meta: ToolMeta = {
  id: 'sha256-hash',
  slug: 'sha256-hash',
  title: 'SHA-256 哈希',
  description: '计算文本的 SHA-256 / SHA-384 / SHA-512 摘要',
  titleEn: 'SHA-256 Hash',
  descriptionEn: 'Compute the SHA-256, SHA-384 or SHA-512 digest of a piece of text',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'sha256', 'hash'],

  priority: 'P0',
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
