import type { ToolMeta } from '@toolbox/catalog'

/**
 * barcode —— 全局编号 #382
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P0｜可行性：A｜模板：T2
 * 条形码生成：自研 Code128 B 子集编码，渲染为 SVG 竖线
 */
export const meta: ToolMeta = {
  id: 'barcode',
  slug: 'barcode',
  title: '条形码生成',
  description: '把 ASCII 可打印文本编码为 Code128 B 条形码（SVG 源码），含校验位',
  titleEn: 'Barcode Generator',
  descriptionEn:
    'Encode printable ASCII text into a Code128 B barcode (SVG source) with a check digit',

  category: 'random',
  group: 'design',
  tags: ['barcode', 'code128', 'svg', 'encode'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['height', 'lineWidth', 'showText'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
