import type { ToolMeta } from '@toolbox/catalog'

/**
 * chain-query —— 全局编号 #701
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P3｜可行性：D｜模板：T3
 * 链上查询：经公共 RPC 查地址余额 / 交易 / 区块（只读，不签名不发交易） */
export const meta: ToolMeta = {
  id: 'chain-query',
  slug: 'chain-query',
  title: '链上查询',
  description: '链上查询：经公共 RPC 查询地址余额、交易详情、区块信息，只读不签名',
  titleEn: 'Chain Query',
  descriptionEn:
    'On-chain lookup via public RPC: address balance, transaction and block details (read-only)',

  category: 'encoding',
  group: 'dev',
  tags: ['ethereum', 'rpc', 'balance', 'block', 'web3'],

  priority: 'P3',
  feasibility: 'D',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}
