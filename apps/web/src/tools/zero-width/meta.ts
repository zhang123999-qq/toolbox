import type { ToolMeta } from '@toolbox/catalog'

/**
 * zero-width —— 全局编号 #42
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'zero-width',
  slug: 'zero-width',
  title: '零宽字符',
  description: '检测零宽字符、水印',
  titleEn: 'Zero-width Characters',
  descriptionEn: 'Detect zero-width characters and hidden watermarks',

  category: 'text',
  group: 'dev',
  tags: ['text', 'zero-width', 'watermark'],

  priority: 'P1',
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
