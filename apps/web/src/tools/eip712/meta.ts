import type { ToolMeta } from '@toolbox/catalog'

/**
 * eip712 —— 全局编号 #705
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P2｜可行性：A｜模板：T3
 * EIP-712 结构化数据哈希（纯前端，无网络） */
export const meta: ToolMeta = {
  id: 'eip712',
  slug: 'eip712',
  title: 'EIP-712 哈希',
  description: 'EIP-712 结构化数据哈希：encodeType、domain 分隔符与待签名摘要',
  titleEn: 'EIP-712 Hash',
  descriptionEn: 'EIP-712 typed data hashing: encodeType, domain separator and signable digest',

  category: 'encoding',
  group: 'dev',
  tags: ['ethereum', 'eip712', 'typed-data', 'web3'],

  priority: 'P2',
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
