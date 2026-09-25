import type { ToolMeta } from '@toolbox/catalog'

/**
 * sql-escape —— 全局编号 #80
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/02-编码加密安全.md
 */
export const meta: ToolMeta = {
  id: 'sql-escape',
  slug: 'sql-escape',
  title: 'SQL 转义',
  description: 'SQL 字符串转义与还原，区分 MySQL / PostgreSQL / SQL Server',
  titleEn: 'SQL Escape',
  descriptionEn: 'Escape text for SQL literals across MySQL, PostgreSQL and SQL Server',

  category: 'encoding',
  group: 'dev',
  tags: ['encoding', 'sql', 'escape'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['direction', 'type', 'quote'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
