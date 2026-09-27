import type { ToolMeta } from '@toolbox/catalog'

/**
 * ovulation —— 全局编号 #361
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 * 排卵期：末次月经 + 可配周期长度（默认 28 天）推算排卵日 / 易孕期 / 下次月经；异常周期提示
 */
export const meta: ToolMeta = {
  id: 'ovulation',
  slug: 'ovulation',
  title: '排卵期',
  description: '由末次月经与周期长度推算排卵日、易孕期与下次月经，异常周期会提示',
  titleEn: 'Ovulation Calculator',
  descriptionEn:
    'Estimate ovulation day, fertile window and next period from the last menstrual period and cycle length, with a warning for abnormal cycles',

  category: 'math',
  group: 'life',
  tags: ['ovulation', 'fertility', 'pregnancy', 'health'],

  priority: 'P2',
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
