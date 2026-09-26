import type { ToolMeta } from '@toolbox/catalog'

/**
 * cron-next —— 全局编号 #197
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 给定 5 段 cron 表达式，用原生 Date 计算接下来 N 次触发时间（自研，不用 cron-parser 包）
 */
export const meta: ToolMeta = {
  id: 'cron-next',
  slug: 'cron-next',
  title: 'Cron 下次运行',
  description: '计算 Cron 表达式接下来 N 次的触发时间',
  titleEn: 'Cron Next Runs',
  descriptionEn: 'Compute the next N fire times of a 5-field cron expression',

  category: 'devops',
  group: 'dev',
  tags: ['devops', 'cron', 'schedule', 'next-run'],

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
