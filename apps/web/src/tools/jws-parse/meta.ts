import type { ToolMeta } from '@toolbox/catalog'

/**
 * jws-parse —— 全局编号 #104
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P2｜可行性：C｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'jws-parse',
  slug: 'jws-parse',
  title: 'JWS 解析',
  description: '用 HMAC 密钥验签 JWS，输出 Header / Payload 与结论',
  titleEn: 'JWS Verify',
  descriptionEn: 'Verify a JWS with an HMAC secret and show header, payload and verdict',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'jwt', 'jws', 'signature', 'verify'],

  priority: 'P2',
  feasibility: 'C',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['algorithm'],

  deps: ['jose'],
  worker: false,
  wasm: false,
  api: false,
}
