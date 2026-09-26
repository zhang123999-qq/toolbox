import type { ToolMeta } from '@toolbox/catalog'

/**
 * ecc-encrypt —— 全局编号 #93
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P2｜可行性：C｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'ecc-encrypt',
  slug: 'ecc-encrypt',
  title: 'ECC 加密',
  description: 'ECDH 密钥协商生成共享密钥，含密钥对生成',
  titleEn: 'ECC Encryption',
  descriptionEn: 'ECDH key agreement to derive a shared secret, with key pair generation',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'crypto', 'ecc', 'ecdh', 'key-agreement'],

  priority: 'P2',
  feasibility: 'C',
  template: 'T2',

  inputs: ['text', 'publicKey', 'privateKey'],
  outputs: ['text'],
  options: ['direction', 'curve', 'encoding'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
