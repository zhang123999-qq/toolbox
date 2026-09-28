import type { ToolMeta } from '@toolbox/catalog'

/**
 * contract-abi —— 全局编号 #711
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P2｜可行性：A｜模板：T3
 * 合约 ABI：解析 ABI JSON，浏览函数 / 事件接口，计算选择器与事件主题 */
export const meta: ToolMeta = {
  id: 'contract-abi',
  slug: 'contract-abi',
  title: '合约 ABI',
  description: '解析合约 ABI：浏览函数与事件接口，计算 4 字节选择器与事件主题',
  titleEn: 'Contract ABI',
  descriptionEn:
    'Parse contract ABIs: browse functions and events, compute selectors and topic hashes',

  category: 'encoding',
  group: 'dev',
  tags: ['ethereum', 'abi', 'contract', 'selector', 'web3'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['keyword'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
