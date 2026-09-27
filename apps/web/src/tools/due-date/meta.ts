import type { ToolMeta } from '@toolbox/catalog'

/**
 * due-date —— 全局编号 #360
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T3
 * 预产期：末次月经 + 280 天（按周期长度调整），输出当前孕周 / 距预产期天数 / 孕期阶段
 */
export const meta: ToolMeta = {
  id: 'due-date',
  slug: 'due-date',
  title: '预产期',
  description: '由末次月经日期推算预产期、当前孕周与剩余天数，支持自定义月经周期',
  titleEn: 'Due Date Calculator',
  descriptionEn:
    'Estimate the due date, current gestational age and days remaining from the last menstrual period, with adjustable cycle length',

  category: 'math',
  group: 'life',
  tags: ['pregnancy', 'due-date', 'maternity', 'health'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text', 'cycleLength', 'textB'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
