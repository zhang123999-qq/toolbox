import type { ToolMeta } from '@toolbox/catalog'

/**
 * graphql-to-code —— 全局编号 #172
 * 域：data-format（数据格式）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'graphql-to-code',
  slug: 'graphql-to-code',
  title: 'GraphQL 转代码',
  description: '把 GraphQL 查询文档转成 TypeScript 类型（变量类型 + 结果类型）',
  titleEn: 'GraphQL to Code',
  descriptionEn: 'Turn a GraphQL query document into TypeScript types (variables + result)',

  category: 'data-format',
  group: 'dev',
  tags: ['graphql', 'typescript', 'codegen'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode', 'strict'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
