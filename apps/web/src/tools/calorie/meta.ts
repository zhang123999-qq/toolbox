import type { ToolMeta } from '@toolbox/catalog'

/**
 * calorie —— 全局编号 #359
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T2
 * 卡路里计算：每日所需热量（TDEE）与增减重建议
 */
export const meta: ToolMeta = {
  id: 'calorie',
  slug: 'calorie',
  title: '卡路里计算',
  description: '算每日所需热量（TDEE）与增减重建议',
  titleEn: 'Calorie Calculator',
  descriptionEn: 'Calculate daily calorie needs (TDEE) with weight goal advice',

  category: 'math',
  group: 'life',
  tags: ['calorie', 'tdee', 'diet'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['gender', 'age', 'activity'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
