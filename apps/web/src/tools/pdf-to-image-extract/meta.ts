import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-to-image-extract —— 全局编号 #494
 * 域：pdf（PDF / 文档）｜大组：office｜优先级：P1｜可行性：A｜模板：T2
 * PDF 提取图片：解析每页的 operatorList，找出 paintImageXObject /
 * paintInlineImageXObject 操作，从 page.objs 取出内嵌图片对象
 * （{width, height, kind, data}），归一化为 RGBA 后画到 canvas 导出
 * PNG/JPEG，逐张预览与下载。
 * 注：文档原标注可行性 B（pdfjs），但本实现为纯 JS（pdfjs-dist 非 wasm 核心），
 * worker/wasm/api 全 false，故记为 A（与 #462 同例）。
 * 与 pdf-to-image（#462）不同：本工具提取 PDF 内嵌的图片对象（原图数据），
 * #462 是把整页渲染为位图。
 */
export const meta: ToolMeta = {
  id: 'pdf-to-image-extract',
  slug: 'pdf-to-image-extract',
  title: 'PDF 提取图片',
  description: '提取 PDF 内嵌的图片对象：逐张预览、下载为 PNG/JPEG，全程本地不上传',
  titleEn: 'Extract Images from PDF',
  descriptionEn:
    'Extract embedded images from a PDF: preview each one, download as PNG/JPEG, no upload',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'image', 'extract', 'png'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['format'],

  deps: ['pdfjs-dist'],
  worker: false,
  wasm: false,
  api: false,
}
