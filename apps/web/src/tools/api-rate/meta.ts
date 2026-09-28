import type { ToolMeta } from '@toolbox/catalog'

/**
 * api-rate —— 全局编号 #762
 * 域：devops（自动化 / API 测试）｜大组：dev｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'api-rate',
  slug: 'api-rate',
  title: '接口限流模拟',
  description: '模拟令牌桶 / 滑动窗口限流：输入请求时间序列，输出每次请求允许或拒绝',
  titleEn: 'API Rate Limit Simulator',
  descriptionEn:
    'Simulate token-bucket and sliding-window rate limiting over a request timestamp series',

  category: 'devops',
  group: 'dev',
  tags: ['rate-limit', 'token-bucket', 'throttle', 'api'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
