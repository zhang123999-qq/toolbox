import type { ToolMeta } from '@toolbox/catalog'

/**
 * loan —— 全局编号 #346
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P0｜可行性：A｜模板：T3
 * 贷款计算：房贷车贷，等额本息 / 等额本金月供、总利息与总还款（decimal.js 保精度）
 */
export const meta: ToolMeta = {
  id: 'loan',
  slug: 'loan',
  title: '贷款计算',
  description: '房贷车贷计算：等额本息 / 等额本金月供、总利息与总还款',
  titleEn: 'Loan Calculator',
  descriptionEn:
    'Mortgage/auto loan calculator: monthly payment, total interest and total repayment for equal-installment or equal-principal plans',

  category: 'math',
  group: 'life',
  tags: ['loan', 'mortgage', 'finance'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text', 'annualRate', 'years'],
  outputs: ['text'],
  options: ['repayMethod'],

  deps: ['decimal.js'],
  worker: false,
  wasm: false,
  api: false,
}
