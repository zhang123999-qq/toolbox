import type { ToolMeta } from '@toolbox/catalog'

/**
 * hmac-calc —— 全局编号 #96
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P0｜可行性：C｜模板：T2
 * 依赖：WebCrypto（crypto.subtle.importKey + sign）
 */
export const meta: ToolMeta = {
  id: 'hmac-calc',
  slug: 'hmac-calc',
  title: 'HMAC 计算',
  description: '用密钥计算文本的消息认证码（HMAC-SHA-1/256/384/512）',
  titleEn: 'HMAC',
  descriptionEn: 'Compute an HMAC message authentication code with a secret key',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'hmac', 'crypto'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T2',

  inputs: ['text', 'key'],
  outputs: ['text'],
  options: ['algorithm', 'format', 'type'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
