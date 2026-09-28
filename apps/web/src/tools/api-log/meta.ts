import type { ToolMeta } from '@toolbox/catalog'

/**
 * api-log —— 全局编号 #765
 * 域：devops（自动化 / API 测试）｜大组：dev｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'api-log',
  slug: 'api-log',
  title: '接口日志分析',
  description: '解析 Apache / Nginx 访问日志，统计状态码分布、错误率、热点路径与峰值小时',
  titleEn: 'API Log Analyzer',
  descriptionEn:
    'Parse Apache / Nginx access logs: status distribution, error rate, hot paths, and peak hours',

  category: 'devops',
  group: 'dev',
  tags: ['log', 'nginx', 'apache', 'analytics'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
