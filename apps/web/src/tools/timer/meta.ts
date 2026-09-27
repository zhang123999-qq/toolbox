import type { ToolMeta } from '@toolbox/catalog'

/**
 * timer —— 全局编号 #295
 * 域：datetime（日期与时间）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 * 输入时/分/秒后倒计时，开始 / 暂停 / 复位，时间到提示。
 */
export const meta: ToolMeta = {
  id: 'timer',
  slug: 'timer',
  title: '计时器',
  description: '输入时长进行倒计时，支持开始 / 暂停 / 复位',
  titleEn: 'Countdown Timer',
  descriptionEn: 'Count down a duration with start / pause / reset',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'timer', 'countdown', 'productivity'],

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
