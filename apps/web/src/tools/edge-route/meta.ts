import type { ToolMeta } from '@toolbox/catalog'

/**
 * edge-route —— 全局编号 #812
 * 域：edge（边缘计算 / Serverless）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'edge-route',
  slug: 'edge-route',
  title: '路由调试',
  description: '模拟 Cloudflare Workers 路由匹配：按精确 > 前缀 > 通配符优先级测试 URL 命中哪条路由',
  titleEn: 'Edge Route Tester',
  descriptionEn:
    'Simulate Cloudflare Workers route matching: test which route a URL hits by exact > prefix > wildcard priority',

  category: 'edge',
  group: 'life',
  tags: ['cloudflare', 'worker', 'route', 'debug'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['url'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
