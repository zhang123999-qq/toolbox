import type { ToolMeta } from '@toolbox/catalog'

/**
 * word-to-markdown —— 全局编号 #538
 * 域：media（媒体 / 文档）｜大组：office｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/catalog 工具规划 #538
 */
export const meta: ToolMeta = {
  id: 'word-to-markdown',
  slug: 'word-to-markdown',
  title: 'Word 转 Markdown',
  description: '将 .docx 文档转换为 Markdown 文本，保留标题层级、加粗、列表、表格与链接',
  titleEn: 'Word to Markdown',
  descriptionEn:
    'Convert .docx documents to Markdown, preserving heading levels, bold, lists, tables and links',

  category: 'media',
  group: 'design',
  tags: ['word', 'docx', 'markdown', 'convert', 'office'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['text'],
  options: [],

  deps: ['mammoth'],
  worker: false,
  wasm: false,
  api: false,
}
