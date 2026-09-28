import type { ToolMeta } from '@toolbox/catalog'

/**
 * api-retry —— 全局编号 #760
 * 域：devops（自动化 / API 测试）｜大组：dev｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'api-retry',
  slug: 'api-retry',
  title: '接口重试策略',
  description: '计算接口重试退避时间表：指数 / 线性 / 固定策略，支持抖动与上限',
  titleEn: 'API Retry Strategy',
  descriptionEn:
    'Compute API retry backoff schedules: exponential, linear, or fixed strategies with jitter and caps',

  category: 'devops',
  group: 'dev',
  tags: ['retry', 'backoff', 'jitter', 'api'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['strategy'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
