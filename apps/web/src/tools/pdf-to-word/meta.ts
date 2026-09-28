import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-to-word —— 全局编号 #495
 * 域：pdf（PDF / Office / 文档）｜大组：office｜优先级：P2｜可行性：A｜模板：T2
 * PDF 转 Word：pdfjs-dist 逐页提取文本 → docx 库生成 .docx，
 * 每页文本生成段落、页间加分页符，全程本地不上传。
 * 注：文档原标注可行性 B（pdfjs），但本实现为纯 JS
 * （pdfjs-dist 非 wasm 核心、docx 纯 JS），worker/wasm/api 全 false，故记为 A。
 * 排版保真度有限：纯文本流提取，不还原复杂版式/表格/图片（README 有声明）。
 */
export const meta: ToolMeta = {
  id: 'pdf-to-word',
  slug: 'pdf-to-word',
  title: 'PDF 转 Word',
  description: '将 PDF 逐页提取文本并生成 Word（.docx）：每页文本成段、页间分页，全程本地不上传',
  titleEn: 'PDF to Word',
  descriptionEn:
    'Convert PDF to Word (.docx): extract text page by page into paragraphs with page breaks, all local, no upload',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'word', 'docx', 'convert', 'text'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: [],

  deps: ['pdfjs-dist', 'docx'],
  worker: false,
  wasm: false,
  api: false,
}
