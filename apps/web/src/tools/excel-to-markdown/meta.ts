import type { ToolMeta } from '@toolbox/catalog'

/**
 * excel-to-markdown —— 全局编号 #539
 * 域：media（媒体 / 文档）｜大组：office｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/catalog 工具规划 #539
 */
export const meta: ToolMeta = {
  id: 'excel-to-markdown',
  slug: 'excel-to-markdown',
  title: 'Excel 转 Markdown',
  description: '将 .xlsx / .xls / .csv 表格转换为 Markdown 表格，可选单个工作表',
  titleEn: 'Excel to Markdown',
  descriptionEn:
    'Convert .xlsx / .xls / .csv spreadsheets to Markdown tables, with sheet selection',

  category: 'media',
  group: 'design',
  tags: ['excel', 'xlsx', 'markdown', 'convert', 'office'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['text'],
  options: ['sheet'],

  deps: ['xlsx'],
  worker: false,
  wasm: false,
  api: false,
}
