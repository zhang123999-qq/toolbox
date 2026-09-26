import type { ToolMeta } from '@toolbox/catalog'

/**
 * sql-format —— 全局编号 #165
 * 域：data-format（数据格式）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'sql-format',
  slug: 'sql-format',
  title: 'SQL 格式化',
  description: '关键字大小写归一、子句换行、缩进对齐，并保留注释',
  titleEn: 'SQL Format',
  descriptionEn: 'Normalize SQL keyword case, break clauses onto lines and keep comments',

  category: 'data-format',
  group: 'dev',
  tags: ['sql', 'format', 'beautify'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode', 'indent'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
