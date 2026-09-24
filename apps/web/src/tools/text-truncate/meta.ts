import type { ToolMeta } from '@toolbox/catalog'

/**
 * text-truncate —— 全局编号 #63
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'text-truncate',
  slug: 'text-truncate',
  title: '文本截断',
  description: '按字数截断并加省略号',
  titleEn: 'Text Truncate',
  descriptionEn: 'Truncate text by length with an ellipsis',

  category: 'text',
  group: 'dev',
  tags: ['text', 'truncate', 'format'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode', 'limit', 'ellipsis'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
