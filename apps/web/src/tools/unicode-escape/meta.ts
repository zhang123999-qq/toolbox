import type { ToolMeta } from '@toolbox/catalog'

/**
 * unicode-escape —— 全局编号 #77
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'unicode-escape',
  slug: 'unicode-escape',
  title: 'Unicode 转义',
  description: '文本与 \\uXXXX 转义序列互转，兼容 \\u{XXXXX} 写法',
  titleEn: 'Unicode Escape',
  descriptionEn: 'Convert text to and from \\uXXXX escape sequences',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'unicode', 'escape'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['direction'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
