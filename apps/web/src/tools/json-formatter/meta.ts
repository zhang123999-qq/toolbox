import type { ToolMeta } from '@toolbox/catalog'

/**
 * json-formatter —— 全局编号 #131
 * 域：data-format（数据格式）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'json-formatter',
  slug: 'json-formatter',
  title: 'JSON 格式化',
  description: '格式化、压缩、校验 JSON，支持树形查看',
  titleEn: 'JSON Formatter',
  descriptionEn: 'Format, minify and validate JSON, with a tree view',

  category: 'data-format',
  group: 'dev',
  tags: ['json', 'format', 'validate'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['indent', 'sortKeys'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
