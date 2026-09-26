import type { ToolMeta } from '@toolbox/catalog'

/**
 * json-to-csv —— 全局编号 #146
 * 域：data-format（数据格式）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'json-to-csv',
  slug: 'json-to-csv',
  title: 'JSON 转 CSV',
  description: '把对象数组（或单对象）扁平化为 CSV / TSV',
  titleEn: 'JSON to CSV',
  descriptionEn: 'Flatten an array of objects (or a single object) into CSV / TSV',

  category: 'data-format',
  group: 'dev',
  tags: ['json', 'csv', 'convert'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['delimiter', 'withHeader', 'quote', 'style'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
