import type { ToolMeta } from '@toolbox/catalog'

/**
 * sql-to-orm —— 全局编号 #168
 * 域：data-format（数据格式）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'sql-to-orm',
  slug: 'sql-to-orm',
  title: 'SQL 转 ORM',
  description: '把 CREATE TABLE 转成 Sequelize 或 TypeORM 模型定义',
  titleEn: 'SQL to ORM',
  descriptionEn: 'Turn CREATE TABLE into Sequelize or TypeORM model definitions',

  category: 'data-format',
  group: 'dev',
  tags: ['sql', 'orm', 'codegen'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['target'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
