import type { ToolMeta } from '@toolbox/catalog'

/**
 * due-date —— 全局编号 #360
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T2
 * 预产期：按末次月经算预产期与当前孕周
 */
export const meta: ToolMeta = {
  id: 'due-date',
  slug: 'due-date',
  title: '预产期',
  description: '按末次月经算预产期与当前孕周',
  titleEn: 'Due Date Calculator',
  descriptionEn: 'Calculate due date and gestational age from last menstrual period',
  category: 'math',
  group: 'life',
  tags: ['due-date', 'pregnancy', 'health'],

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
