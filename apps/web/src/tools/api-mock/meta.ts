import type { ToolMeta } from '@toolbox/catalog'

/**
 * api-mock —— 全局编号 #743
 * 域：devops（自动化 / API 测试）｜大组：dev｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'api-mock',
  slug: 'api-mock',
  title: 'API Mock 端点模拟',
  description:
    '定义 mock 路由规则，模拟请求匹配并返回预设响应（端点行为模拟，非 mock 数据生成）',
  titleEn: 'API Mock Endpoint Simulator',
  descriptionEn:
    'Define mock routes and simulate request matching with preset responses (endpoint behavior simulation, not mock data generation)',

  category: 'devops',
  group: 'dev',
  tags: ['api', 'mock', 'http', 'devtools'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text', 'routes', 'body'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
