import type { ToolMeta } from '@toolbox/catalog'

/**
 * tx-decode —— 全局编号 #696
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 * 以太坊交易解码：RLP 解析 Legacy / EIP-2930 / EIP-1559 原始交易，输出全部字段与交易哈希 */
export const meta: ToolMeta = {
  id: 'tx-decode',
  slug: 'tx-decode',
  title: '交易解码',
  description: '解码以太坊原始交易：RLP 解析 Legacy / EIP-2930 / EIP-1559，输出全部字段与交易哈希',
  titleEn: 'Transaction Decoder',
  descriptionEn: 'Decode raw Ethereum transactions: RLP parsing for Legacy / EIP-2930 / EIP-1559 with all fields and tx hash',

  category: 'encoding',
  group: 'dev',
  tags: ['ethereum', 'transaction', 'rlp', 'eip-1559', 'web3'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
