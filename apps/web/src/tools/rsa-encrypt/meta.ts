import type { ToolMeta } from '@toolbox/catalog'

/**
 * rsa-encrypt —— 全局编号 #92
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P1｜可行性：C｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'rsa-encrypt',
  slug: 'rsa-encrypt',
  title: 'RSA 加密',
  description: 'RSA-OAEP 加解密与 RSASSA 签名验签',
  titleEn: 'RSA Encrypt / Sign',
  descriptionEn: 'RSA-OAEP encryption and RSASSA signing with WebCrypto',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'crypto', 'rsa', 'oaep', 'signature'],

  priority: 'P1',
  feasibility: 'C',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['direction', 'hash', 'encoding'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
