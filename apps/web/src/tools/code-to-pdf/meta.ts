import type { ToolMeta } from '@toolbox/catalog'

/**
 * code-to-pdf —— 全局编号 #510
 * 域：pdf（PDF 生成 / 编辑）｜大组：office｜优先级：P1｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'code-to-pdf',
  slug: 'code-to-pdf',
  title: '代码转 PDF',
  description: '将代码排版为等宽字体 PDF：行号可开关，自动换行分页，纯本地生成',
  titleEn: 'Code to PDF',
  descriptionEn: 'Render source code into a monospaced PDF locally with optional line numbers',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'code', 'export', 'document'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['file'],
  options: ['fontSize', 'lineNumbers', 'margin'],

  deps: ['pdf-lib'],
  worker: false,
  wasm: false,
  api: false,
}
