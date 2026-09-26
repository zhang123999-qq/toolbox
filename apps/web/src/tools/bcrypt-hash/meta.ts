import type { ToolMeta } from '@toolbox/catalog'

/**
 * bcrypt-hash —— 全局编号 #98
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 *
 * 规划表标注 B（担心 bcrypt 计算量），实际用纯 JS 的 bcryptjs 落地、无需 WASM，
 * 按「代码事实优先于规划」降级为 A（与 audit-report 的 B→A 处理口径一致）。
 */
export const meta: ToolMeta = {
  id: 'bcrypt-hash',
  slug: 'bcrypt-hash',
  title: 'Bcrypt 哈希',
  description: '口令 bcrypt 哈希生成与校验，可调 cost',
  titleEn: 'Bcrypt Hash',
  descriptionEn: 'Generate and verify bcrypt password hashes with adjustable cost',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'crypto', 'bcrypt', 'password', 'kdf'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text', 'hash'],
  outputs: ['text'],
  options: ['direction', 'cost'],

  deps: ['bcryptjs'],
  worker: false,
  wasm: false,
  api: false,
}
