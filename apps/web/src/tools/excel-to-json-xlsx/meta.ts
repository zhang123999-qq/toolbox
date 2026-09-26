import type { ToolMeta } from '@toolbox/catalog'

/**
 * excel-to-json-xlsx —— 全局编号 #164
 * 域：data-format（数据格式）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 *
 * .xlsx 的 zip/XML 最小解析复用姊妹工具 excel-to-csv 的纯函数（DecompressionStream，零新依赖）。
 */
export const meta: ToolMeta = {
  id: 'excel-to-json-xlsx',
  slug: 'excel-to-json-xlsx',
  title: 'Excel 转 JSON',
  description: '把 XLSX 工作表或 CSV/TSV 转成 JSON（首行可选为字段名）',
  titleEn: 'Excel to JSON',
  descriptionEn:
    'Convert an XLSX sheet or CSV/TSV into JSON, optionally using the first row as keys',

  category: 'data-format',
  group: 'dev',
  tags: ['excel', 'xlsx', 'csv', 'json', 'convert'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['withHeader'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
