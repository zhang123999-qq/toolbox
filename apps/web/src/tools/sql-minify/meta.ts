import type { ToolMeta } from '@toolbox/catalog'

/**
 * sql-minify —— 全局编号 #166
 * 域：data-format（数据格式）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'sql-minify',
  slug: 'sql-minify',
  title: 'SQL 压缩',
  description: '去掉注释与多余空白，把 SQL 压成单行',
  titleEn: 'SQL Minify',
  descriptionEn: 'Strip comments and redundant whitespace to compress SQL into one line',

  category: 'data-format',
  group: 'dev',
  tags: ['sql', 'minify', 'compress'],

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
