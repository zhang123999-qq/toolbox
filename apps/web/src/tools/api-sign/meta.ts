import type { ToolMeta } from '@toolbox/catalog'

/**
 * api-sign —— 全局编号 #757
 * 域：devops（自动化 / API 测试）｜大组：dev｜优先级：P2｜可行性：C｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'api-sign',
  slug: 'api-sign',
  title: '接口签名',
  description: '按参数排序生成 HMAC-SHA256 接口签名，支持验签与自定义待签模板',
  titleEn: 'API Request Signer',
  descriptionEn:
    'Generate HMAC-SHA256 API request signatures over sorted params, with verification and custom templates',

  category: 'devops',
  group: 'dev',
  tags: ['sign', 'hmac', 'api', 'auth'],

  priority: 'P2',
  feasibility: 'C',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['method', 'encoding'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
