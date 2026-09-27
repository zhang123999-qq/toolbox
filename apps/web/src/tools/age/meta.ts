import type { ToolMeta } from '@toolbox/catalog'

/**
 * age —— 全局编号 #286
 * 域：datetime（时间 / 日期 / 调度）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 年龄计算：岁/月/天 + 生肖 + 星座 + 距下一个生日天数
 */
export const meta: ToolMeta = {
  id: 'age',
  slug: 'age',
  title: '年龄计算',
  description: '由出生日期算周岁/月龄/天数，附生肖、星座与距下个生日天数',
  titleEn: 'Age Calculator',
  descriptionEn:
    'Compute age in years/months/days from a birth date, plus Chinese zodiac, Western zodiac and days to next birthday',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'age', 'birthday', 'zodiac'],

  priority: 'P0',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text', 'textB'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
