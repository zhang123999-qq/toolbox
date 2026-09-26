import type { ToolMeta } from '@toolbox/catalog'

/**
 * oauth —— 全局编号 #243
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'oauth',
  slug: 'oauth',
  title: 'OAuth 流程',
  description: 'OAuth 2.0 授权码 / 隐式 / 客户端凭证流程的步骤说明、示例 URL 与参数表',
  titleEn: 'OAuth 2.0 Flow Guide',
  descriptionEn: 'Step-by-step guide with example URLs and params for OAuth 2.0 grants',

  category: 'devops',
  group: 'dev',
  tags: ['oauth', 'auth', 'security', 'devops'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['flow'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
