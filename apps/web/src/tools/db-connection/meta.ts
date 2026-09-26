import type { ToolMeta } from '@toolbox/catalog'

/**
 * db-connection —— 全局编号 #279
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'db-connection',
  slug: 'db-connection',
  title: '数据库连接串',
  description: '选数据库类型并填 host/port/user/password/dbname，生成连接串 URL',
  titleEn: 'DB Connection String Builder',
  descriptionEn: 'Build a database connection URL for MySQL/PG/Mongo/Redis/SQLite',

  category: 'devops',
  group: 'dev',
  tags: ['database', 'connection-string', 'mysql', 'postgres', 'mongodb'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['dbType', 'host', 'port', 'user', 'password', 'dbname'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
