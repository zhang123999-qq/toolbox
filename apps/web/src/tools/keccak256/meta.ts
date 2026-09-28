import type { ToolMeta } from '@toolbox/catalog'

/**
 * keccak256 —— 全局编号 #694
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 * Keccak-256 哈希：以太坊版 Keccak（FIPS 202 padding 前，非 NIST SHA3），纯 JS 实现 */
export const meta: ToolMeta = {
  id: 'keccak256',
  slug: 'keccak256',
  title: 'Keccak-256 哈希',
  description: '计算 Keccak-256 摘要：以太坊同款哈希，支持文本 / hex 输入，hex / Base64 输出',
  titleEn: 'Keccak-256 Hash',
  descriptionEn: 'Compute Keccak-256 digests (Ethereum flavor): text/hex input, hex/Base64 output',

  category: 'encoding',
  group: 'dev',
  tags: ['ethereum', 'keccak', 'hash', 'web3', 'digest'],

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
