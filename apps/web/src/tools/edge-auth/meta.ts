import type { ToolMeta } from '@toolbox/catalog'

/**
 * edge-auth —— 全局编号 #818
 * 域：edge（边缘计算 / Serverless）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'edge-auth',
  slug: 'edge-auth',
  title: '边缘鉴权',
  description: '生成 Cloudflare Worker 鉴权代码：HTTP Basic Auth 与 JWT（WebCrypto）校验片段',
  titleEn: 'Edge Auth Snippets',
  descriptionEn:
    'Generate Cloudflare Worker auth code: HTTP Basic Auth and JWT (WebCrypto) verification snippets',

  category: 'edge',
  group: 'life',
  tags: ['auth', 'jwt', 'worker', 'basic'],

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
