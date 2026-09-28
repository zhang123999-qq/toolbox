import type { ToolMeta } from '@toolbox/catalog'

/**
 * private-key —— 全局编号 #692
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P1｜可行性：C｜模板：T3
 * secp256k1 私钥生成：密码学安全随机数（Web Crypto），纯前端 */
export const meta: ToolMeta = {
  id: 'private-key',
  slug: 'private-key',
  title: '私钥生成',
  description: '生成以太坊 secp256k1 私钥：Web Crypto 密码学安全随机，支持批量与 0x 前缀',
  titleEn: 'Private Key Generator',
  descriptionEn:
    'Generate Ethereum secp256k1 private keys with Web Crypto randomness, batch and 0x prefix supported',

  category: 'encoding',
  group: 'dev',
  tags: ['ethereum', 'secp256k1', 'private-key', 'random', 'web3'],

  priority: 'P1',
  feasibility: 'C',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
