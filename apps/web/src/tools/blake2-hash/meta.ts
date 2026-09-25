import type { ToolMeta } from '@toolbox/catalog'

/**
 * blake2-hash —— 全局编号 #122
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P2｜可行性：C｜模板：T2
 * 依赖：纯 JS 内置实现（WebCrypto 没有 BLAKE2，规范里也不包含）
 */
export const meta: ToolMeta = {
  id: 'blake2-hash',
  slug: 'blake2-hash',
  title: 'BLAKE2 哈希',
  description: '计算文本的 BLAKE2b / BLAKE2s 摘要（内置纯 JS 实现）',
  titleEn: 'BLAKE2 Hash',
  descriptionEn: 'Compute the BLAKE2b or BLAKE2s digest of a piece of text',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'blake2', 'hash'],

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
