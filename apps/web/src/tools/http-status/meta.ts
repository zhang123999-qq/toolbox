import type { ToolMeta } from '@toolbox/catalog'

/**
 * http-status —— 全局编号 #201
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * HTTP 状态码查询（码号或关键词 → 含义 + 分类），内置标准 1xx-5xx 表
 */
export const meta: ToolMeta = {
  id: 'http-status',
  slug: 'http-status',
  title: 'HTTP 状态码',
  description: '按码号或关键词查询 HTTP 状态码的含义与分类',
  titleEn: 'HTTP Status Code Lookup',
  descriptionEn: 'Look up HTTP status codes by number or keyword with category and meaning',

  category: 'devops',
  group: 'dev',
  tags: ['devops', 'http', 'status-code', 'rest'],

  priority: 'P0',
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
