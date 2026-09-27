import type { ToolMeta } from '@toolbox/catalog'

/**
 * cron-time —— 全局编号 #294
 * 域：datetime（日期与时间）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 自研 5 段 cron 解析（分 时 日 月 周），逐分钟扫描计算下次 N 次运行时间。
 * 与域 04 的 cron-parser / cron-next 相互独立，不共享任何代码。
 */
export const meta: ToolMeta = {
  id: 'cron-time',
  slug: 'cron-time',
  title: 'Cron 下次运行',
  description: '解析 5 段 Cron 表达式，计算接下来 N 次的触发时间',
  titleEn: 'Cron Next Runs',
  descriptionEn: 'Parse a 5-field cron expression and list its next N fire times',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'cron', 'schedule', 'next-run'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['count'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
