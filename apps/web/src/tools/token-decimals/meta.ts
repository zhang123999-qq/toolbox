import type { ToolMeta } from '@toolbox/catalog'

/**
 * token-decimals —— 全局编号 #699
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P2｜可行性：A｜模板：T3
 * Token 精度换算：wei / gwei / ether / 自定义 decimals 互转，BigInt 精确计算 */
export const meta: ToolMeta = {
  id: 'token-decimals',
  slug: 'token-decimals',
  title: 'Token 精度',
  description: 'Token 单位换算：wei / gwei / ether / 自定义 decimals 互转，BigInt 精确计算',
  titleEn: 'Token Decimals',
  descriptionEn:
    'Token unit conversion: wei / gwei / ether / custom decimals with exact BigInt math',

  category: 'encoding',
  group: 'dev',
  tags: ['ethereum', 'token', 'wei', 'gwei', 'web3'],

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
