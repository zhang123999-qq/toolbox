import type { ToolMeta } from '@toolbox/catalog'

/**
 * sign-verify —— 全局编号 #704
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P2｜可行性：C｜模板：T3
 * personal_sign 签名与 ecrecover 验签（RFC6979 确定性 k，手写 secp256k1） */
export const meta: ToolMeta = {
  id: 'sign-verify',
  slug: 'sign-verify',
  title: '签名验签',
  description: '以太坊 personal_sign 签名与验签：RFC6979 确定性 k，ecrecover 恢复地址',
  titleEn: 'Sign & Verify',
  descriptionEn:
    'Ethereum personal_sign signing and verification: RFC6979 deterministic k, ecrecover address recovery',

  category: 'encoding',
  group: 'dev',
  tags: ['ethereum', 'signature', 'ecrecover', 'web3'],

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
