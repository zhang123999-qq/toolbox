import type { ToolMeta } from '@toolbox/catalog'

/**
 * graphql-test —— 全局编号 #752
 * 域：devops（自动化 / API 测试）｜大组：dev｜优先级：P2｜可行性：D｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'graphql-test',
  slug: 'graphql-test',
  title: 'GraphQL 测试',
  description: '向 GraphQL 端点发送查询（含标准内省查询），data/errors 分开展示',
  titleEn: 'GraphQL Tester',
  descriptionEn:
    'Send queries to a GraphQL endpoint (with standard introspection query), showing data and errors separately',

  category: 'devops',
  group: 'dev',
  tags: ['graphql', 'api', 'test', 'introspection'],

  priority: 'P2',
  feasibility: 'D',
  template: 'T3',

  inputs: ['text', 'query', 'variables', 'headers'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}
