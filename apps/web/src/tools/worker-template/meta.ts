import type { ToolMeta } from '@toolbox/catalog'

/**
 * worker-template —— 全局编号 #806
 * 域：edge（边缘计算 / Serverless）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'worker-template',
  slug: 'worker-template',
  title: 'Worker 模板',
  description: '按需生成 Cloudflare Worker 代码模板：路由分发、KV / D1 / R2 绑定与 Cron 定时任务',
  titleEn: 'Worker Template',
  descriptionEn:
    'Generate a Cloudflare Worker code template: routing, KV / D1 / R2 bindings and cron triggers',

  category: 'edge',
  group: 'life',
  tags: ['cloudflare', 'worker', 'serverless', 'template'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['router', 'kv', 'd1', 'r2', 'cron'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
