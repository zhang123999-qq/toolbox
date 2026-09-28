import type { ToolMeta } from '@toolbox/catalog'

/**
 * text-to-pdf —— 全局编号 #509
 * 域：pdf（PDF 生成 / 编辑）｜大组：office｜优先级：P1｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'text-to-pdf',
  slug: 'text-to-pdf',
  title: '纯文本转 PDF',
  description: '将纯文本排版为 PDF：字号与页边距可调，自动换行分页，纯本地生成',
  titleEn: 'Text to PDF',
  descriptionEn:
    'Render plain text into a paginated PDF locally with adjustable font size and margins',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'text', 'export', 'document'],

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
