import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-to-text —— 全局编号 #493
 * 域：pdf（PDF / Office / 文档）｜大组：office｜优先级：P1｜可行性：A｜模板：T2
 * PDF 提取文本：pdfjs-dist 逐页 getTextContent() 提取文本，
 * 用 item.hasEOL 与 y 坐标分行保留基本排版，页与页之间用分页分隔符（换页符）；
 * 结果可预览、可复制、可下载 .txt；大文件逐页进度。
 * 注：文档原标注可行性 B（pdfjs），但本实现为纯 JS（pdfjs-dist 非 wasm 核心），
 * worker/wasm/api 全 false，故记为 A。
 * 与 pdf-to-markdown（#535）不同：本工具输出纯文本，不做 Markdown 结构化。
 */
export const meta: ToolMeta = {
  id: 'pdf-to-text',
  slug: 'pdf-to-text',
  title: 'PDF 提取文本',
  description:
    '逐页提取 PDF 文本：保留基本排版，页间以分页符分隔，可预览、复制、下载 .txt，全程本地不上传',
  titleEn: 'PDF to Text',
  descriptionEn:
    'Extract text from PDF page by page: basic layout kept, form-feed page breaks, preview, copy, download .txt, all local',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'text', 'extract', 'txt'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['text', 'file'],
  options: [],

  deps: ['pdfjs-dist'],
  worker: false,
  wasm: false,
  api: false,
}
