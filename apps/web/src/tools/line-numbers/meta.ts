import type { ToolMeta } from '@toolbox/catalog'

/**
 * line-numbers —— 全局编号 #31
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'line-numbers',
  slug: 'line-numbers',
  title: '行号添加',
  description: '每行添加行号，支持格式',
  titleEn: 'Add Line Numbers',
  descriptionEn: 'Prefix each line with a line number, with several formats',

  category: 'text',
  group: 'dev',
  tags: ['text', 'lines', 'format'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['format', 'align', 'skipEmpty'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
