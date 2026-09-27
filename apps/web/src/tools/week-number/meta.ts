import type { ToolMeta } from '@toolbox/catalog'

/**
 * week-number —— 全局编号 #301
 * 域：datetime（时间 / 日期 / 调度）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * ISO 8601 周数：Wxx + 周几 + 该周周一/周日 + 当年总周数（自研算法）
 */
export const meta: ToolMeta = {
  id: 'week-number',
  slug: 'week-number',
  title: 'ISO 周数',
  description: '算日期的 ISO 8601 周数（Wxx）、周几、该周周一/周日与当年总周数',
  titleEn: 'ISO Week Number',
  descriptionEn:
    'Compute ISO 8601 week number (Wxx), weekday, Monday/Sunday of the week and total weeks in year',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'week', 'iso8601', 'calendar'],

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
