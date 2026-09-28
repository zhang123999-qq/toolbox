import type { ToolMeta } from '@toolbox/catalog'

/**
 * d1-config —— 全局编号 #808
 * 域：edge（边缘计算 / Serverless）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'd1-config',
  slug: 'd1-config',
  title: 'D1 配置',
  description: '生成 Cloudflare D1 数据库的 wrangler.toml 配置片段，并附建表示例 SQL',
  titleEn: 'D1 Config',
  descriptionEn:
    'Generate the wrangler.toml snippet for a Cloudflare D1 database, with a sample schema SQL',

  category: 'edge',
  group: 'life',
  tags: ['cloudflare', 'd1', 'sqlite', 'wrangler'],

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
