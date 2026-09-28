import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-compare —— 全局编号 #498
 * 域：pdf（PDF / 办公）｜大组：office｜优先级：P2｜可行性：A｜模板：T2
 * PDF 对比：上传两份 PDF，逐页渲染为位图（固定 1.2 倍缩放）后做像素级
 * 差异比对，输出差异页列表（页码、差异像素占比）、选中页的并排/叠加
 * 对比视图与差异区域高亮（红色半透明）。页数不同时明确提示，仅比对
 * min(页数) 页，超出页单独列出。纯 Canvas + pdfjs-dist，全程本地不上传。
 * 与 pdf-to-image（#462）的区别：#462 是把 PDF 页面渲染导出为图片文件；
 * 本工具做两份 PDF 的逐页像素级差异分析，不导出页面图片。
 */
export const meta: ToolMeta = {
  id: 'pdf-compare',
  slug: 'pdf-compare',
  title: 'PDF 对比',
  description: '两份 PDF 逐页像素级对比：差异页列表、并排/叠加视图、差异区域高亮，全程不上传',
  titleEn: 'PDF Compare',
  descriptionEn:
    'Pixel-level comparison of two PDFs page by page: diff page list, side-by-side/overlay views, diff highlighting, no upload',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'compare', 'diff'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['image'],
  options: ['threshold', 'view'],

  deps: ['pdfjs-dist'],
  worker: false,
  wasm: false,
  api: false,
}
