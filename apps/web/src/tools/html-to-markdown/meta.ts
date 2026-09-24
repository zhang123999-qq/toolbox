import type { ToolMeta } from '@toolbox/catalog'

/**
 * html-to-markdown —— 全局编号 #19
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'html-to-markdown',
  slug: 'html-to-markdown',
  title: 'HTML 转 Markdown',
  description: '网页/HTML 转 Markdown',
  titleEn: 'HTML to Markdown',
  descriptionEn: 'Convert HTML or a web page fragment to Markdown',

  category: 'text',
  group: 'dev',
  tags: ['text', 'html', 'markdown'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: ['turndown'],
  worker: false,
  wasm: false,
  api: false,
}
