import type { ToolMeta } from '@toolbox/catalog'

/**
 * curl-to-code —— 全局编号 #210
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 *
 * 纯手写 cURL 解析器，不依赖 curlconverter。
 */
export const meta: ToolMeta = {
  id: 'curl-to-code',
  slug: 'curl-to-code',
  title: 'cURL 转代码',
  description: '把一条 cURL 命令转成 fetch / Node.js / Python / Java / Go 请求代码',
  titleEn: 'cURL to Code',
  descriptionEn: 'Convert a cURL command into fetch / Node / Python / Java / Go code',

  category: 'devops',
  group: 'dev',
  tags: ['curl', 'codegen', 'http', 'devops'],

  priority: 'P0',
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
