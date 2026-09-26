import type { ToolMeta } from '@toolbox/catalog'

/**
 * iso8601 —— 全局编号 #200
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * ISO 8601 日期时间的生成与解析（原生 Date）
 */
export const meta: ToolMeta = {
  id: 'iso8601',
  slug: 'iso8601',
  title: 'ISO8601',
  description: 'ISO 8601 日期时间生成与解析（含时区偏移 / Z）',
  titleEn: 'ISO 8601 Generator & Parser',
  descriptionEn: 'Generate and inspect ISO 8601 date-time strings with timezone offset or Z',

  category: 'devops',
  group: 'dev',
  tags: ['devops', 'iso8601', 'date', 'datetime'],

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
