import type { ToolMeta } from '@toolbox/catalog'

/**
 * pomodoro —— 全局编号 #297
 * 域：datetime（日期与时间）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 * 25 分钟工作 + 5 分钟休息的循环番茄钟，可配置时长，统计完成轮次。
 */
export const meta: ToolMeta = {
  id: 'pomodoro',
  slug: 'pomodoro',
  title: '番茄钟',
  description: '工作 / 休息循环的番茄钟，可配置时长并统计完成轮次',
  titleEn: 'Pomodoro Timer',
  descriptionEn: 'A configurable work/break cycle timer with completed rounds',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'pomodoro', 'focus', 'productivity', 'timer'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['workMinutes', 'breakMinutes'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
