import type { ToolMeta } from '@toolbox/catalog'

/**
 * ecdsa-sign —— 全局编号 #94
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P2｜可行性：C｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'ecdsa-sign',
  slug: 'ecdsa-sign',
  title: 'ECDSA 签名',
  description: 'P-256 / P-384 / P-521 曲线的 ECDSA 签名验签',
  titleEn: 'ECDSA Sign / Verify',
  descriptionEn: 'ECDSA signing and verification on P-256, P-384 and P-521',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'crypto', 'ecdsa', 'signature', 'ec'],

  priority: 'P2',
  feasibility: 'C',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['direction', 'curve', 'hash', 'encoding'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
