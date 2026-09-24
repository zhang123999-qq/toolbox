import type { ToolMeta } from '@toolbox/catalog'

/**
 * batch-replace —— 全局编号 #33
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'batch-replace',
  slug: 'batch-replace',
  title: '批量替换',
  description: '多组查找替换，支持正则',
  titleEn: 'Batch Replace',
  descriptionEn: 'Apply multiple find-and-replace rules at once, regex supported',

  category: 'text',
  group: 'dev',
  tags: ['text', 'replace', 'batch'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['useRegex', 'ignoreCase'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
