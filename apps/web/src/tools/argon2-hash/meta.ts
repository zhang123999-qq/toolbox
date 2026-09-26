import type { ToolMeta } from '@toolbox/catalog'

/**
 * argon2-hash —— 全局编号 #100
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P2｜可行性：B｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'argon2-hash',
  slug: 'argon2-hash',
  title: 'Argon2 哈希',
  description: 'Argon2id 口令哈希生成与校验（WASM，按需加载）',
  titleEn: 'Argon2 Hash',
  descriptionEn: 'Generate and verify Argon2id password hashes (WASM, lazy loaded)',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'crypto', 'argon2', 'password', 'kdf'],

  priority: 'P2',
  feasibility: 'B',
  template: 'T2',

  inputs: ['text', 'hash'],
  outputs: ['text'],
  options: ['direction', 'iterations', 'memory', 'parallelism'],

  deps: ['argon2-browser'],
  worker: false,
  wasm: true,
  api: false,
}
