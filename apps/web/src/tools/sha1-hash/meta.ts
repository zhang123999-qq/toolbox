import type { ToolMeta } from '@toolbox/catalog'

/**
 * sha1-hash —— 全局编号 #118
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P0｜可行性：C｜模板：T2
 * 依赖：WebCrypto（crypto.subtle.digest）
 */
export const meta: ToolMeta = {
  id: 'sha1-hash',
  slug: 'sha1-hash',
  title: 'SHA-1 哈希',
  description: '计算文本的 SHA-1 摘要，支持 hex 与 Base64 输出',
  titleEn: 'SHA-1 Hash',
  descriptionEn: 'Compute the SHA-1 digest of a piece of text',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'sha1', 'hash'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['uppercase', 'format'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
