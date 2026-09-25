import type { ToolMeta } from '@toolbox/catalog'

/**
 * ssh-key —— 全局编号 #111
 * 域：encoding（编码 / 加密 / 哈希 / 安全）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'ssh-key',
  slug: 'ssh-key',
  title: 'SSH 密钥',
  description: '用浏览器 WebCrypto 生成 ed25519 / RSA 密钥对',
  titleEn: 'SSH Key Generator',
  descriptionEn: 'Generate an ed25519 or RSA key pair with browser WebCrypto',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'ssh', 'keypair'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['algorithm', 'bits'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
