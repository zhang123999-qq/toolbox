import type { ToolMeta } from '@toolbox/catalog'

/**
 * random-salt —— 全局编号 #116
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P1｜可行性：C｜模板：T2
 * 依赖：WebCrypto（crypto.getRandomValues）
 */
export const meta: ToolMeta = {
  id: 'random-salt',
  slug: 'random-salt',
  title: '随机盐',
  description: '生成密码学安全的随机盐（盐值），支持 hex / Base64 / Base64URL',
  titleEn: 'Random Salt',
  descriptionEn: 'Generate a cryptographically secure random salt',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'random', 'salt'],

  priority: 'P1',
  feasibility: 'C',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['length', 'format'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
