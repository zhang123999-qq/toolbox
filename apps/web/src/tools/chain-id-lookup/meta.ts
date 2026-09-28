import type { ToolMeta } from '@toolbox/catalog'

/**
 * chain-id-lookup —— 全局编号 #715
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P2｜可行性：A｜模板：T3
 * 链 ID 查询：内置 60+ 主流公链数据表，支持十进制 / 0x 十六进制 / 名称 / 代币符号查询 */
export const meta: ToolMeta = {
  id: 'chain-id-lookup',
  slug: 'chain-id-lookup',
  title: '链 ID 查询',
  description:
    '查询区块链网络 ID：内置 60 余条主流公链，支持十进制、0x 十六进制、名称与代币符号搜索',
  titleEn: 'Chain ID Lookup',
  descriptionEn:
    'Look up blockchain network IDs: 60+ built-in mainnets, search by decimal, 0x hex, name or token symbol',

  category: 'encoding',
  group: 'dev',
  tags: ['chain-id', 'evm', 'web3', 'network'],

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
