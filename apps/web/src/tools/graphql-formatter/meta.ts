import type { ToolMeta } from '@toolbox/catalog'

/**
 * graphql-formatter —— 全局编号 #170
 * 域：data-format（数据格式）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'graphql-formatter',
  slug: 'graphql-formatter',
  title: 'GraphQL 格式化',
  description: '美化 GraphQL 查询与 SDL Schema，统一缩进与换行',
  titleEn: 'GraphQL Formatter',
  descriptionEn: 'Pretty-print GraphQL queries and SDL with consistent indentation',

  category: 'data-format',
  group: 'dev',
  tags: ['graphql', 'formatter', 'prettify'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['indent'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
