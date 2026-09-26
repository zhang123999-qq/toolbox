import type { ToolMeta } from '@toolbox/catalog'

/**
 * sql-plan —— 全局编号 #278
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'sql-plan',
  slug: 'sql-plan',
  title: 'SQL 执行计划',
  description: '解析 SELECT 语句，估算表扫描 / JOIN / 排序与索引使用，输出文本执行计划',
  titleEn: 'SQL Plan Estimator',
  descriptionEn: 'Parse a SELECT and estimate a text query plan with cost',

  category: 'devops',
  group: 'dev',
  tags: ['sql', 'explain', 'query-plan', 'database'],

  priority: 'P2',
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
