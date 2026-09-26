import type { ToolMeta } from '@toolbox/catalog'

/**
 * scrypt-derive —— 全局编号 #99
 * 域：encoding（编码 / 加密 / 哈希 / 安全）｜大组：dev｜优先级：P2｜可行性：C｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'scrypt-derive',
  slug: 'scrypt-derive',
  title: 'Scrypt',
  description: '用 Scrypt 从口令派生密钥（内置 RFC 7914 实现）',
  titleEn: 'Scrypt Key Derivation',
  descriptionEn: 'Derive a key from a password with Scrypt',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'crypto', 'kdf', 'scrypt', 'password'],

  priority: 'P2',
  feasibility: 'C',
  template: 'T2',

  inputs: ['text', 'salt'],
  outputs: ['text'],
  options: ['blocks', 'parallelism', 'length', 'format'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
