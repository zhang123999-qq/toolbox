import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-to-excel —— 全局编号 #496
 * 域：pdf（PDF / Office / 文档）｜大组：office｜优先级：P3｜可行性：A｜模板：T2
 * PDF 转 Excel：pdfjs-dist 逐页提取带坐标文本 → 按 Y 分组为行、按 X 间隙分列 →
 * xlsx 库生成 .xlsx（每页可合并为一张表或每页一张工作表），全程本地不上传。
 * 注：文档原标注可行性 B，但本实现为纯 JS
 * （pdfjs-dist 非 wasm 核心、xlsx 纯 JS），worker/wasm/api 全 false，故记为 A。
 * 排版保真度有限：启发式分行分列，不还原样式/公式/图片/合并单元格（README 有声明）。
 */
export const meta: ToolMeta = {
  id: 'pdf-to-excel',
  slug: 'pdf-to-excel',
  title: 'PDF 转 Excel',
  description:
    '将 PDF 文本按位置重建为表格并导出 Excel（.xlsx）：合并为一张表或每页一张工作表，全程本地不上传',
  titleEn: 'PDF to Excel',
  descriptionEn:
    'Convert PDF text into spreadsheet tables (.xlsx) by position: merge into one sheet or one sheet per page, all local, no upload',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'excel', 'xlsx', 'convert', 'table'],

  priority: 'P3',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['sheetMode'],

  deps: ['pdfjs-dist', 'xlsx'],
  worker: false,
  wasm: false,
  api: false,
}
