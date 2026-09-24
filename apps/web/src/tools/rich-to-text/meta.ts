import type { ToolMeta } from '@toolbox/catalog'

/**
 * rich-to-text —— 全局编号 #20
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'rich-to-text',
  slug: 'rich-to-text',
  title: '富文本转纯文本',
  description: '去除 HTML 标签保留文本',
  titleEn: 'Rich to Text',
  descriptionEn: 'Strip HTML tags and keep the text',

  category: 'text',
  group: 'dev',
  tags: ['text', 'html', 'strip'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['keepLineBreaks'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
