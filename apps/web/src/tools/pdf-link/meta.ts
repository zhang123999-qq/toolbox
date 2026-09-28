import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-link —— 全局编号 #532
 * 域：pdf（PDF 生成 / 编辑）｜大组：office｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'pdf-link',
  slug: 'pdf-link',
  title: 'PDF 加超链接',
  description: '在 PDF 指定页面插入一段可点击的蓝色链接文字，纯本地处理',
  titleEn: 'Add Hyperlink to PDF',
  descriptionEn: 'Insert a clickable blue hyperlink text on a chosen PDF page, processed locally',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'edit', 'link', 'hyperlink'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['file', 'text', 'url', 'page'],
  outputs: ['file'],
  options: [],

  deps: ['pdf-lib'],
  worker: false,
  wasm: false,
  api: false,
}
