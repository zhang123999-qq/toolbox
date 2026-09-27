import type { ToolMeta } from '@toolbox/catalog'

/**
 * date-diff —— 全局编号 #285
 * 域：datetime（时间 / 日期 / 调度）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 两个日期间隔：分解为年/月/周/日/时/分/秒，并给总量
 */
export const meta: ToolMeta = {
  id: 'date-diff',
  slug: 'date-diff',
  title: '日期间隔',
  description: '计算两个日期之间的间隔（年/月/周/日/时/分/秒 + 总量）',
  titleEn: 'Date Difference',
  descriptionEn:
    'Compute the interval between two dates in years/months/weeks/days/hours/minutes/seconds, plus totals',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'date', 'difference', 'interval'],

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
