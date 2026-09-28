import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-insert —— 全局编号 #530
 * 域：pdf（PDF 生成 / 编辑）｜大组：office｜优先级：P1｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'pdf-insert',
  slug: 'pdf-insert',
  title: 'PDF 插入文字',
  description: '在 PDF 指定页面的左上角插入一行文字，纯本地处理',
  titleEn: 'Insert Text into PDF',
  descriptionEn: 'Insert a line of text at the top-left of a chosen PDF page, processed locally',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'edit', 'annotate', 'text'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['file', 'text', 'page'],
  outputs: ['file'],
  options: [],

  deps: ['pdf-lib'],
  worker: false,
  wasm: false,
  api: false,
}
