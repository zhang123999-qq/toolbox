import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-page-number —— 全局编号 #488
 * 域：pdf（PDF / 办公）｜大组：office｜优先级：P1｜可行性：A｜模板：T2
 * PDF 页码：为每页添加页码（pdf-lib 本地绘制 Helvetica 数字），
 * 6 档位置 × 3 种纯 ASCII 样式，可设起始编号、起始页、字号、边距。
 */
export const meta: ToolMeta = {
  id: 'pdf-page-number',
  slug: 'pdf-page-number',
  title: 'PDF 页码',
  description: '为 PDF 每页添加页码：6 档位置、3 种样式，可设起始编号与起始页，全程不上传',
  titleEn: 'PDF Page Number',
  descriptionEn:
    'Add page numbers to every PDF page: 6 positions, 3 styles, custom start number and start page, no upload',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'page-number', 'header', 'footer'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['position', 'style', 'startNumber', 'fromPage', 'fontSize', 'margin'],

  deps: ['pdf-lib'],
  worker: false,
  wasm: false,
  api: false,
}
