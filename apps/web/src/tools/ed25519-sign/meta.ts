import type { ToolMeta } from '@toolbox/catalog'

/**
 * ed25519-sign —— 全局编号 #95
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P2｜可行性：C｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'ed25519-sign',
  slug: 'ed25519-sign',
  title: 'Ed25519 签名',
  description: 'Ed25519 签名与验签，确定性签名可复现',
  titleEn: 'Ed25519 Sign / Verify',
  descriptionEn: 'Ed25519 signing and verification (deterministic)',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'crypto', 'ed25519', 'signature', 'eddsa'],

  priority: 'P2',
  feasibility: 'C',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['direction', 'encoding'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
