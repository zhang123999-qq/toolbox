import type { ToolMeta } from '@toolbox/catalog'

/**
 * excel-view —— 全局编号 #502
 * 域：media（媒体 / 文档）｜大组：office｜优先级：P0｜可行性：A｜模板：T3
 * 来源：docs/catalog 工具规划 #502
 */
export const meta: ToolMeta = {
  id: 'excel-view',
  slug: 'excel-view',
  title: 'Excel 表格预览',
  description: '上传 .xlsx / .xls / .csv 文件，在浏览器本地渲染为表格，多工作表可切换',
  titleEn: 'Excel Viewer',
  descriptionEn:
    'Preview .xlsx / .xls / .csv files as tables locally in the browser, with sheet switching',

  category: 'media',
  group: 'design',
  tags: ['excel', 'xlsx', 'preview', 'table', 'office'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T3',

  inputs: ['file'],
  outputs: ['table'],
  options: [],

  deps: ['xlsx'],
  worker: false,
  wasm: false,
  api: false,
}
