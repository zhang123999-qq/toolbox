import type { ToolMeta } from '@toolbox/catalog'

/**
 * postman-to-code —— 全局编号 #212
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'postman-to-code',
  slug: 'postman-to-code',
  title: 'Postman 转代码',
  description: '解析 Postman Collection v2.1，列出每个请求并生成 fetch / Python / curl 代码',
  titleEn: 'Postman Collection to Code',
  descriptionEn: 'Parse a Postman v2.1 collection and emit per-request code snippets',

  category: 'devops',
  group: 'dev',
  tags: ['postman', 'collection', 'codegen', 'http', 'devops'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['language'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
