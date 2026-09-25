import type { ToolMeta } from '@toolbox/catalog'

/**
 * jwt-decode —— 全局编号 #101
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'jwt-decode',
  slug: 'jwt-decode',
  title: 'JWT 解析',
  description: '不验签地读出 JWT 的 Header / Payload 与时间声明',
  titleEn: 'JWT Decode',
  descriptionEn: 'Read a JWT header, payload and time claims without verifying it',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'jwt', 'jws', 'token', 'auth'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['format'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
