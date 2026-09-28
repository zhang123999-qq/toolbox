import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-to-csv —— 全局编号 #537
 * 域：pdf（PDF / 文档处理）｜大组：office｜优先级：P1｜可行性：A（纯 JS）｜模板：T2
 * 来源：docs/catalog 工具规划 #537
 */
export const meta: ToolMeta = {
  id: 'pdf-to-csv',
  slug: 'pdf-to-csv',
  title: 'PDF 转 CSV',
  description: '提取 PDF 文本并按行列启发式转为 CSV：自动识别列位置，CSV 转义规则完备',
  titleEn: 'PDF to CSV',
  descriptionEn:
    'Extract PDF text into CSV with heuristic row/column detection and proper escaping',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'csv', 'text-extract', 'convert', 'table'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['text'],
  options: ['delimiter'],

  deps: ['pdfjs-dist'],
  worker: false,
  wasm: false,
  api: false,
}
