import type { ToolMeta } from '@toolbox/catalog'

/**
 * api-cache —— 全局编号 #761
 * 域：devops（自动化 / API 测试）｜大组：dev｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'api-cache',
  slug: 'api-cache',
  title: '接口缓存分析',
  description: '解析 HTTP Cache-Control / Expires / ETag，给出缓存新鲜度决策与剩余 TTL',
  titleEn: 'API Cache Analyzer',
  descriptionEn:
    'Parse HTTP Cache-Control, Expires, and ETag headers and decide cache freshness with remaining TTL',

  category: 'devops',
  group: 'dev',
  tags: ['cache', 'http', 'cache-control', 'api'],

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
