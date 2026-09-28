import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-bookmark —— 全局编号 #533
 * 域：pdf（PDF 生成 / 编辑）｜大组：office｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'pdf-bookmark',
  slug: 'pdf-bookmark',
  title: 'PDF 加书签',
  description: '按「标题,页码」列表给 PDF 添加书签目录（Outlines），纯本地处理',
  titleEn: 'Add Bookmarks to PDF',
  descriptionEn: 'Add a bookmark outline to a PDF from a title-page list, processed locally',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'edit', 'bookmark', 'outline'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['file', 'text'],
  outputs: ['file'],
  options: [],

  deps: ['pdf-lib'],
  worker: false,
  wasm: false,
  api: false,
}
