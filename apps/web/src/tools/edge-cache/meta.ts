import type { ToolMeta } from '@toolbox/catalog'

/**
 * edge-cache —— 全局编号 #816
 * 域：edge（边缘计算 / Serverless）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'edge-cache',
  slug: 'edge-cache',
  title: '边缘缓存',
  description:
    '生成与解析 Cache-Control 响应头：max-age / s-maxage / stale-while-revalidate 等指令拼装',
  titleEn: 'Edge Cache Headers',
  descriptionEn:
    'Generate and parse Cache-Control response headers: max-age / s-maxage / stale-while-revalidate directive builder',

  category: 'edge',
  group: 'life',
  tags: ['cache', 'http', 'header', 'cdn'],

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
