import type { ToolMeta } from '@toolbox/catalog'

/**
 * wallet-connect —— 全局编号 #708
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P3｜可行性：C｜模板：T3
 * 钱包连接：EIP-1193 浏览器注入钱包（MetaMask 类）连接，只读地址 / 链 ID / 余额，不发起交易 */
export const meta: ToolMeta = {
  id: 'wallet-connect',
  slug: 'wallet-connect',
  title: '钱包连接',
  description: '连接浏览器注入的以太坊钱包（EIP-1193）：读取地址、链 ID 与余额，只读不交易',
  titleEn: 'Wallet Connect',
  descriptionEn:
    'Connect an injected EIP-1193 browser wallet: read address, chain ID and balance, read-only',

  category: 'encoding',
  group: 'dev',
  tags: ['ethereum', 'wallet', 'eip-1193', 'metamask', 'web3'],

  priority: 'P3',
  feasibility: 'C',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
