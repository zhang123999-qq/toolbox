import type { ToolMeta } from '@toolbox/catalog'

/**
 * fraction —— 全局编号 #329
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T2
 * 分数计算：fraction.js 精确分数四则运算，输出分数 / 带分数 / 小数
 */
export const meta: ToolMeta = {
  id: 'fraction',
  slug: 'fraction',
  title: '分数计算',
  description: '分数四则运算（fraction.js 精确计算无浮点误差），输出分数、带分数与小数',
  titleEn: 'Fraction Calculator',
  descriptionEn:
    'Exact fraction arithmetic with fraction.js (no floating-point errors); outputs fraction, mixed number and decimal forms',

  category: 'math',
  group: 'life',
  tags: ['fraction', 'math', 'arithmetic'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['decimals'],

  deps: ['fraction.js'],
  worker: false,
  wasm: false,
  api: false,
}
