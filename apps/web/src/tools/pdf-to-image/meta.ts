import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-to-image —— 全局编号 #462
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * PDF 转图片：按 DPI 将 PDF 页面渲染为 PNG/JPEG 位图，支持页码选择，逐页下载。
 * 注：文档原标注可行性 B（pdfjs），但本实现为纯 JS（pdfjs-dist 非 wasm 核心），
 * worker/wasm/api 全 false，故记为 A。
 * 与 pdf-to-image-extract（#494）不同：本工具是整页渲染为位图，
 * #494 是提取 PDF 内嵌的图片对象。
 */
export const meta: ToolMeta = {
  id: 'pdf-to-image',
  slug: 'pdf-to-image',
  title: 'PDF 转图片',
  description: '按 DPI 将 PDF 页面渲染为 PNG/JPEG 图片：可选页面、全程本地不上传',
  titleEn: 'PDF to Image',
  descriptionEn:
    'Render PDF pages to PNG/JPEG images at chosen DPI: page selection, all local, no upload',

  category: 'image',
  group: 'design',
  tags: ['pdf', 'image', 'render', 'convert'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['dpi', 'pages', 'format'],

  deps: ['pdfjs-dist'],
  worker: false,
  wasm: false,
  api: false,
}
