import type { ToolMeta } from '@toolbox/catalog'

/**
 * jwt-generate —— 全局编号 #102
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P1｜可行性：C｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'jwt-generate',
  slug: 'jwt-generate',
  title: 'JWT 生成',
  description: '用 HMAC 密钥签名生成 JWT（HS256 / HS384 / HS512）',
  titleEn: 'JWT Generate',
  descriptionEn: 'Sign a JWT with an HMAC secret (HS256 / HS384 / HS512)',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'jwt', 'jws', 'hmac', 'token'],

  priority: 'P1',
  feasibility: 'C',
  template: 'T2',

  inputs: ['text', 'secret'],
  outputs: ['text'],
  options: ['algorithm'],

  deps: ['jose'],
  worker: false,
  wasm: false,
  api: false,
}
