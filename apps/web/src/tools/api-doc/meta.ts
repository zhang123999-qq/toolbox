import type { ToolMeta } from '@toolbox/catalog'

/**
 * api-doc —— 全局编号 #756
 * 域：devops（自动化 / API 测试）｜大组：dev｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'api-doc',
  slug: 'api-doc',
  title: 'API 文档生成',
  description: '把结构化接口定义批量生成 Markdown API 文档（含目录、参数表与示例）',
  titleEn: 'API Doc Generator',
  descriptionEn:
    'Generate Markdown API documentation in batch from structured API definitions, with TOC and parameter tables',

  category: 'devops',
  group: 'dev',
  tags: ['api', 'doc', 'markdown', 'openapi'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
