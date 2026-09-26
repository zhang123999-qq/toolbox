import type { ToolMeta } from '@toolbox/catalog'

/**
 * aes-encrypt —— 全局编号 #90
 * 域：encoding（编码 / 加密 / 哈希 / 安全）｜大组：dev｜优先级：P0｜可行性：C｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'aes-encrypt',
  slug: 'aes-encrypt',
  title: 'AES 加密',
  description: 'AES-GCM / AES-CBC 文本加密解密',
  titleEn: 'AES Encrypt / Decrypt',
  descriptionEn: 'Encrypt and decrypt text with AES-GCM or AES-CBC',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'crypto', 'aes', 'gcm', 'cbc'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T2',

  inputs: ['text', 'key', 'iv'],
  outputs: ['text'],
  options: ['method', 'bits', 'direction', 'encoding'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
