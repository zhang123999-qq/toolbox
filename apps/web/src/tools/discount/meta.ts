import type { ToolMeta } from '@toolbox/catalog'

/**
 * discount —— 全局编号 #350
 * 域：math（数学 / 单位 / 金融）｜大组：life｜优先级：P1｜可行性：A｜模板：T2
 * 折扣计算：按折扣率（如 8.5 折）或折后价反推优惠金额
 */
export const meta: ToolMeta = {
  id: 'discount',
  slug: 'discount',
  title: '折扣计算',
  description: '按折扣率或折后价计算优惠金额',
  titleEn: 'Discount Calculator',
  descriptionEn: 'Calculate savings by discount rate or final price',

  category: 'math',
  group: 'life',
  tags: ['discount', 'price', 'shopping'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['mode'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
