import type { ToolMeta } from '@toolbox/catalog'

/**
 * income-tax —— 全局编号 #354
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P2｜可行性：A｜模板：T2
 * 个税计算：按中国个税月度税率表算应缴个人所得税
 */
export const meta: ToolMeta = {
  id: 'income-tax',
  slug: 'income-tax',
  title: '个税计算',
  description: '按月度税率表算应缴个人所得税',
  titleEn: 'Income Tax Calculator',
  descriptionEn: 'Calculate monthly individual income tax with China tax brackets',

  category: 'math',
  group: 'life',
  tags: ['tax', 'income', 'finance'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
