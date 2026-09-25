import type { ToolMeta } from '@toolbox/catalog'

/**
 * base64-encode —— 全局编号 #71
 * 域：encoding（编码 / 加密 / 哈希 / 安全）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'base64-encode',
  slug: 'base64-encode',
  title: 'Base64 编解码',
  description: '文本与 Base64 互转，支持 URL-safe 变体',
  titleEn: 'Base64 Encode / Decode',
  descriptionEn: 'Convert text to and from Base64, with URL-safe variant',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'base64', 'codec'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['direction', 'mode'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
