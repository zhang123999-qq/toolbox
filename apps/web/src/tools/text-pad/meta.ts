import type { ToolMeta } from '@toolbox/catalog'

/**
 * text-pad —— 全局编号 #64
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'text-pad',
  slug: 'text-pad',
  title: '文本填充',
  description: '左右填充字符到指定长度',
  titleEn: 'Text Pad',
  descriptionEn: 'Pad text with a filler to a fixed length',

  category: 'text',
  group: 'dev',
  tags: ['text', 'pad', 'format'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode', 'length', 'filler'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
