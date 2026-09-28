import type { ToolMeta } from '@toolbox/catalog'

/**
 * bmr —— 全局编号 #357
 * 域：math（数学 / 单位 / 金融 / 生活）｜大组：life｜优先级：P1｜可行性：A｜模板：T2
 * BMR 计算：基础代谢率（Mifflin-St Jeor / Harris-Benedict）
 */
export const meta: ToolMeta = {
  id: 'bmr',
  slug: 'bmr',
  title: 'BMR 计算',
  description: '算基础代谢率（Mifflin / Harris-Benedict）',
  titleEn: 'BMR Calculator',
  descriptionEn: 'Calculate basal metabolic rate with Mifflin-St Jeor or Harris-Benedict',

  category: 'math',
  group: 'life',
  tags: ['bmr', 'metabolism', 'health'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text'],
  outputs: ['text'],
  options: ['gender', 'age', 'formula'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
