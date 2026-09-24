import type { ToolMeta } from '@toolbox/catalog'

/**
 * charset-lookup —— 全局编号 #53
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'charset-lookup',
  slug: 'charset-lookup',
  title: '字符集查询',
  description: '查询字符所属字符集',
  titleEn: 'Charset Lookup',
  descriptionEn: 'Look up which character set a character belongs to',

  category: 'text',
  group: 'dev',
  tags: ['text', 'charset', 'unicode'],

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
