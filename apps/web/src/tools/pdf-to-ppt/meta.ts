import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-to-ppt —— 全局编号 #497
 * 域：pdf（PDF / Office / 文档）｜大组：office｜优先级：P3｜可行性：A｜模板：T2
 * PDF 转 PPT：pdfjs-dist 逐页提取带坐标文本 → 按基线分组为文本行 →
 * pptxgenjs 生成 .pptx，每页 PDF 对应一张幻灯片，文本按原坐标放为文本框，
 * 全程本地不上传。
 * 注：文档原标注可行性 B（pdfjs），但本实现为纯 JS
 * （pdfjs-dist 非 wasm 核心、pptxgenjs 纯 JS 无 WASM），worker/wasm/api 全 false，
 * 故记为 A（与 #495 pdf-to-word 同例）。
 * 保真度有限：纯文本坐标提取，不还原图片/表格/字体样式（README 有声明）。
 */
export const meta: ToolMeta = {
  id: 'pdf-to-ppt',
  slug: 'pdf-to-ppt',
  title: 'PDF 转 PPT',
  description: '将 PDF 逐页转为 PPT（.pptx）：每页一张幻灯片，文本按原坐标放置，全程本地不上传',
  titleEn: 'PDF to PPT',
  descriptionEn:
    'Convert PDF to PPT (.pptx): one slide per page, text placed at original coordinates, all local, no upload',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'ppt', 'pptx', 'convert', 'slides'],

  priority: 'P3',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: [],

  deps: ['pdfjs-dist', 'pptxgenjs'],
  worker: false,
  wasm: false,
  api: false,
}
