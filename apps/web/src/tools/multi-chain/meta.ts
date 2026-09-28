import type { ToolMeta } from '@toolbox/catalog'

/**
 * multi-chain —— 全局编号 #707
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P2｜可行性：A｜模板：T3
 * 多链地址转换：以太坊 hex 地址 ↔ TRON base58check 地址互转（纯前端，无网络） */
export const meta: ToolMeta = {
  id: 'multi-chain',
  slug: 'multi-chain',
  title: '多链地址',
  description: '以太坊 hex 地址与 TRON base58 地址互转：base58check 编解码，批量转换',
  titleEn: 'Multi-chain Address',
  descriptionEn: 'Convert between Ethereum hex addresses and TRON base58 addresses with base58check codec',

  category: 'encoding',
  group: 'dev',
  tags: ['ethereum', 'tron', 'address', 'base58', 'web3'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['direction'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
