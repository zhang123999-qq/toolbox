import type { ToolMeta } from '@toolbox/catalog'

/**
 * quarter —— 全局编号 #302
 * 域：datetime（日期 / 时间）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'quarter',
  slug: 'quarter',
  title: '季度查询',
  description: '按日期输出所属季度、季度起止、距季末天数与当年进度',
  titleEn: 'Quarter of Year',
  descriptionEn:
    'Given a date, output the quarter (Q1–Q4), quarter start/end, days left and year progress',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'quarter', 'date', 'calendar'],

  priority: 'P1',
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
