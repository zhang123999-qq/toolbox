import type { ToolMeta } from '@toolbox/catalog'

/**
 * csv-formatter —— 全局编号 #160
 * 域：data-format（数据格式）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'csv-formatter',
  slug: 'csv-formatter',
  title: 'CSV 格式化',
  description: 'CSV 对齐列宽、规范化引号，并校验每行列数是否一致',
  titleEn: 'CSV Formatter',
  descriptionEn: 'Align CSV columns, normalize quoting and validate column counts',

  category: 'data-format',
  group: 'dev',
  tags: ['csv', 'format', 'validate'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode', 'delimiter', 'strict'],

  deps: ['papaparse'],
  worker: false,
  wasm: false,
  api: false,
}
