import type { ToolMeta } from '@toolbox/catalog'

/**
 * mnemonic —— 全局编号 #702
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P2｜可行性：C｜模板：T3
 * BIP39 助记词：生成 / 校验 / 转种子（SHA-256 / PBKDF2-HMAC-SHA-512 全部手写） */
export const meta: ToolMeta = {
  id: 'mnemonic',
  slug: 'mnemonic',
  title: '助记词',
  description: 'BIP39 助记词：生成 12/15/18/21/24 词、校验 checksum、转 64 字节种子',
  titleEn: 'Mnemonic',
  descriptionEn:
    'BIP39 mnemonic: generate 12/15/18/21/24 words, verify checksum, derive 64-byte seed',

  category: 'encoding',
  group: 'dev',
  tags: ['bip39', 'mnemonic', 'seed', 'web3'],

  priority: 'P2',
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
