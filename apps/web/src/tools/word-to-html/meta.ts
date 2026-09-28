import type { ToolMeta } from '@toolbox/catalog'

/**
 * word-to-html —— 全局编号 #504
 * 域：media（媒体 / 文档）｜大组：office｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/catalog 工具规划 #504
 */
export const meta: ToolMeta = {
  id: 'word-to-html',
  slug: 'word-to-html',
  title: 'Word 转 HTML',
  description: '将 .docx 文档转换为 HTML 代码，保留标题、段落、加粗、斜体、列表、表格与链接',
  titleEn: 'Word to HTML',
  descriptionEn:
    'Convert .docx documents to HTML, preserving headings, paragraphs, bold, lists, tables and links',

  category: 'media',
  group: 'design',
  tags: ['word', 'docx', 'html', 'convert', 'office'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['text'],
  options: ['imageMode'],

  deps: ['mammoth'],
  worker: false,
  wasm: false,
  api: false,
}
