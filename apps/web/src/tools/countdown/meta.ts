import type { ToolMeta } from '@toolbox/catalog'

/**
 * countdown —— 全局编号 #291
 * 域：datetime（时间 / 日期 / 调度）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 倒数日：目标日期时间 + 标题 → 天/时/分/秒 + 已过百分比，支持已过期
 */
export const meta: ToolMeta = {
  id: 'countdown',
  slug: 'countdown',
  title: '倒数日',
  description: '倒数到目标日期时间，显示天/时/分/秒与已过百分比，支持已过期',
  titleEn: 'Countdown',
  descriptionEn:
    'Count down to a target date-time with days/hours/minutes/seconds and progress percentage; supports past targets',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'countdown', 'deadline', 'timer'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text', 'textB'],
  outputs: ['text'],
  options: ['title'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
