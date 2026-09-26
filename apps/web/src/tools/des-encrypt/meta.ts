import type { ToolMeta } from '@toolbox/catalog'

/**
 * des-encrypt —— 全局编号 #91
 * 域：encoding（编码 / 加密 / 哈希 / 安全）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'des-encrypt',
  slug: 'des-encrypt',
  title: 'DES 加密',
  description: 'DES / 3DES 加密解密，仅用于兼容遗留系统',
  titleEn: 'DES / 3DES Encrypt',
  descriptionEn: 'Encrypt and decrypt with DES or Triple DES (legacy only)',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'crypto', 'des', '3des', 'legacy'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text', 'key', 'iv'],
  outputs: ['text'],
  options: ['method', 'mode', 'direction', 'encoding', 'padding'],

  deps: ['crypto-js'],
  worker: false,
  wasm: false,
  api: false,
}
