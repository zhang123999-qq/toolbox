import type { ToolMeta } from '@toolbox/catalog'

/**
 * text-to-qr —— 全局编号 #67
 * 域：text（文本与内容）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 * 来源：docs/tools/01-文本与内容.md
 */
export const meta: ToolMeta = {
  id: 'text-to-qr',
  slug: 'text-to-qr',
  title: '文本转二维码',
  description: '文本生成二维码',
  titleEn: 'Text to QR Code',
  descriptionEn: 'Generate a QR code from text',

  category: 'text',
  group: 'dev',
  tags: ['text', 'qrcode', 'convert'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['level'],

  deps: ['qrcode'],
  worker: false,
  wasm: false,
  api: false,
}
