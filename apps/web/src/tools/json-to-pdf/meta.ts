import type { ToolMeta } from '@toolbox/catalog'

/**
 * json-to-pdf —— 全局编号 #511
 * 域：pdf（PDF 生成 / 编辑）｜大组：office｜优先级：P1｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'json-to-pdf',
  slug: 'json-to-pdf',
  title: 'JSON 转 PDF',
  description: '将 JSON 格式化打印为等宽 PDF：2 空格缩进，自动换行分页，纯本地生成',
  titleEn: 'JSON to PDF',
  descriptionEn: 'Pretty-print JSON into a monospaced paginated PDF locally',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'json', 'export', 'document'],

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
