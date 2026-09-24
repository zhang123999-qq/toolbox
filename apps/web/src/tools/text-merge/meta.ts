import type { ToolMeta } from '@toolbox/catalog'

/**
 * text-merge —— 全局编号 #37
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'text-merge',
  slug: 'text-merge',
  title: '文本合并',
  description: '三方合并，解决冲突',
  titleEn: 'Three-way Merge',
  descriptionEn: 'Three-way merge with conflict handling',

  category: 'text',
  group: 'dev',
  tags: ['text', 'merge', 'diff'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['prefer'],

  deps: ['diff'],
  worker: false,
  wasm: false,
  api: false,
}
