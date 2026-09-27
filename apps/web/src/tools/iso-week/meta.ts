import type { ToolMeta } from '@toolbox/catalog'

/**
 * iso-week —— 全局编号 #304
 * 域：datetime（日期 / 时间）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 自研 ISO 8601 周日期算法
 */
export const meta: ToolMeta = {
  id: 'iso-week',
  slug: 'iso-week',
  title: 'ISO 周格式',
  description: '把日期转成 ISO 8601 周日期（如 2026-W39-7），含 ISO 周年与星期',
  titleEn: 'ISO Week Date',
  descriptionEn:
    'Convert a date to the ISO 8601 week-date format (e.g. 2026-W39-7) with ISO year and weekday',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'iso-week', 'week', 'calendar', 'date'],

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
