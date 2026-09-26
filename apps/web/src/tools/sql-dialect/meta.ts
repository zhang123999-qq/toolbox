import type { ToolMeta } from '@toolbox/catalog'

/**
 * sql-dialect —— 全局编号 #167
 * 域：data-format（数据格式）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'sql-dialect',
  slug: 'sql-dialect',
  title: 'SQL 方言转换',
  description: 'MySQL 与 PostgreSQL 之间常见语法差异互转',
  titleEn: 'SQL Dialect',
  descriptionEn: 'Convert common syntax differences between MySQL and PostgreSQL',

  category: 'data-format',
  group: 'dev',
  tags: ['sql', 'mysql', 'postgres'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['source', 'target'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
