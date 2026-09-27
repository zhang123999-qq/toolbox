import type { ToolMeta } from '@toolbox/catalog'

/**
 * interest —— 全局编号 #348
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T3
 * 利息计算：单利 / 复利两种计息方式，算利息与本息和（decimal.js 保精度）
 */
export const meta: ToolMeta = {
  id: 'interest',
  slug: 'interest',
  title: '利息计算',
  description: '单利 / 复利利息计算：输入本金、年利率与期限，算利息与本息和',
  titleEn: 'Interest Calculator',
  descriptionEn:
    'Simple or compound interest: enter principal, annual rate and term to get interest and maturity value',

  category: 'math',
  group: 'life',
  tags: ['interest', 'finance', 'savings'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text', 'annualRate', 'termYears'],
  outputs: ['text'],
  options: ['interestType'],

  deps: ['decimal.js'],
  worker: false,
  wasm: false,
  api: false,
}
