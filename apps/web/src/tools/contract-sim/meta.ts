import type { ToolMeta } from '@toolbox/catalog'

/**
 * contract-sim —— 全局编号 #697
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P2｜可行性：D｜模板：T3
 * 合约只读模拟：给定合约地址 + ABI + 方法 + 参数，用 eth_call 在本地节点模拟执行（只读） */
export const meta: ToolMeta = {
  id: 'contract-sim',
  slug: 'contract-sim',
  title: '合约只读模拟',
  description: '合约只读模拟：eth_call 在本地节点模拟执行合约方法，查看返回值（只读不上链）',
  titleEn: 'Contract Read Simulator',
  descriptionEn:
    'Simulate a contract call with eth_call: view return values without sending a transaction',

  category: 'encoding',
  group: 'dev',
  tags: ['ethereum', 'contract', 'abi', 'rpc', 'web3'],

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
