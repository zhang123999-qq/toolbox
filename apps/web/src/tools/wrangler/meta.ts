import type { ToolMeta } from '@toolbox/catalog'

/**
 * wrangler —— 全局编号 #810
 * 域：edge（边缘计算 / Serverless）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'wrangler',
  slug: 'wrangler',
  title: 'Wrangler 命令',
  description: 'Wrangler 常用命令速查：发布、本地开发、日志、KV / D1 / R2 操作命令拼装',
  titleEn: 'Wrangler Commands',
  descriptionEn:
    'Wrangler command cheat sheet: deploy, dev, tail and KV / D1 / R2 command builder',

  category: 'edge',
  group: 'life',
  tags: ['cloudflare', 'wrangler', 'cli', 'deploy'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['action'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
