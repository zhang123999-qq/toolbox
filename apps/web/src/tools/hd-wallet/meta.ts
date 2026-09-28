import type { ToolMeta } from '@toolbox/catalog'

/**
 * hd-wallet —— 全局编号 #703
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P3｜可行性：C｜模板：T3
 * BIP32 / BIP44 HD 钱包：种子 → 主密钥 → 路径推导 → 以太坊地址批量生成 */
export const meta: ToolMeta = {
  id: 'hd-wallet',
  slug: 'hd-wallet',
  title: 'HD 钱包',
  description: 'BIP32/BIP44 分层确定性钱包：种子按路径批量推导私钥与以太坊地址',
  titleEn: 'HD Wallet',
  descriptionEn:
    'BIP32/BIP44 hierarchical deterministic wallet: derive private keys and Ethereum addresses from a seed',

  category: 'encoding',
  group: 'dev',
  tags: ['bip32', 'bip44', 'hd-wallet', 'ethereum', 'web3'],

  priority: 'P3',
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
