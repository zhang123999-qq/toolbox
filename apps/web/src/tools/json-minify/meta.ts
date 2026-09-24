import type { ToolMeta } from '@toolbox/catalog'

/**
 * json-minify —— 全局编号 #133
 * 域：data-format（数据格式）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'json-minify',
  slug: 'json-minify',
  title: 'JSON 压缩',
  description: '去除 JSON 中的空白与换行，压成单行以减小体积',
  titleEn: 'JSON Minify',
  descriptionEn: 'Strip whitespace and newlines from JSON into a single line',

  category: 'data-format',
  group: 'dev',
  tags: ['json', 'minify', 'compress'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['sortKeys'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
