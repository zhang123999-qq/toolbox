import type { ToolMeta } from '@toolbox/catalog'

/**
 * birthday —— 全局编号 #287
 * 域：datetime（时间 / 日期 / 调度）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 生日倒计时：月日（可选年份）→ 距下次生日的天/时/分/秒 + 星期 + 年龄
 */
export const meta: ToolMeta = {
  id: 'birthday',
  slug: 'birthday',
  title: '生日倒计时',
  description: '输入生日（月日或完整日期），算距下一次生日的天/时/分/秒与星期',
  titleEn: 'Birthday Countdown',
  descriptionEn:
    'Count down to your next birthday from a month-day (optionally with year), showing weekday and age',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'birthday', 'countdown', 'calendar'],

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
