import type { ToolMeta } from '@toolbox/catalog'

/**
 * workday —— 全局编号 #292
 * 域：datetime（时间 / 日期 / 调度）｜大组：dev｜优先级：P1｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'workday',
  slug: 'workday',
  title: '工作日计算',
  description: '从开始日期加/减若干个工作日，跳过周末与自定义排除日',
  titleEn: 'Workday Calculator',
  descriptionEn:
    'Add or subtract working days from a start date, skipping weekends and custom holiday dates',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'workday', 'business-day', 'weekday', 'holiday'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['direction'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
