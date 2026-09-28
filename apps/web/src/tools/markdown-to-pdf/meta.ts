import type { ToolMeta } from '@toolbox/catalog'

/**
 * markdown-to-pdf —— 全局编号 #507
 * 域：pdf（PDF 生成 / 编辑）｜大组：office｜优先级：P0｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'markdown-to-pdf',
  slug: 'markdown-to-pdf',
  title: 'Markdown 转 PDF',
  description:
    '将 Markdown 文本排版为 PDF：标题分级字号、列表缩进、代码块等宽，自动换行分页，纯本地生成',
  titleEn: 'Markdown to PDF',
  descriptionEn:
    'Render Markdown text into a paginated PDF locally: heading levels, lists and monospaced code blocks',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'markdown', 'export', 'document'],

  priority: 'P0',
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
