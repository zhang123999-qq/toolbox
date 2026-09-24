import type { ToolMeta } from '@toolbox/catalog'

/**
 * text-watermark —— 全局编号 #57
 * 域：text（文本与内容）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'text-watermark',
  slug: 'text-watermark',
  title: '文本水印',
  description: '零宽字符隐藏水印',
  titleEn: 'Text Watermark',
  descriptionEn: 'Hide a watermark in zero-width characters',

  category: 'text',
  group: 'dev',
  tags: ['text', 'watermark', 'steganography'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text', 'watermark'],
  outputs: ['text'],
  options: ['mode'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
