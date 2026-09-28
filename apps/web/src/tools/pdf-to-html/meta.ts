import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-to-html —— 全局编号 #536
 * 域：pdf（PDF / 文档处理）｜大组：office｜优先级：P1｜可行性：A（纯 JS）｜模板：T3
 * 来源：docs/catalog 工具规划 #536
 */
export const meta: ToolMeta = {
  id: 'pdf-to-html',
  slug: 'pdf-to-html',
  title: 'PDF 转 HTML',
  description: '提取 PDF 文本层并转为结构化 HTML，右侧可切换预览与源码，下载为独立网页',
  titleEn: 'PDF to HTML',
  descriptionEn: 'Extract the PDF text layer into structured HTML with preview and source views',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'html', 'text-extract', 'convert'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['file'],
  outputs: ['text', 'html'],
  options: ['detectHeadings', 'pageBreaks'],

  deps: ['pdfjs-dist'],
  worker: false,
  wasm: false,
  api: false,
}
