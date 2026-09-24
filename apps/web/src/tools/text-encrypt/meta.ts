import type { ToolMeta } from '@toolbox/catalog'

/**
 * text-encrypt —— 全局编号 #56
 * 域：text（文本与内容）｜大组：dev｜优先级：P2｜可行性：C｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'text-encrypt',
  slug: 'text-encrypt',
  title: '文本加密',
  description: '文本 AES 加密解密',
  titleEn: 'Text Encryption',
  descriptionEn: 'Encrypt and decrypt text with AES',

  category: 'text',
  group: 'dev',
  tags: ['text', 'crypto', 'aes'],

  priority: 'P2',
  feasibility: 'C',
  template: 'T2',

  inputs: ['text', 'password'],
  outputs: ['text'],
  options: ['mode'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
