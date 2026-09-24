import type { ToolMeta } from '@toolbox/catalog'

/**
 * query-string —— 全局编号 #178
 * 域：data-format（数据格式）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'query-string',
  slug: 'query-string',
  title: 'Query String 解析',
  description: '查询串与对象互转，支持重复键与键名排序',
  titleEn: 'Query String',
  descriptionEn: 'Convert query strings to objects and back, with repeated keys and sorting',

  category: 'data-format',
  group: 'dev',
  tags: ['query', 'querystring', 'url'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode', 'sortKeys'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
