import type { ToolMeta } from '@toolbox/catalog'

/**
 * excel-to-csv —— 全局编号 #163
 * 域：data-format（数据格式）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 *
 * 降级说明：规划依赖 xlsx（SheetJS），本项目禁止新增 npm 依赖，故不装库。
 * 文本表格（.csv/.tsv/.txt）直接解析；.xlsx 用浏览器原生 DecompressionStream
 * 做最小 zip 解析，只取 xl/sharedStrings.xml 与 xl/worksheets/sheet1.xml，详见 README。
 */
export const meta: ToolMeta = {
  id: 'excel-to-csv',
  slug: 'excel-to-csv',
  title: 'Excel 转 CSV',
  description: '把表格文件转成 CSV：支持文本表格，也支持最小解析 .xlsx 的第一张工作表',
  titleEn: 'Excel to CSV',
  descriptionEn: 'Convert a spreadsheet to CSV: text tables, or the first sheet of a minimal .xlsx',

  category: 'data-format',
  group: 'dev',
  tags: ['excel', 'xlsx', 'csv'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text', 'file'],
  outputs: ['text'],
  options: ['delimiter', 'format'],

  deps: ['papaparse'],
  worker: false,
  wasm: false,
  api: false,
}
