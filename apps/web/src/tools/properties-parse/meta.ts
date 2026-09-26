import type { ToolMeta } from '@toolbox/catalog'

/**
 * properties-parse —— 全局编号 #157
 * 域：data-format（数据格式）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 * 说明：纯 JS 自实现，deps 为空，支持范围见 README「限制」。
 */
export const meta: ToolMeta = {
  id: 'properties-parse',
  slug: 'properties-parse',
  title: 'Properties 解析',
  description: 'Java Properties 与 JSON 双向互转，还原 \\uXXXX 转义',
  titleEn: 'Properties Parser',
  descriptionEn: 'Convert Java Properties and JSON in both directions, decoding \\uXXXX escapes',

  category: 'data-format',
  group: 'dev',
  tags: ['properties', 'java', 'json'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['direction', 'encoding', 'indent'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
