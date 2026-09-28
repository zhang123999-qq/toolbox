import type { ToolMeta } from '@toolbox/catalog'

/**
 * gas —— 全局编号 #700
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P2｜可行性：D｜模板：T3
 * Gas 计算：实时 eth_gasPrice 查询 + Gas 费手动计算器（BigInt 精确），走公共 RPC */
export const meta: ToolMeta = {
  id: 'gas',
  slug: 'gas',
  title: 'Gas 计算',
  description: 'Gas 费计算：实时查询 eth_gasPrice，手动计算 Gas Price × Gas Limit 的总费用',
  titleEn: 'Gas Calculator',
  descriptionEn:
    'Gas fee calculator: live eth_gasPrice lookup and manual gas price × limit estimation',

  category: 'encoding',
  group: 'dev',
  tags: ['ethereum', 'gas', 'gwei', 'rpc', 'web3'],

  priority: 'P2',
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
