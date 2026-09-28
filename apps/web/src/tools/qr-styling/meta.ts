import type { ToolMeta } from '@toolbox/catalog'

/**
 * qr-styling —— 全局编号 #381
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T3
 * 二维码美化：矩阵 + canvas 自绘圆点 / 圆角 / 方块 + 特殊定位框，可配色
 */
export const meta: ToolMeta = {
  id: 'qr-styling',
  slug: 'qr-styling',
  title: '二维码美化',
  description: '自绘风格化二维码：圆点 / 圆角 / 方块数据点与定制定位框，可改前景背景色',
  titleEn: 'Styled QR Code',
  descriptionEn:
    'Draw a styled QR code: dot / rounded / square data modules with custom finder frames and colors',

  category: 'random',
  group: 'design',
  tags: ['qrcode', 'styling', 'canvas', 'design'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['dotStyle', 'color', 'bgColor', 'margin'],

  deps: ['qrcode'],
  worker: false,
  wasm: false,
  api: false,
}
