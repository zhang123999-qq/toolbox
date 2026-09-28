import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-attach —— 全局编号 #534
 * 域：pdf（PDF 生成 / 编辑）｜大组：office｜优先级：P2｜可行性：A｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'pdf-attach',
  slug: 'pdf-attach',
  title: 'PDF 加附件',
  description: '把一段文本作为文件附件嵌入 PDF（EmbeddedFiles），纯本地处理',
  titleEn: 'Attach File to PDF',
  descriptionEn: 'Embed a text file as a PDF attachment (EmbeddedFiles), processed locally',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'edit', 'attachment', 'embed'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T3',

  inputs: ['file', 'text', 'filename'],
  outputs: ['file'],
  options: [],

  deps: ['pdf-lib'],
  worker: false,
  wasm: false,
  api: false,
}
