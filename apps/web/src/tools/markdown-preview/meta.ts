import type { ToolMeta } from '@toolbox/catalog'

/**
 * markdown-preview —— 全局编号 #17
 * 域：text（文本与内容）｜大组：dev｜优先级：P0｜可行性：A｜模板：T3
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'markdown-preview',
  slug: 'markdown-preview',
  title: 'Markdown 预览',
  description: '实时渲染 Markdown，支持 GFM',
  titleEn: 'Markdown Preview',
  descriptionEn: 'Render Markdown live, GFM supported',

  category: 'text',
  group: 'dev',
  tags: ['text', 'markdown', 'preview'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['breaks'],

  deps: ['markdown-it'],
  worker: false,
  wasm: false,
  api: false,
}
