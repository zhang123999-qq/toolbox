import type { ToolMeta } from '@toolbox/catalog'

/**
 * openapi-lint —— 全局编号 #745
 * 域：devops（自动化 / API 测试）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'openapi-lint',
  slug: 'openapi-lint',
  title: 'OpenAPI 规范检查',
  description: '对 OpenAPI 3.x 规范做 lint 检查并打分（规范检查，非预览）',
  titleEn: 'OpenAPI Spec Linter',
  descriptionEn:
    'Lint an OpenAPI 3.x specification and score it (spec checking, not preview)',

  category: 'devops',
  group: 'dev',
  tags: ['openapi', 'lint', 'api', 'devtools'],

  priority: 'P1',
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
