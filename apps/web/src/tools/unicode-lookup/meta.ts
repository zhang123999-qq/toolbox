import type { ToolMeta } from '@toolbox/catalog'

/**
 * unicode-lookup —— 全局编号 #15
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'unicode-lookup',
  slug: 'unicode-lookup',
  title: 'Unicode 查询',
  description: '查询字符 Unicode 编码、名称、分类',
  titleEn: 'Unicode Lookup',
  descriptionEn: 'Look up a character’s Unicode code point, category and block',

  category: 'text',
  group: 'dev',
  tags: ['text', 'unicode', 'charset'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
