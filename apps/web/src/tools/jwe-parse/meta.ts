import type { ToolMeta } from '@toolbox/catalog'

/**
 * jwe-parse —— 全局编号 #103
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P2｜可行性：C｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'jwe-parse',
  slug: 'jwe-parse',
  title: 'JWE 解析',
  description: '用口令解密 JWE（dir + A256GCM），还原明文',
  titleEn: 'JWE Decrypt',
  descriptionEn: 'Decrypt a JWE (dir + A256GCM) with a passphrase to recover the plaintext',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'jwt', 'jwe', 'decrypt', 'a256gcm'],

  priority: 'P2',
  feasibility: 'C',
  template: 'T2',

  inputs: ['text', 'secret'],
  outputs: ['text'],
  options: [],

  deps: ['jose'],
  worker: false,
  wasm: false,
  api: false,
}
