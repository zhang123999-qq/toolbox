import type { ToolMeta } from '@toolbox/catalog'

/**
 * decimal —— 全局编号 #330
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T2
 * 小数转换：decimal.js 高精度运算，对照 JS 浮点，并转科学计数法与分数
 */
export const meta: ToolMeta = {
  id: 'decimal',
  slug: 'decimal',
  title: '小数转换',
  description: 'decimal.js 高精度小数运算：精确结果对照 JS 浮点，并转科学计数法与分数表示',
  titleEn: 'Decimal Converter',
  descriptionEn:
    'High-precision decimal arithmetic with decimal.js: exact result vs JS float, plus scientific and fraction forms',

  category: 'math',
  group: 'life',
  tags: ['decimal', 'precision', 'float', 'math'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: ['decimal.js'],
  worker: false,
  wasm: false,
  api: false,
}
