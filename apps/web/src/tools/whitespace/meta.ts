import type { ToolMeta } from '@toolbox/catalog'

/**
 * whitespace —— 全局编号 #45
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'whitespace',
  slug: 'whitespace',
  title: '空白字符清理',
  description: '去首尾空格、多空格合并、去空行',
  titleEn: 'Whitespace Cleaner',
  descriptionEn: 'Trim lines, collapse repeated spaces and drop blank lines',

  category: 'text',
  group: 'dev',
  tags: ['text', 'whitespace', 'clean'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['trimLines', 'collapse', 'removeEmpty'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
