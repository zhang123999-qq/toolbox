import type { ToolMeta } from '@toolbox/catalog'

/**
 * date-picker —— 全局编号 #310
 * 域：datetime（日期与时间）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 * 日历选日期：月份切换、今天高亮、选中后输出 ISO 日期 + 时间戳 + 星期。
 */
export const meta: ToolMeta = {
  id: 'date-picker',
  slug: 'date-picker',
  title: '日期选择器',
  description: '日历选日期，输出 ISO 日期、时间戳与星期',
  titleEn: 'Date Picker',
  descriptionEn: 'Pick a date on a calendar; output ISO date, timestamp and weekday',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'calendar', 'date', 'timestamp', 'picker'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
