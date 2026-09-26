import type { ToolMeta } from '@toolbox/catalog'

/**
 * cors-config —— 全局编号 #245
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'cors-config',
  slug: 'cors-config',
  title: 'CORS 配置',
  description: '生成 Access-Control-Allow-* 响应头及 Nginx / Express 配置片段',
  titleEn: 'CORS Config Generator',
  descriptionEn: 'Generate Access-Control-Allow-* headers plus Nginx / Express snippets',

  category: 'devops',
  group: 'dev',
  tags: ['cors', 'headers', 'nginx', 'express', 'devops'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['originMode', 'originList', 'methods', 'headers', 'credentials', 'maxAge'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
