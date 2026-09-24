import type { ToolMeta } from '@toolbox/catalog'

/**
 * regex-replace —— 全局编号 #34
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'regex-replace',
  slug: 'regex-replace',
  title: '正则替换',
  description: '正则表达式替换，支持分组',
  titleEn: 'Regex Replace',
  descriptionEn: 'Replace using a regular expression, with capture group support',

  category: 'text',
  group: 'dev',
  tags: ['text', 'regex', 'replace'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['pattern', 'replacement', 'global', 'ignoreCase', 'multiline'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
