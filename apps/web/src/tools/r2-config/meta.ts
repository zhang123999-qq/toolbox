import type { ToolMeta } from '@toolbox/catalog'

/**
 * r2-config —— 全局编号 #809
 * 域：edge（边缘计算 / Serverless）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'r2-config',
  slug: 'r2-config',
  title: 'R2 配置',
  description: '生成 Cloudflare R2 存储桶的 wrangler.toml 配置片段，校验桶命名规则',
  titleEn: 'R2 Config',
  descriptionEn:
    'Generate the wrangler.toml snippet for a Cloudflare R2 bucket, validating bucket naming rules',

  category: 'edge',
  group: 'life',
  tags: ['cloudflare', 'r2', 'storage', 'wrangler'],

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
