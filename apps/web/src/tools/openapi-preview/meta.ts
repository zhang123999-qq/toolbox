import type { ToolMeta } from '@toolbox/catalog'

/**
 * openapi-preview —— 全局编号 #211
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 *
 * 纯本地解析 OpenAPI 3.x JSON，不依赖 swagger-parser。
 */
export const meta: ToolMeta = {
  id: 'openapi-preview',
  slug: 'openapi-preview',
  title: 'OpenAPI 预览',
  description: '粘贴 OpenAPI 3.x JSON，结构化预览路径、方法、参数、请求体与响应',
  titleEn: 'OpenAPI Preview',
  descriptionEn: 'Paste an OpenAPI 3.x JSON to preview paths, methods, params and responses',

  category: 'devops',
  group: 'dev',
  tags: ['openapi', 'swagger', 'rest', 'api', 'devops'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
