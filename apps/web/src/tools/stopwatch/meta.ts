import type { ToolMeta } from '@toolbox/catalog'

/**
 * stopwatch —— 全局编号 #296
 * 域：datetime（日期与时间）｜大组：dev｜优先级：P1｜可行性：A｜模板：T3
 * 秒表：开始 / 暂停 / 复位 / 计次（lap），带分段用时。
 */
export const meta: ToolMeta = {
  id: 'stopwatch',
  slug: 'stopwatch',
  title: '秒表',
  description: '开始 / 暂停 / 复位 / 计次的秒表，记录分段用时',
  titleEn: 'Stopwatch',
  descriptionEn: 'A stopwatch with start / pause / reset and lap times',

  category: 'datetime',
  group: 'dev',
  tags: ['datetime', 'stopwatch', 'lap', 'timer'],

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
