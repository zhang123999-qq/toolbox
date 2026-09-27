import type { ToolMeta } from '@toolbox/catalog'

/**
 * compound-interest —— 全局编号 #347
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T3
 * 复利计算：按年 / 半年 / 季度 / 月 / 日复利频率算本息和与总利息（decimal.js 保精度）
 */
export const meta: ToolMeta = {
  id: 'compound-interest',
  slug: 'compound-interest',
  title: '复利计算',
  description: '复利计算：按年 / 半年 / 季度 / 月 / 日复利频率算本息和与总利息',
  titleEn: 'Compound Interest Calculator',
  descriptionEn:
    'Compound interest: future value and total interest at yearly, half-yearly, quarterly, monthly or daily compounding',

  category: 'math',
  group: 'life',
  tags: ['compound', 'interest', 'finance'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text', 'annualRate', 'years'],
  outputs: ['text'],
  options: ['compoundFreq'],

  deps: ['decimal.js'],
  worker: false,
  wasm: false,
  api: false,
}
