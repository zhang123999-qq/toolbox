import type { ToolMeta } from '@toolbox/catalog'

/**
 * table-to-text —— 全局编号 #22
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'table-to-text',
  slug: 'table-to-text',
  title: '表格转文本',
  description: '表格数据转 Markdown、CSV、JSON',
  titleEn: 'Table to Text',
  descriptionEn: 'Convert tabular data to Markdown, CSV or JSON',

  category: 'text',
  group: 'dev',
  tags: ['text', 'table', 'convert'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['delimiter', 'format', 'header'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
