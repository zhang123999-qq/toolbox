import type { ToolMeta } from '@toolbox/catalog'

/**
 * jwt-debug —— 全局编号 #244
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 *
 * 用 jose 解码 header/payload 并在提供密钥时验签（HS256/RS256 等）。
 */
export const meta: ToolMeta = {
  id: 'jwt-debug',
  slug: 'jwt-debug',
  title: 'JWT 调试',
  description: '解码 JWT 的 Header/Payload，可填密钥校验签名并检查过期等声明',
  titleEn: 'JWT Debugger',
  descriptionEn: 'Decode a JWT and optionally verify its signature with a secret or public key',

  category: 'devops',
  group: 'dev',
  tags: ['jwt', 'jws', 'auth', 'debug', 'devops'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['secret', 'publicKeyPem'],

  deps: ['jose'],
  worker: false,
  wasm: false,
  api: false,
}
