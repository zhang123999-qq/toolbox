import type { ToolMeta } from '@toolbox/catalog'

/**
 * markdown-to-html —— 全局编号 #18
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'markdown-to-html',
  slug: 'markdown-to-html',
  title: 'Markdown 转 HTML',
  description: '生成完整 HTML 文档',
  titleEn: 'Markdown to HTML',
  descriptionEn: 'Generate a complete HTML document',

  category: 'text',
  group: 'dev',
  tags: ['text', 'markdown', 'html'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode'],

  deps: ['markdown-it'],
  worker: false,
  wasm: false,
  api: false,
}
