import type { ToolMeta } from '@toolbox/catalog'

/**
 * csv-to-excel —— 全局编号 #162
 * 域：data-format（数据格式）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 *
 * 降级说明：规划依赖 xlsx（SheetJS），但本项目禁止新增 npm 依赖，
 * 故输出改为 Excel 可直接打开的 SpreadsheetML 2003 XML（.xml），详见 README。
 */
export const meta: ToolMeta = {
  id: 'csv-to-excel',
  slug: 'csv-to-excel',
  title: 'CSV 转 Excel',
  description: '把 CSV 转成 Excel 可直接打开的 SpreadsheetML 表格（也可输出 CSV / TSV）',
  titleEn: 'CSV to Excel',
  descriptionEn: 'Convert CSV to a SpreadsheetML sheet Excel can open (or to CSV / TSV)',

  category: 'data-format',
  group: 'dev',
  tags: ['csv', 'excel', 'convert'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['format', 'header', 'delimiter'],

  deps: ['papaparse'],
  worker: false,
  wasm: false,
  api: false,
}
