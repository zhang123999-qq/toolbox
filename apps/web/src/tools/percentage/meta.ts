import type { ToolMeta } from '@toolbox/catalog'

/**
 * percentage —— 全局编号 #327
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P0｜可行性：A｜模板：T3
 * 百分比计算：占比 / 求百分比的量 / 变化率三种模式
 */
export const meta: ToolMeta = {
  id: 'percentage',
  slug: 'percentage',
  title: '百分比计算',
  description: '三种常见百分比计算：A 占 B 的百分之几、A 的 B% 是多少、从 A 到 B 的变化率',
  titleEn: 'Percentage Calculator',
  descriptionEn:
    'Three common percentage calculations: what percent A is of B, what B% of A is, and the rate of change from A to B',

  category: 'math',
  group: 'life',
  tags: ['percentage', 'percent', 'ratio', 'math'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text', 'textB'],
  outputs: ['text'],
  options: ['mode'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
