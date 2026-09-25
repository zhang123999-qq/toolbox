import type { ToolMeta } from '@toolbox/catalog'

/**
 * key-generate —— 全局编号 #108
 * 域：encoding（编码 / 加密 / 哈希 / 安全）｜大组：dev｜优先级：P1｜可行性：C｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'key-generate',
  slug: 'key-generate',
  title: '密钥生成',
  description: '生成对称与非对称密钥，导出 hex / base64 / JWK / PEM',
  titleEn: 'Key Generator',
  descriptionEn: 'Generate symmetric and asymmetric keys as hex, base64, JWK or PEM',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'crypto', 'key', 'rsa', 'ecdsa', 'ed25519'],

  priority: 'P1',
  feasibility: 'C',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['type', 'bits', 'curve', 'format'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
