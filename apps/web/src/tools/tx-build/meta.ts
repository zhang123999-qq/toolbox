import type { ToolMeta } from '@toolbox/catalog'

/**
 * tx-build —— 全局编号 #709
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P3｜可行性：A｜模板：T3
 * 交易构建：组装未签名以太坊交易（Legacy / EIP-1559），RLP 编码输出待签名 hex */
export const meta: ToolMeta = {
  id: 'tx-build',
  slug: 'tx-build',
  title: '交易构建',
  description: '构建未签名以太坊交易：Legacy / EIP-1559 参数组装与 RLP 编码，输出待签名 hex',
  titleEn: 'Transaction Builder',
  descriptionEn:
    'Build unsigned Ethereum transactions: Legacy / EIP-1559 assembly with RLP encoding',

  category: 'encoding',
  group: 'dev',
  tags: ['ethereum', 'transaction', 'rlp', 'eip-1559', 'web3'],

  priority: 'P3',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['txType'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
