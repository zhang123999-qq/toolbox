import type { ToolMeta } from '@toolbox/catalog'

/**
 * data-url —— 全局编号 #85
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'data-url',
  slug: 'data-url',
  title: 'Data URL',
  description: '生成与解析 Data URL，支持 Base64 与百分号编码',
  titleEn: 'Data URL',
  descriptionEn: 'Build and parse data URLs with base64 or percent-encoding',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'data-url', 'base64'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['direction', 'mode', 'type'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
