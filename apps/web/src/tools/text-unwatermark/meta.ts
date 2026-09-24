import type { ToolMeta } from '@toolbox/catalog'

/**
 * text-unwatermark —— 全局编号 #58
 * 域：text（文本与内容）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'text-unwatermark',
  slug: 'text-unwatermark',
  title: '文本去水印',
  description: '移除零宽水印',
  titleEn: 'Text Watermark Remover',
  descriptionEn: 'Remove zero-width watermarks',

  category: 'text',
  group: 'dev',
  tags: ['text', 'watermark', 'clean'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
