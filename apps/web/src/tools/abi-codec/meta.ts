import type { ToolMeta } from '@toolbox/catalog'

/**
 * abi-codec —— 全局编号 #695
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 * 以太坊 ABI 编解码：函数选择器、参数编码（calldata）、calldata 解码，纯前端实现 */
export const meta: ToolMeta = {
  id: 'abi-codec',
  slug: 'abi-codec',
  title: 'ABI 编解码',
  description: '以太坊 ABI 编解码：函数选择器计算、调用参数编码为 calldata、calldata 解码回参数',
  titleEn: 'ABI Encoder / Decoder',
  descriptionEn: 'Ethereum ABI codec: function selector, calldata encoding, and calldata decoding',

  category: 'encoding',
  group: 'dev',
  tags: ['ethereum', 'abi', 'calldata', 'selector', 'web3'],

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
