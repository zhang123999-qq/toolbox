import type { ToolMeta } from '@toolbox/catalog'

/**
 * fiscal-year —— 全局编号 #303
 * 域：datetime（日期 / 时间）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 */
export const meta: ToolMeta = {
  id: 'fiscal-year',
  slug: 'fiscal-year',
  title: '财年查询',
  description: '按日期与财年起始月输出所属财年、起止、进度与距年末天数',
  titleEn: 'Fiscal Year',
  descriptionEn:
    'Given a date and fiscal-year start month, output the fiscal year, its range, progress and days left',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'fiscal-year', 'finance', 'date'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['startMonth'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
