import type { ToolMeta } from '@toolbox/catalog'

/**
 * graphql-schema —— 全局编号 #171
 * 域：data-format（数据格式）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'graphql-schema',
  slug: 'graphql-schema',
  title: 'GraphQL Schema 预览',
  description: '解析 GraphQL SDL，汇总类型 / 枚举 / 输入 / 联合，生成结构化字段清单',
  titleEn: 'GraphQL Schema Outline',
  descriptionEn: 'Summarize a GraphQL SDL into types, enums, inputs and unions with their fields',

  category: 'data-format',
  group: 'dev',
  tags: ['graphql', 'schema', 'sdl'],

  priority: 'P2',
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
