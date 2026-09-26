import type { ToolMeta } from '@toolbox/catalog'

/**
 * cron-generator —— 全局编号 #196
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P1｜可行性：A｜模板：T2
 * 可视化填写分/时/日/月/周，输出 cron 表达式与中文描述（纯 TS 自研）
 */
export const meta: ToolMeta = {
  id: 'cron-generator',
  slug: 'cron-generator',
  title: 'Cron 生成',
  description: '可视化填写分/时/日/月/周，生成 Cron 表达式与中文描述',
  titleEn: 'Cron Generator',
  descriptionEn: 'Build a 5-field cron expression by picking minute/hour/day/month/weekday',

  category: 'devops',
  group: 'dev',
  tags: ['devops', 'cron', 'schedule', 'generator'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['minute', 'hour', 'dom', 'month', 'dow'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
