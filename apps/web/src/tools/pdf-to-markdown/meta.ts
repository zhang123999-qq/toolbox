import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-to-markdown —— 全局编号 #535
 * 域：pdf（PDF / 文档处理）｜大组：office｜优先级：P1｜可行性：A（纯 JS）｜模板：T2
 * 来源：docs/catalog 工具规划 #535
 */
export const meta: ToolMeta = {
  id: 'pdf-to-markdown',
  slug: 'pdf-to-markdown',
  title: 'PDF 转 Markdown',
  description: '提取 PDF 文本层并转为 Markdown：按字号启发式识别标题，列表与段落保留结构',
  titleEn: 'PDF to Markdown',
  descriptionEn: 'Extract the PDF text layer and convert it to Markdown with heuristic headings',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'markdown', 'text-extract', 'convert'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['text'],
  options: ['detectHeadings', 'pageBreaks'],

  deps: ['pdfjs-dist'],
  worker: false,
  wasm: false,
  api: false,
}
