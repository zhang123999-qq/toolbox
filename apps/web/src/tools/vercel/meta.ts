import type { ToolMeta } from '@toolbox/catalog'

/**
 * vercel —— 全局编号 #814
 * 域：edge（边缘计算 / Serverless）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'vercel',
  slug: 'vercel',
  title: 'Vercel 配置',
  description: '生成与校验 vercel.json：rewrites / redirects / headers 路径校验与格式化输出',
  titleEn: 'Vercel Config',
  descriptionEn:
    'Generate and validate vercel.json: path validation and formatted output for rewrites / redirects / headers',

  category: 'edge',
  group: 'life',
  tags: ['vercel', 'config', 'redirect', 'json'],

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
