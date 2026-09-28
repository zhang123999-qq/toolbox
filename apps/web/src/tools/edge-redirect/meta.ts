import type { ToolMeta } from '@toolbox/catalog'

/**
 * edge-redirect —— 全局编号 #817
 * 域：edge（边缘计算 / Serverless）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'edge-redirect',
  slug: 'edge-redirect',
  title: '边缘重定向',
  description: '生成 Cloudflare Bulk Redirects 批量重定向规则 JSON：来源通配符校验、目标 URL 校验',
  titleEn: 'Edge Redirect Rules',
  descriptionEn:
    'Generate Cloudflare Bulk Redirects JSON: source wildcard validation and destination URL validation',

  category: 'edge',
  group: 'life',
  tags: ['redirect', 'cloudflare', 'url', 'cdn'],

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
