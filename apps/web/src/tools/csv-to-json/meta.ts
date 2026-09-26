import type { ToolMeta } from '@toolbox/catalog'

/**
 * csv-to-json —— 全局编号 #161
 * 域：data-format（数据格式）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'csv-to-json',
  slug: 'csv-to-json',
  title: 'CSV 转 JSON',
  description: '把 CSV 转成 JSON 数组，首行为表头，自动推断数字与布尔',
  titleEn: 'CSV to JSON',
  descriptionEn: 'Convert CSV to a JSON array with header row and type inference',

  category: 'data-format',
  group: 'dev',
  tags: ['csv', 'json', 'convert'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['header', 'delimiter', 'indent'],

  deps: ['papaparse'],
  worker: false,
  wasm: false,
  api: false,
}
