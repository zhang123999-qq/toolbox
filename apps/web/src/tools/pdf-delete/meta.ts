import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-delete —— 全局编号 #485
 * 域：pdf（PDF 文档）｜大组：office｜优先级：P0｜可行性：A｜模板：T2
 * PDF 删页：上传单个 PDF，用 pdfjs-dist 将每页渲染为小缩略图，
 * 列表勾选要删除的页面（支持全选/反选/按范围快速勾选），
 * 点击删除后用 pdf-lib 生成去掉选中页的新 PDF 并下载。
 * 注：pdfjs-dist 仅用于缩略图渲染（非 wasm 核心），沿 #462 先例，
 * worker/wasm/api 全 false，故可行性记为 A。
 */
export const meta: ToolMeta = {
  id: 'pdf-delete',
  slug: 'pdf-delete',
  title: 'PDF 删页',
  description: '删除 PDF 指定页面：缩略图勾选要删除的页，本地生成去掉选中页的新 PDF 下载',
  titleEn: 'PDF Delete Pages',
  descriptionEn:
    'Delete pages from a PDF: check pages to remove by thumbnails, generate a new PDF locally without them',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'delete', 'pages'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['range'],

  deps: ['pdf-lib', 'pdfjs-dist'],
  worker: false,
  wasm: false,
  api: false,
}
