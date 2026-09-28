import type { ToolMeta } from '@toolbox/catalog'

/**
 * qrcode —— 全局编号 #380
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P0｜可行性：A｜模板：T2
 * 二维码生成：把文本编码为 QR 矩阵，渲染为带静默区的 SVG 字符串
 */
export const meta: ToolMeta = {
  id: 'qrcode',
  slug: 'qrcode',
  title: '二维码生成',
  description: '把文本或链接编码为二维码（SVG 源码），可选容错级别与尺寸',
  titleEn: 'QR Code Generator',
  descriptionEn:
    'Encode text or a URL into a QR code (SVG source) with selectable error-correction level and size',

  category: 'random',
  group: 'design',
  tags: ['qrcode', 'svg', 'encode', 'barcode'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['level', 'size'],

  deps: ['qrcode'],
  worker: false,
  wasm: false,
  api: false,
}
