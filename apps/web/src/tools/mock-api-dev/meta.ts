import type { ToolMeta } from '@toolbox/catalog'

/**
 * mock-api-dev —— 全局编号 #214
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'mock-api-dev',
  slug: 'mock-api-dev',
  title: 'Mock API',
  description: '按字段定义生成 mock JSON 数据，以及 Express / json-server 启动片段',
  titleEn: 'Mock API Generator',
  descriptionEn:
    'Generate mock JSON data plus an Express / json-server snippet from field definitions',

  category: 'devops',
  group: 'dev',
  tags: ['mock', 'api', 'json', 'devops'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['count', 'target'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
