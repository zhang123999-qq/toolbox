import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-extract —— 全局编号 #529
 * 域：pdf（PDF 生成 / 编辑）｜大组：office｜优先级：P0｜可行性：A｜模板：T2
 *
 * 偏差说明：本工具是 14 个工具中唯一不使用 pdf-lib 的，
 * 文本提取改用 pdfjs-dist（deps 字段如实声明）。
 */
export const meta: ToolMeta = {
  id: 'pdf-extract',
  slug: 'pdf-extract',
  title: 'PDF 文本提取',
  description: '上传 PDF，按页提取全部文本，纯本地解析',
  titleEn: 'PDF Text Extractor',
  descriptionEn: 'Upload a PDF and extract all text page by page, parsed locally',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'extract', 'text', 'ocr-free'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['text'],
  options: [],

  deps: ['pdfjs-dist'],
  worker: false,
  wasm: false,
  api: false,
}
