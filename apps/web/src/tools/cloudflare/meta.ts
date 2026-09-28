import type { ToolMeta } from '@toolbox/catalog'

/**
 * cloudflare —— 全局编号 #813
 * 域：edge（边缘计算 / Serverless）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'cloudflare',
  slug: 'cloudflare',
  title: 'Cloudflare 配置',
  description: '生成 Cloudflare DNS 记录与页面规则：记录校验、TTL 规则、页面规则 JSON 一键输出',
  titleEn: 'Cloudflare Config',
  descriptionEn:
    'Generate Cloudflare DNS records and page rules: record validation, TTL rules and page-rule JSON output',

  category: 'edge',
  group: 'life',
  tags: ['cloudflare', 'dns', 'page-rule', 'config'],

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
