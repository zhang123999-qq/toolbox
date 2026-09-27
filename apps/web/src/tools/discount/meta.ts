import type { ToolMeta } from '@toolbox/catalog'

/**
 * discount —— 全局编号 #350
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T3
 * 折扣计算：输入原价、折扣与数量，算折后单价、节省金额与实付总额（decimal.js 保精度）
 */
export const meta: ToolMeta = {
  id: 'discount',
  slug: 'discount',
  title: '折扣计算',
  description: '输入原价、折扣与数量，算折后单价、节省金额与实付总额',
  titleEn: 'Discount Calculator',
  descriptionEn:
    'Enter original price, discount and quantity to get discounted unit price, savings and total payable',

  category: 'math',
  group: 'life',
  tags: ['discount', 'price', 'shopping'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text', 'discountRate', 'quantity'],
  outputs: ['text'],
  options: [],

  deps: ['decimal.js'],
  worker: false,
  wasm: false,
  api: false,
}
