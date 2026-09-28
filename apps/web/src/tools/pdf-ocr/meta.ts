import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-ocr —— 全局编号 #500
 * 域：pdf（PDF / Office / 文档）｜大组：office｜优先级：P2｜可行性：B｜模板：T2
 * 来源：docs/tools/09-PDF-Office.md
 * PDF OCR：pdfjs-dist 逐页渲染为图片（144 DPI）→ tesseract.js（WASM）
 * 在浏览器本地逐页识别中英文文字 → 合并为按页标注的可复制文本，可下载 .txt。
 * 注意：tesseract.js 首次使用时从 CDN 下载识别引擎与语言包（PDF 本身不上传），
 * 因此不是完全离线工具，页面内有显著的隐私说明（pdfOcr.cdnNotice）。
 * 与 pdf-to-text（#493）不同：本工具识别的是扫描版/图片型 PDF 的像素文字，
 * pdf-to-text 提取的是文本型 PDF 内嵌的文本层。
 */
export const meta: ToolMeta = {
  id: 'pdf-ocr',
  slug: 'pdf-ocr',
  title: 'PDF OCR',
  description:
    '上传 PDF，逐页渲染后本地 OCR 识别中英文文字，合并为按页标注的可复制文本（引擎与语言包从 CDN 下载，PDF 不上传）',
  titleEn: 'PDF OCR',
  descriptionEn:
    'Upload a PDF to recognize Chinese/English text page by page locally, merged into copyable text with page markers (engine and language packs are downloaded from a CDN; the PDF is never uploaded)',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'ocr', 'text', 'tesseract'],

  priority: 'P2',
  feasibility: 'B',
  template: 'T2',

  inputs: ['file'],
  outputs: ['text', 'file'],
  options: ['languages'],

  deps: ['pdfjs-dist', 'tesseract.js'],
  worker: true,
  wasm: true,
  api: false,
}
