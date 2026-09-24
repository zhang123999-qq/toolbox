import type { ToolMeta } from '@toolbox/catalog'

/**
 * text-wrap —— 全局编号 #62
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'text-wrap',
  slug: 'text-wrap',
  title: '文本换行',
  description: '按宽度自动换行',
  titleEn: 'Text Wrap',
  descriptionEn: 'Wrap text at a given width',

  category: 'text',
  group: 'dev',
  tags: ['text', 'wrap', 'format'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode', 'width', 'breakLong'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
