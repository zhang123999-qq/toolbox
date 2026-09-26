import type { ToolMeta } from '@toolbox/catalog'

/**
 * http-client —— 全局编号 #209
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：C｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'http-client',
  slug: 'http-client',
  title: 'HTTP 请求测试',
  description: '在浏览器内向任意 URL 发 GET/POST/PUT/DELETE/PATCH 请求，查看状态码、响应头与响应体',
  titleEn: 'HTTP Client Tester',
  descriptionEn:
    'Send GET/POST/PUT/DELETE/PATCH requests to any URL and inspect status, headers and body',

  category: 'devops',
  group: 'dev',
  tags: ['http', 'fetch', 'rest', 'devtools', 'devops'],

  priority: 'P1',
  feasibility: 'C',
  template: 'T2',

  inputs: ['text', 'headers', 'body'],
  outputs: ['text'],
  options: ['method', 'noCors'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
