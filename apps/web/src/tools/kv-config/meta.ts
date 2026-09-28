import type { ToolMeta } from '@toolbox/catalog'

/**
 * kv-config —— 全局编号 #807
 * 域：edge（边缘计算 / Serverless）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'kv-config',
  slug: 'kv-config',
  title: 'KV 配置',
  description: '生成 Cloudflare KV 命名空间的 wrangler.toml 配置片段，校验绑定名与命名空间 ID',
  titleEn: 'KV Config',
  descriptionEn:
    'Generate the wrangler.toml snippet for a Cloudflare KV namespace, validating binding and namespace ID',

  category: 'edge',
  group: 'life',
  tags: ['cloudflare', 'kv', 'wrangler', 'config'],

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
