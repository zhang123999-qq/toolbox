import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-ocr —— 全局编号 #500
 * 域：pdf（PDF / 文档处理）｜大组：office｜优先级：P0｜可行性：B（WASM）｜模板：T3
 * 来源：docs/catalog 工具规划 #500
 */
export const meta: ToolMeta = {
  id: 'pdf-ocr',
  slug: 'pdf-ocr',
  title: 'PDF 文字识别（OCR）',
  description:
    '上传 PDF，逐页渲染为图像后用 tesseract.js 做 OCR 识别，输出可复制的文本，带识别进度条',
  titleEn: 'PDF OCR',
  descriptionEn:
    'Upload a PDF, render each page to an image and run OCR with tesseract.js, with a progress bar',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'ocr', 'tesseract', 'scan', 'text-extract'],

  priority: 'P0',
  feasibility: 'B',
  template: 'T3',

  inputs: ['file'],
  outputs: ['text'],
  options: ['language'],

  deps: ['tesseract.js', 'pdfjs-dist'],
  worker: false,
  wasm: true,
  api: false,
}
