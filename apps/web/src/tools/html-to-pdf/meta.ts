import type { ToolMeta } from '@toolbox/catalog'

/**
 * html-to-pdf —— 全局编号 #508
 * 域：pdf（PDF 生成 / 编辑）｜大组：office｜优先级：P1｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'html-to-pdf',
  slug: 'html-to-pdf',
  title: 'HTML 转 PDF',
  description: '从 HTML 中提取标题、段落、列表等文本结构，简化排版为 PDF，纯本地生成',
  titleEn: 'HTML to PDF',
  descriptionEn:
    'Extract headings, paragraphs and lists from HTML and render a simplified PDF locally',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'html', 'export', 'document'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['file'],
  options: ['fontSize', 'margin'],

  deps: ['pdf-lib'],
  worker: false,
  wasm: false,
  api: false,
}
