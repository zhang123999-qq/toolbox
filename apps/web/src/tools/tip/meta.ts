import type { ToolMeta } from '@toolbox/catalog'

/**
 * tip —— 全局编号 #351
 * 域：math（数学 / 单位 / 金融）｜大组：life｜优先级：P1｜可行性：A｜模板：T2
 * 小费计算：按账单金额和小费比例算小费、总计与人均
 */
export const meta: ToolMeta = {
  id: 'tip',
  slug: 'tip',
  title: '小费计算',
  description: '按账单和小费比例算小费与人均',
  titleEn: 'Tip Calculator',
  descriptionEn: 'Calculate tip and per-person share from bill and tip rate',

  category: 'math',
  group: 'life',
  tags: ['tip', 'bill', 'dining'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['rate', 'people'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
