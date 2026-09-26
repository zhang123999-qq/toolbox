import type { ToolMeta } from '@toolbox/catalog'

/**
 * connection-parser —— 全局编号 #280
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'connection-parser',
  slug: 'connection-parser',
  title: '连接串解析',
  description:
    '解析 mysql/postgresql/mongodb/redis 连接串，拆出 host/port/user/password/dbname/参数',
  titleEn: 'Connection String Parser',
  descriptionEn: 'Parse a DB connection URL into host/port/user/password/dbname/params',

  category: 'devops',
  group: 'dev',
  tags: ['database', 'connection-string', 'parser', 'mysql', 'postgres'],

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
