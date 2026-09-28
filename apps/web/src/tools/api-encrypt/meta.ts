import type { ToolMeta } from '@toolbox/catalog'

/**
 * api-encrypt —— 全局编号 #758
 * 域：devops（自动化 / API 测试）｜大组：dev｜优先级：P2｜可行性：C｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'api-encrypt',
  slug: 'api-encrypt',
  title: '接口加密',
  description: '用 PBKDF2 + AES-GCM 256 加解密接口报文，输出可传输的 JSON 载荷',
  titleEn: 'API Payload Encryptor',
  descriptionEn:
    'Encrypt and decrypt API payloads with PBKDF2 + AES-GCM 256 into a portable JSON package',

  category: 'devops',
  group: 'dev',
  tags: ['encrypt', 'aes', 'pbkdf2', 'api'],

  priority: 'P2',
  feasibility: 'C',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
