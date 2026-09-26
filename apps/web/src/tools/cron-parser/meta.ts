import type { ToolMeta } from '@toolbox/catalog'

/**
 * cron-parser —— 全局编号 #195
 * 域：devops（开发 / 运维 / 云原生）｜大组：dev｜优先级：P0｜可行性：A｜模板：T2
 * 输入 5 段 cron 表达式，输出中文自然语言描述（纯 TS 自研，不依赖 cronstrue）
 */
export const meta: ToolMeta = {
  id: 'cron-parser',
  slug: 'cron-parser',
  title: 'Cron 解析',
  description: '将 Cron 表达式解析为人类可读的中文描述',
  titleEn: 'Cron Parser',
  descriptionEn: 'Parse a 5-field cron expression into a human-readable Chinese description',

  category: 'devops',
  group: 'dev',
  tags: ['devops', 'cron', 'schedule', 'cron-expression'],

  priority: 'P0',
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
