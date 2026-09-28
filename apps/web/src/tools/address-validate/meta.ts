import type { ToolMeta } from '@toolbox/catalog'

/**
 * address-validate —— 全局编号 #691
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 * 以太坊地址校验：格式检查 + EIP-55 checksum 校验（keccak256 纯 JS 实现） */
export const meta: ToolMeta = {
  id: 'address-validate',
  slug: 'address-validate',
  title: '地址校验',
  description: '校验以太坊钱包地址：0x 格式检查与 EIP-55 checksum 校验，输出规范地址',
  titleEn: 'Address Validate',
  descriptionEn: 'Validate Ethereum wallet addresses: 0x format check and EIP-55 checksum verification',

  category: 'encoding',
  group: 'dev',
  tags: ['ethereum', 'address', 'eip-55', 'checksum', 'web3'],

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
