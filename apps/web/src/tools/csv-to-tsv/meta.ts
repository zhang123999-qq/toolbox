import type { ToolMeta } from '@toolbox/catalog'

/**
 * csv-to-tsv —— 全局编号 #21
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'csv-to-tsv',
  slug: 'csv-to-tsv',
  title: 'CSV 转 TSV',
  description: 'CSV 与 TSV 互转',
  titleEn: 'CSV to TSV',
  descriptionEn: 'Convert between CSV and TSV',

  category: 'text',
  group: 'dev',
  tags: ['text', 'csv', 'convert'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode'],

  deps: ['papaparse'],
  worker: false,
  wasm: false,
  api: false,
}
